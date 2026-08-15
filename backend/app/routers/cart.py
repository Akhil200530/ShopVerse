from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user
from ..models import CartItem, Product, User
from ..schemas import CartItemRequest, CartResponse, CartItemResponse, UpdateCartItemRequest

router = APIRouter(prefix="/api/cart", tags=["cart"])

FREE_SHIPPING_THRESHOLD = 999.0
FLAT_SHIPPING = 79.0


def _cart_payload(db: Session, user: User) -> CartResponse:
    items = db.scalars(
        select(CartItem)
        .options(joinedload(CartItem.product).joinedload(Product.category))
        .where(CartItem.user_id == user.id)
        .order_by(CartItem.id)
    ).all()

    subtotal = sum(i.product.price * i.quantity for i in items)
    shipping = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD or subtotal == 0 else FLAT_SHIPPING
    total = subtotal + shipping

    return CartResponse(
        items=[CartItemResponse.model_validate(i) for i in items],
        subtotal=round(subtotal, 2),
        shipping=round(shipping, 2),
        total=round(total, 2),
        item_count=sum(i.quantity for i in items),
    )


@router.get("", response_model=CartResponse)
def get_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _cart_payload(db, user)


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    body: CartItemRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(Product, body.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    item = db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == body.product_id)
    )
    if item:
        item.quantity = min(item.quantity + body.quantity, product.stock)
    else:
        item = CartItem(user_id=user.id, product_id=body.product_id, quantity=min(body.quantity, product.stock))
        db.add(item)

    db.commit()
    return _cart_payload(db, user)


@router.put("/items/{item_id}", response_model=CartResponse)
def update_item(
    item_id: int,
    body: UpdateCartItemRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    item.quantity = min(body.quantity, item.product.stock)
    db.commit()
    return _cart_payload(db, user)


@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id))
    if item:
        db.delete(item)
        db.commit()
    return _cart_payload(db, user)


@router.delete("", response_model=CartResponse)
def clear_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(CartItem).where(CartItem.user_id == user.id)).all()
    for item in items:
        db.delete(item)
    db.commit()
    return _cart_payload(db, user)