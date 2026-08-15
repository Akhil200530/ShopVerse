import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { api } from '../api/client'
import { formatRupee } from '../utils'

export function CheckoutPage() {
  const { cart, clear } = useCart()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ address: '', city: '', phone: '' })
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [errors, setErrors] = useState({})
  const [placing, setPlacing] = useState(false)

  if (!user || !cart || cart.items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>Nothing to checkout</h3>
          <p>Your cart is empty. Add some products first.</p>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
      </div>
    )
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const validate = () => {
    const errs = {}
    if (form.address.trim().length < 5) errs.address = 'Please enter your full delivery address'
    if (form.city.trim().length < 2) errs.city = 'Please enter your city'
    if (!/^[\d+\s-]{7,30}$/.test(form.phone.trim())) errs.phone = 'Enter a valid phone number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const placeOrder = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setPlacing(true)
    try {
      const order = await api.checkout({ ...form, payment_method: paymentMethod })
      clear()

      if (paymentMethod === 'card') {
        try {
          const payment = await api.initPayment(order.id)
          if (payment.sandbox) {
            toast.info('Demo mode: using the sandbox payment page (no Stripe keys configured)')
            window.location.href = `/sandbox/pay?reference=${payment.reference}&order_id=${order.id}`
            return
          }
          toast.success('Redirecting to secure Stripe checkout…')
          window.location.href = payment.authorization_url
          return
        } catch (err) {
          toast.error(`Order created but payment failed: ${err.message}`)
          navigate(`/orders?highlight=${order.id}`)
          return
        }
      }

      toast.success('Order placed successfully! 🎉')
      navigate(`/orders?highlight=${order.id}`)
    } catch (err) {
      toast.error(err.message)
      setPlacing(false)
    }
  }

  return (
    <div className="container">
      <div className="cart-layout">
        <form className="panel" onSubmit={placeOrder} noValidate>
          <h2>Delivery details</h2>

          <div className="field">
            <label>Full address</label>
            <textarea
              value={form.address}
              onChange={set('address')}
              placeholder="House number, street, area…"
            />
            {errors.address && <div className="field-error">{errors.address}</div>}
          </div>

          <div className="field">
            <label>City</label>
            <input value={form.city} onChange={set('city')} placeholder="e.g. Lagos" />
            {errors.city && <div className="field-error">{errors.city}</div>}
          </div>

          <div className="field">
            <label>Phone number</label>
            <input value={form.phone} onChange={set('phone')} placeholder="e.g. 0801 234 5678" />
            {errors.phone && <div className="field-error">{errors.phone}</div>}
          </div>

          <div className="field">
            <label>Payment method</label>
            <div className="pay-methods">
              <label className={`pay-option ${paymentMethod === 'cod' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span className="pay-icon">💵</span>
                <div>
                  <strong>Cash on delivery</strong>
                  <small>Pay when your order arrives</small>
                </div>
              </label>
              <label className={`pay-option ${paymentMethod === 'card' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span className="pay-icon">💳</span>
                <div>
                  <strong>Card payment</strong>
                  <small>Secure checkout via Stripe</small>
                </div>
              </label>
            </div>
          </div>

          <button className="btn btn-accent btn-block" disabled={placing} style={{ marginTop: 6 }}>
            {placing
              ? paymentMethod === 'card'
                ? 'Creating order & redirecting…'
                : 'Placing order…'
              : `Place order · ${formatRupee(cart.total)}`}
          </button>
        </form>

        <div>
          <div className="panel" style={{ position: 'sticky', top: 150 }}>
            <h2>Order summary</h2>
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item" style={{ gridTemplateColumns: '54px 1fr auto', gap: 10, padding: '10px 0' }}>
                <img src={item.product.image_url} alt={item.product.name} style={{ width: 54, height: 54 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.product.name}</div>
                  <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>× {item.quantity}</div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {formatRupee(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
            <div className="price-details">
              <div className="row"><span>Subtotal</span><span>{formatRupee(cart.subtotal)}</span></div>
              <div className="row">
                <span>Delivery</span>
                {cart.shipping === 0 ? <span className="free">FREE</span> : <span>{formatRupee(cart.shipping)}</span>}
              </div>
              <div className="row total"><span>Total</span><span>{formatRupee(cart.total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}