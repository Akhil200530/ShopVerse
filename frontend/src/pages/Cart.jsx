import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatRupee } from '../utils'

export function CartPage() {
  const { cart, update, remove } = useCart()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="empty-state">
          <div className="icon">🛒</div>
          <h3>Your cart is waiting</h3>
          <p>Sign in to see items you've added.</p>
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="empty-state">
          <div className="icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything yet. Let's fix that!</p>
          <Link to="/products" className="btn btn-primary">Start shopping</Link>
        </div>
      </div>
    )
  }

  const remaining = Math.max(0, 999 - cart.subtotal)
  const progress = Math.min(100, (cart.subtotal / 999) * 100)

  const changeQty = async (item, qty) => {
    try {
      await update(item.id, qty)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const removeItem = async (item) => {
    try {
      await remove(item.id)
      toast.success('Item removed from cart')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="container">
      <div className="cart-layout">
        <div className="panel">
          <h2>My Cart ({cart.item_count} items)</h2>

          <div className="free-ship-progress">
            {remaining > 0 ? (
              <>Add <strong>{formatRupee(remaining)}</strong> more to unlock <strong>free delivery</strong> 🚚</>
            ) : (
              <strong>🎉 You've unlocked free delivery!</strong>
            )}
            <div className="bar"><span style={{ width: `${progress}%` }} /></div>
          </div>

          {cart.items.map((item) => (
            <div key={item.id} className="cart-item">
              <Link to={`/products/${item.product.slug}`}>
                <img src={item.product.image_url} alt={item.product.name} />
              </Link>
              <div>
                <Link to={`/products/${item.product.slug}`} className="cart-item-name">
                  {item.product.name}
                </Link>
                <div className="cart-item-brand">{item.product.brand}</div>
                <div className="cart-item-controls">
                  <div className="qty-picker" style={{ height: 34 }}>
                    <button
                      style={{ height: 34, width: 32 }}
                      onClick={() => changeQty(item, Math.max(1, item.quantity - 1))}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 34 }}>{item.quantity}</span>
                    <button
                      style={{ height: 34, width: 32 }}
                      onClick={() => changeQty(item, Math.min(99, item.quantity + 1))}
                    >
                      +
                    </button>
                  </div>
                  <button className="remove-link" onClick={() => removeItem(item)}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="cart-item-right">
                <div className="price-now">{formatRupee(item.product.price * item.quantity)}</div>
                {item.product.original_price && (
                  <div className="price-old">{formatRupee(item.product.original_price * item.quantity)}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="panel" style={{ position: 'sticky', top: 150 }}>
            <h2>Price details</h2>
            <div className="price-details">
              <div className="row">
                <span>Subtotal ({cart.item_count} items)</span>
                <span>{formatRupee(cart.subtotal)}</span>
              </div>
              <div className="row">
                <span>Delivery charges</span>
                {cart.shipping === 0 ? <span className="free">FREE</span> : <span>{formatRupee(cart.shipping)}</span>}
              </div>
              <div className="row total">
                <span>Total</span>
                <span>{formatRupee(cart.total)}</span>
              </div>
            </div>
            <button className="btn btn-accent btn-block" style={{ marginTop: 18 }} onClick={() => navigate('/checkout')}>
              Proceed to Checkout →
            </button>
            <Link to="/products" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}