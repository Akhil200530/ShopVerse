import { Link } from 'react-router-dom'
import { discountPercent, formatRupee } from '../utils'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export function RatingBadge({ rating, count }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className="rating-badge">
        {rating} ★
      </span>
      {count !== undefined && <span className="rating-count">({count})</span>}
    </span>
  )
}

export function ProductCard({ product }) {
  const { add } = useCart()
  const { user } = useAuth()
  const toast = useToast()
  const off = discountPercent(product.price, product.original_price)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please login to add items to your cart')
      return
    }
    try {
      await add(product.id, 1)
      toast.success(`${product.name} added to cart`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Link to={`/products/${product.slug}`} className="product-card">
      <div className="product-media">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        {off !== null && <span className="off-tag">{off}% OFF</span>}
        {product.stock <= 0 && <span className="stock-flag">Out of stock</span>}
      </div>
      <div className="product-body">
        <span className="product-brand">{product.brand}</span>
        <h3 className="product-name">{product.name}</h3>
        <RatingBadge rating={product.rating} count={product.rating_count} />
        <div className="price-row">
          <span className="price-now">{formatRupee(product.price)}</span>
          {product.original_price && <span className="price-old">{formatRupee(product.original_price)}</span>}
          {off !== null && <span className="price-off">{off}% off</span>}
        </div>
        <div className="card-actions">
          <span className="btn btn-primary btn-sm" onClick={handleAdd}>
            Add to Cart
          </span>
        </div>
      </div>
    </Link>
  )
}