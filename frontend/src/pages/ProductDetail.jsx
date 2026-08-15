import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { RatingBadge } from '../components/ProductCard'
import { ProductCard } from '../components/ProductCard'
import { Spinner } from '../components/Shared'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { discountPercent, formatRupee } from '../utils'

export function ProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  const { user } = useAuth()
  const { add } = useCart()
  const toast = useToast()

  useEffect(() => {
    let active = true
    setProduct(null)
    api
      .getProduct(slug)
      .then((p) => {
        if (!active) return
        setProduct(p)
        api.getRelated(slug).then((r) => active && setRelated(r)).catch(() => {})
      })
      .catch(() => active && setNotFound(true))
    return () => {
      active = false
    }
  }, [slug])

  if (notFound) {
    return (
      <div className="container" style={{ paddingTop: 60 }}>
        <div className="empty-state">
          <div className="icon">😕</div>
          <h3>Product not found</h3>
          <p>This product may have been removed or the link is wrong.</p>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
      </div>
    )
  }

  if (!product) return <Spinner />

  const off = discountPercent(product.price, product.original_price)

  const handleAdd = async () => {
    if (!user) {
      toast.error('Please login to add items to your cart')
      return
    }
    setAdding(true)
    try {
      await add(product.id, qty)
      toast.success(`${qty} × ${product.name} added to cart`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> / <Link to="/products">Products</Link> /{' '}
        <Link to={`/products?category=${product.category_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
          {product.category_name}
        </Link>{' '}
        / <strong>{product.name}</strong>
      </nav>

      <div className="detail-grid">
        <div className="detail-media">
          <img src={product.image_url} alt={product.name} />
        </div>

        <div className="detail-info">
          <h1>{product.name}</h1>
          <p className="detail-brand">by {product.brand}</p>

          <div className="detail-rating">
            <RatingBadge rating={product.rating} count={product.rating_count} />
            <span className="rating-count">· {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
          </div>

          <div className="price-panel">
            <div>
              <span className="price-now">{formatRupee(product.price)}</span>
              {product.original_price && (
                <>
                  <span className="price-old"> {formatRupee(product.original_price)}</span>
                  {off !== null && <span className="price-off"> {off}% off</span>}
                </>
              )}
            </div>
            <span className="rating-badge">Best price guarantee</span>
          </div>

          <p className="detail-desc">{product.description}</p>

          <ul className="detail-features">
            <li>Free delivery on orders above 999 INR</li>
            <li>7-day easy returns</li>
            <li>1-year official warranty</li>
            <li>Cash on delivery available</li>
          </ul>

          <div className="detail-actions">
            <div className="qty-picker">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(99, qty + 1))} aria-label="Increase quantity">+</button>
            </div>
            <button className="btn btn-primary" onClick={handleAdd} disabled={adding || product.stock <= 0}>
              {adding ? 'Adding…' : '🛒 Add to Cart'}
            </button>
            <Link to="/cart" className="btn btn-outline">Go to Cart</Link>
          </div>

          <div className="delivery-box">
            <span className="icon">📍</span>
            <div>
              <strong>Delivery in 2–4 business days</strong> — Enter your city at checkout to see
              exact delivery estimates.
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="container" style={{ padding: 0 }}>
            <div className="section-head">
              <div>
                <h2>You may also like</h2>
                <p>Similar products customers viewed together</p>
              </div>
            </div>
            <div className="grid-products">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}