import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..deps import require_admin
from ..models import Category, Order, Product, User
from ..schemas import (
    AdminOrderResponse,
    AdminStatsResponse,
    OrderStatusUpdateRequest,
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
)

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "product"


def _to_response(product: Product) -> ProductResponse:
    resp = ProductResponse.model_validate(product)
    resp.category_name = product.category.name if product.category else None
    return resp


@router.get("/stats", response_model=AdminStatsResponse)
def stats(db: Session = Depends(get_db)):
    revenue = db.scalar(select(func.coalesce(func.sum(Order.total), 0.0)).where(Order.payment_status == "paid"))
    orders_count = db.scalar(select(func.count(Order.id)))
    pending_orders = db.scalar(select(func.count(Order.id)).where(Order.status.in_(["pending", "confirmed"])))
    products_count = db.scalar(select(func.count(Product.id)))
    users_count = db.scalar(select(func.count(User.id)))

    return AdminStatsResponse(
        revenue=round(float(revenue), 2),
        orders_count=orders_count or 0,
        pending_orders=pending_orders or 0,
        products_count=products_count or 0,
        users_count=users_count or 0,
    )


# ---------- Product management ----------
@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreateRequest, db: Session = Depends(get_db)):
    category = db.scalar(select(Category).where(Category.slug == body.category_slug))
    if category is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category slug")

    slug = _slugify(body.name)
    if db.scalar(select(Product).where(Product.slug == slug)) is not None:
        slug = f"{slug}-{uuid4().hex[:6]}"

    product = Product(
        slug=slug,
        name=body.name.strip(),
        brand=body.brand.strip(),
        description=body.description.strip(),
        price=body.price,
        original_price=body.original_price,
        image_url=body.image_url.strip(),
        stock=body.stock,
        featured=body.featured,
        category_id=category.id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _to_response(product)


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, body: ProductUpdateRequest, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    data = body.model_dump(exclude_unset=True)
    if "category_slug" in data:
        category = db.scalar(select(Category).where(Category.slug == data.pop("category_slug")))
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category slug")
        product.category_id = category.id

    for key, value in data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return _to_response(product)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(product)
    db.commit()


# ---------- Order management ----------
@router.get("/orders", response_model=list[AdminOrderResponse])
def list_all_orders(db: Session = Depends(get_db)):
    orders = db.execute(
        select(Order, User.name, User.email)
        .join(User, Order.user_id == User.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    ).all()

    result = []
    for order, user_name, user_email in orders:
        resp = AdminOrderResponse.model_validate(order)
        resp.user_name = user_name
        resp.user_email = user_email
        resp.item_count = sum(i.quantity for i in order.items)
        result.append(resp)
    return result


@router.patch("/orders/{order_id}/status", response_model=AdminOrderResponse)
def update_order_status(order_id: int, body: OrderStatusUpdateRequest, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = body.status
    if body.status == "delivered" and order.payment_method == "cod":
        order.payment_status = "paid"

    db.commit()
    db.refresh(order)

    user = db.get(User, order.user_id)
    resp = AdminOrderResponse.model_validate(order)
    resp.user_name = user.name if user else ""
    resp.user_email = user.email if user else ""
    resp.item_count = sum(i.quantity for i in order.items)
    return resp