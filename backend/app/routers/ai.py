import re

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_optional_user
from ..models import Order, Product, User
from ..schemas import AIChatRequest, AIChatResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])

CATEGORY_KEYWORDS = {
    "electronics": ["laptop", "computer", "phone", "smartphone", "earbud", "headphone", "soundbar", "monitor", "keyboard", "webcam", "ssd", "gaming", "tv", "charger"],
    "fashion": ["shirt", "dress", "sneaker", "shoe", "hoodie", "jacket", "jeans", "denim", "cardigan", "puffer", "clothes", "fashion"],
    "home": ["pillow", "coffee", "kettle", "lamp", "plant", "bulb", "blanket", "diffuser", "vase", "desk", "furniture", "home"],
    "beauty": ["serum", "moisturizer", "lipstick", "perfume", "sunscreen", "straightener", "face wash", "cleanser", "skincare", "beauty"],
    "sports": ["treadmill", "dumbbell", "resistance", "rope", "kettlebell", "yoga", "fitness", "gym", "cycling", "sports", "workout"],
    "accessories": ["watch", "wallet", "sunglasses", "power bank", "speaker", "accessories"],
}

STOPWORDS = {
    "the", "a", "an", "for", "with", "and", "of", "me", "show", "give", "find", "want",
    "need", "looking", "some", "under", "above", "below", "within", "max", "budget",
    "price", "inr", "rs", "rupees", "best", "top", "cheap", "cheaper", "affordable",
    "good", "buy", "get", "please", "can", "you", "i", "like", "would", "is", "are",
}

FREE_SHIPPING = 999
SHIPPING_FEE = 79


def _inr(amount: float) -> str:
    n = int(round(amount))
    s = str(n)
    if len(s) <= 3:
        return s + " INR"
    last3 = s[-3:]
    rest = s[:-3]
    groups = []
    while len(rest) > 2:
        groups.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.insert(0, rest)
    return ",".join(groups) + "," + last3 + " INR"


def _extract_budget(msg: str) -> int | None:
    m = re.search(r"(?:under|below|less than|within|max(?:imum)?|at most|upto|up to)\s+([\d,]+)", msg)
    if m:
        return int(m.group(1).replace(",", ""))
    m = re.search(r"([\d,]+)\s*(?:inr|rs\.?|rupees)", msg)
    if m:
        return int(m.group(1).replace(",", ""))
    return None


def _pick_category(msg: str) -> str | None:
    for slug, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in msg:
                return slug
    return None


def _search(db: Session, msg: str, category: str | None, budget: int | None) -> list[Product]:
    stmt = select(Product).options(joinedload(Product.category))
    if category:
        stmt = stmt.join(Product.category).where(Product.category.has(slug=category))
    if budget:
        stmt = stmt.where(Product.price <= budget)

    words = [w for w in re.findall(r"[a-z0-9]+", msg.lower()) if w not in STOPWORDS and len(w) > 2]
    if words:
        patterns = [f"%{w}%" for w in words]
        stmt = stmt.where(
            or_(
                *(Product.name.ilike(p) for p in patterns),
                *(Product.brand.ilike(p) for p in patterns),
                *(Product.description.ilike(p) for p in patterns),
            )
        )
    return db.scalars(stmt.order_by(Product.featured.desc(), Product.rating.desc()).limit(4)).all()


def _product_lines(products: list[Product]) -> str:
    lines = []
    for i, p in enumerate(products, 1):
        cat = p.category.name if p.category else "General"
        lines.append(f"{i}. {p.name} — {_inr(p.price)} ⭐{p.rating:.1f} ({cat})")
    return "\n".join(lines)


def _latest_order(db: Session, user: User) -> Order | None:
    return db.scalar(
        select(Order).where(Order.user_id == user.id).order_by(Order.id.desc()).limit(1)
    )


@router.post("/chat", response_model=AIChatResponse)
def chat(
    body: AIChatRequest,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    msg = body.message.strip().lower()

    if re.match(r"^(hi|hello|hey|yo|good (morning|afternoon|evening)|namaste)\b", msg):
        name = f", {user.name}" if user else ""
        return AIChatResponse(
            reply=f"Hello{name}! 👋 I'm ShopVerse AI. Tell me what you're looking for — a product, a budget, or ask about delivery and payments.",
            suggestions=["Headphones under 5000", "Recommend a laptop", "Best sellers", "Track my order"],
        )

    if "thank" in msg or "thanks" in msg:
        return AIChatResponse(reply="You're welcome! 😊 Anything else you'd like help with?")

    if "track" in msg or ("order" in msg and ("status" in msg or "where" in msg)):
        if not user:
            return AIChatResponse(
                reply="I can check that for you — please log in first so I can access your orders.",
                suggestions=["Login", "Browse products"],
            )
        order = _latest_order(db, user)
        if order is None:
            return AIChatResponse(reply="You don't have any orders yet. Want me to help you find something to buy?")
        pay = {"unpaid": "awaiting payment", "paid": "paid", "failed": "payment failed"}[order.payment_status]
        return AIChatResponse(
            reply=f"Your latest order #{order.id} is **{order.status}** and {pay}. Total: {_inr(order.total)}.",
            suggestions=["Track my order", "Delivery details"],
        )

    if re.search(r"deliver|shipping|ship|arrive|delivery", msg):
        return AIChatResponse(
            reply=f"🚚 Delivery is free on orders above {_inr(FREE_SHIPPING)}; otherwise a flat {_inr(SHIPPING_FEE)} applies. Most orders arrive in 3–7 working days.",
            suggestions=["Place an order", "Returns policy"],
        )

    if re.search(r"return|refund|exchange", msg):
        return AIChatResponse(
            reply="🔄 You get 7-day easy returns on all items. Refunds go back to your original payment method within 5–7 working days.",
            suggestions=["Browse products", "Payment options"],
        )

    if re.search(r"pay|payment|card|cash|cod|upi", msg):
        return AIChatResponse(
            reply="💳 We accept cash on delivery and card payments via Stripe (test card 4242 4242 4242 4242 in demo mode).",
            suggestions=["Browse products", "Track my order"],
        )

    budget = _extract_budget(msg)
    category = _pick_category(msg)
    products = _search(db, msg, category, budget)

    if products:
        head = f"Here's what I found for \"{msg}\":\n" if len(products) > 1 else f"Found this for \"{msg}\":\n"
        reply = head + _product_lines(products)
        suggestions = ["Best rated", "Cheaper options", "Free delivery details"]
        if budget is None:
            suggestions = ["Under 5000", "Best rated", "Free delivery details"]
        return AIChatResponse(reply=reply, suggestions=suggestions)

    if re.search(r"\b(recommend|suggest|best|top|popular|trending)\b", msg):
        products = db.scalars(
            select(Product)
            .options(joinedload(Product.category))
            .where(Product.featured == True)  # noqa: E712
            .order_by(Product.rating.desc())
            .limit(4)
        ).all()
        return AIChatResponse(
            reply=f"Here are today's top picks:\n{_product_lines(products)}\n\nTell me a budget and I'll narrow it down.",
            suggestions=["Cheaper options", "Electronics deals", "Fashion picks"],
        )

    popular = db.scalars(
        select(Product).options(joinedload(Product.category)).order_by(Product.rating.desc()).limit(3)
    ).all()
    return AIChatResponse(
        reply=f"I couldn't find a match for \"{msg}\". Maybe try one of these popular picks:\n{_product_lines(popular)}\n\nOr tell me a category and budget, e.g. \"earbuds under 2000\".",
        suggestions=["Headphones under 5000", "Recommend a laptop", "Fashion deals", "Track my order"],
    )