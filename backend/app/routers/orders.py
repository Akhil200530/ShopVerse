from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import CartItem, Order, OrderItem, Product, User
from ..schemas import CheckoutRequest, OrderResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])

FREE_SHIPPING_THRESHOLD = 999.0
FLAT_SHIPPING = 79.0


def _to_response(order: Order) -> OrderResponse:
    return OrderResponse.model_validate(order)


@router.get("", response_model=list[OrderResponse])
def list_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
    ).all()
    return [_to_response(o) for o in orders]


@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(CartItem)
        .options(joinedload(CartItem.product))
        .where(CartItem.user_id == user.id)
    ).all()

    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your cart is empty")

    subtotal = round(sum(i.product.price * i.quantity for i in items), 2)
    shipping = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else FLAT_SHIPPING
    total = round(subtotal + shipping, 2)

    # Card orders wait for payment before confirmation; COD confirms immediately.
    is_card = body.payment_method == "card"
    order = Order(
        user_id=user.id,
        status="pending" if is_card else "confirmed",
        payment_method=body.payment_method,
        payment_status="unpaid",
        subtotal=subtotal,
        shipping=shipping,
        total=total,
        address=body.address.strip(),
        city=body.city.strip(),
        phone=body.phone.strip(),
    )

    for item in items:
        product = item.product
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only {product.stock} units of '{product.name}' left in stock",
            )
        product.stock -= item.quantity
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_image=product.image_url,
                price=product.price,
                quantity=item.quantity,
            )
        )

    db.add(order)
    for item in items:
        db.delete(item)
    db.commit()
    db.refresh(order)

    return _to_response(order)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id, Order.user_id == user.id)
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _to_response(order)