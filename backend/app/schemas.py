from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Catalog ----------
class CategoryResponse(BaseModel):
    id: int
    slug: str
    name: str
    emoji: str

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: int
    slug: str
    name: str
    brand: str
    description: str
    price: float
    original_price: Optional[float]
    image_url: str
    rating: float
    rating_count: int
    stock: int
    featured: bool
    category_id: int
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------- Cart ----------
class CartItemResponse(BaseModel):
    id: int
    quantity: int
    product: ProductResponse

    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    items: list[CartItemResponse]
    subtotal: float
    shipping: float
    total: float
    item_count: int


class CartItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=99)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(ge=1, le=99)


# ---------- Orders ----------
class OrderItemResponse(BaseModel):
    product_id: int
    product_name: str
    product_image: str
    price: float
    quantity: int

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    status: str
    payment_method: str
    payment_status: str
    payment_reference: Optional[str] = None
    subtotal: float
    shipping: float
    total: float
    address: str
    city: str
    phone: str
    created_at: datetime
    items: list[OrderItemResponse]

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    address: str = Field(min_length=5, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=30)
    payment_method: str = Field(default="cod", pattern="^(cod|card)$")


# ---------- Payments ----------
class PaymentInitRequest(BaseModel):
    order_id: int


class PaymentInitResponse(BaseModel):
    authorization_url: str
    reference: str
    order_id: int
    sandbox: bool = False


class PaymentVerifyResponse(BaseModel):
    order_id: int
    status: str
    payment_status: str
    reference: str


class SandboxCompleteRequest(BaseModel):
    reference: str = Field(min_length=4, max_length=100)
    success: bool = True


# ---------- Admin ----------
class ProductCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    brand: str = Field(default="ShopVerse", max_length=100)
    description: str = Field(min_length=5)
    price: float = Field(gt=0)
    original_price: Optional[float] = Field(default=None, gt=0)
    image_url: str = Field(min_length=5)
    stock: int = Field(default=100, ge=0)
    featured: bool = False
    category_slug: str


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    brand: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, min_length=5)
    price: Optional[float] = Field(default=None, gt=0)
    original_price: Optional[float] = Field(default=None, gt=0)
    image_url: Optional[str] = Field(default=None, min_length=5)
    stock: Optional[int] = Field(default=None, ge=0)
    featured: Optional[bool] = None
    category_slug: Optional[str] = None


class OrderStatusUpdateRequest(BaseModel):
    status: str = Field(pattern="^(pending|confirmed|shipped|delivered|cancelled)$")


class AdminOrderResponse(BaseModel):
    id: int
    user_id: int
    user_name: str = ""
    user_email: str = ""
    status: str
    payment_method: str
    payment_status: str
    payment_reference: Optional[str] = None
    total: float
    city: str
    created_at: datetime
    item_count: int = 0

    model_config = {"from_attributes": True}


class AdminStatsResponse(BaseModel):
    revenue: float
    orders_count: int
    pending_orders: int
    products_count: int
    users_count: int

# ---------- AI Assistant ----------
class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    history: Optional[list[dict]] = None


class AIChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []
