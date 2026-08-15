import uuid

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Order, User
from ..schemas import (
    OrderResponse,
    PaymentInitRequest,
    PaymentInitResponse,
    PaymentVerifyResponse,
    SandboxCompleteRequest,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _stripe() -> stripe.StripeClient:
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Card payments are not configured. Set STRIPE_SECRET_KEY to enable Stripe.",
        )
    return stripe.StripeClient(settings.stripe_secret_key)


def _mark_paid(order: Order, reference: str) -> None:
    order.payment_status = "paid"
    order.payment_reference = reference
    if order.status == "pending":
        order.status = "confirmed"


def _mark_failed(order: Order) -> None:
    order.payment_status = "failed"
    order.payment_reference = None


def _to_response(order: Order) -> OrderResponse:
    return OrderResponse.model_validate(order)


@router.post("/initialize", response_model=PaymentInitResponse)
def initialize(
    body: PaymentInitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.id == body.order_id, Order.user_id == user.id)
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.payment_status == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order already paid")
    if order.payment_method != "card":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order is not a card payment")

    reference = f"SV{order.id}-{uuid.uuid4().hex[:12].upper()}"
    order.payment_reference = reference
    db.commit()

    # --- Sandbox mode: no Stripe keys configured, simulate locally ---
    if not settings.stripe_secret_key:
        return PaymentInitResponse(
            authorization_url="/sandbox/pay",
            reference=reference,
            order_id=order.id,
            sandbox=True,
        )

    client = _stripe()
    try:
        session = client.checkout.sessions.create(
            mode="payment",
            client_reference_id=reference,
            metadata={"order_id": str(order.id), "reference": reference},
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": settings.stripe_currency,
                        "unit_amount": int(round(order.total * 100)),
                        "product_data": {"name": f"ShopVerse Order #{order.id}", "description": f"Order for {user.name}"},
                    },
                }
            ],
            success_url=settings.stripe_success_url,
            cancel_url=settings.stripe_cancel_url,
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe checkout failed: {exc.user_message or exc}",
        )

    return PaymentInitResponse(
        authorization_url=session.url,
        reference=reference,
        order_id=order.id,
        sandbox=False,
    )


@router.get("/verify/{reference}", response_model=PaymentVerifyResponse)
def verify(
    reference: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order).where(
            Order.payment_reference == reference,
            Order.user_id == user.id,
        )
    )

    session = None
    if order is None and settings.stripe_secret_key:
        # success_url passes the Stripe session id; resolve its metadata to find the order.
        client = _stripe()
        try:
            session = client.checkout.sessions.retrieve(reference, expand=["payment_intent"])
            meta = session.metadata or {}
            oid = meta.get("order_id")
            if oid:
                order = db.scalar(
                    select(Order).where(Order.id == int(oid), Order.user_id == user.id)
                )
        except (stripe.StripeError, ValueError, TypeError):
            order = None

    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if session is not None:
        if session.payment_status == "paid":
            _mark_paid(order, reference)
        else:
            _mark_failed(order)
        db.commit()
    elif settings.stripe_secret_key:
        # Keys configured but no session context (direct reference call): re-check by reference.
        client = _stripe()
        try:
            session = client.checkout.sessions.retrieve(order.payment_reference, expand=["payment_intent"])
            if session.payment_status == "paid":
                _mark_paid(order, reference)
            else:
                _mark_failed(order)
            db.commit()
        except stripe.StripeError:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not verify payment with Stripe")
    else:
        # No keys configured: nothing to verify against (sandbox completes orders directly).
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments not configured. Complete the payment via the sandbox page instead.",
        )

    return PaymentVerifyResponse(
        order_id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        reference=reference,
    )


@router.post("/sandbox/complete", response_model=PaymentVerifyResponse)
def sandbox_complete(
    body: SandboxCompleteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simulate a successful/failed card payment (used when Stripe keys are absent)."""
    order = db.scalar(
        select(Order).where(
            Order.payment_reference == body.reference,
            Order.user_id == user.id,
        )
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if body.success:
        _mark_paid(order, body.reference)
    else:
        _mark_failed(order)
    db.commit()

    return PaymentVerifyResponse(
        order_id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        reference=body.reference,
    )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not configured")

    raw = await request.body()
    signature = request.headers.get("stripe-signature", "")

    if settings.stripe_webhook_secret:
        try:
            event = stripe.Webhook.construct_event(raw, signature, settings.stripe_webhook_secret)
        except (stripe.SignatureVerificationError, ValueError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")
    else:
        # No webhook secret configured (e.g. local `stripe listen` without secret):
        # accept the event only if a matching checkout session exists (best-effort).
        import json

        try:
            event = json.loads(raw.decode("utf-8"))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")

    if event.get("type") not in ("checkout.session.completed", "checkout.session.async_payment_failed"):
        return {"received": True, "ignored": True}

    session = event["data"]["object"]
    metadata = session.get("metadata") or {}
    order_id = metadata.get("order_id")
    reference = session.get("client_reference_id") or metadata.get("reference")

    if order_id is None:
        return {"received": True, "ignored": True}

    order = db.get(Order, int(order_id))
    if order is None:
        return {"received": True, "ignored": True}

    if event["type"] == "checkout.session.completed":
        _mark_paid(order, reference or session.get("id"))
    else:
        _mark_failed(order)
    db.commit()

    return {"received": True}