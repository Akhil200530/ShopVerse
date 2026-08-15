from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Category, Product
from ..schemas import CategoryResponse, ProductResponse

router = APIRouter(prefix="/api", tags=["catalog"])


def _to_response(product: Product) -> ProductResponse:
    resp = ProductResponse.model_validate(product)
    resp.category_name = product.category.name if product.category else None
    return resp


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.name)).all()


@router.get("/products", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Search term"),
    category: str | None = Query(None, description="Category slug"),
    sort: str = Query("featured", pattern="^(featured|price_asc|price_desc|rating)$"),
    featured: bool | None = Query(None),
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    stmt = select(Product).options(joinedload(Product.category))

    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(pattern),
                Product.brand.ilike(pattern),
                Product.description.ilike(pattern),
            )
        )
    if category:
        stmt = stmt.join(Category).where(Category.slug == category)
    if featured is not None:
        stmt = stmt.where(Product.featured == featured)

    if sort == "price_asc":
        stmt = stmt.order_by(Product.price.asc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.price.desc())
    elif sort == "rating":
        stmt = stmt.order_by(Product.rating.desc(), Product.rating_count.desc())
    else:
        stmt = stmt.order_by(Product.featured.desc(), Product.rating.desc())

    products = db.scalars(stmt.offset(offset).limit(limit)).all()
    return [_to_response(p) for p in products]


@router.get("/products/{slug}", response_model=ProductResponse)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = db.scalar(select(Product).options(joinedload(Product.category)).where(Product.slug == slug))
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _to_response(product)


@router.get("/products/related/{slug}", response_model=list[ProductResponse])
def related_products(slug: str, db: Session = Depends(get_db), limit: int = Query(4, ge=1, le=8)):
    product = db.scalar(select(Product).where(Product.slug == slug))
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    related = db.scalars(
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.category_id == product.category_id, Product.id != product.id)
        .order_by(Product.rating.desc())
        .limit(limit)
    ).all()
    return [_to_response(p) for p in related]