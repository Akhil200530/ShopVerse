import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Spinner } from '../components/Shared'
import { useToast } from '../context/ToastContext'
import { formatDate, formatRupee } from '../utils'

const STATUS_LABELS = {
  pending: '⏳ Pending',
  confirmed: '✅ Confirmed',
  shipped: '🚚 Shipped',
  delivered: '📦 Delivered',
  cancelled: '❌ Cancelled',
}

function PaymentBadge({ order }) {
  if (order.payment_method === 'cod') {
    return <span className={`pay-chip pay-cod`}>💵 Pay on delivery</span>
  }
  if (order.payment_status === 'paid') {
    return <span className={`pay-chip pay-paid`}>💳 Paid</span>
  }
  if (order.payment_status === 'failed') {
    return <span className={`pay-chip pay-failed`}>⚠️ Payment failed</span>
  }
  return <span className={`pay-chip pay-pending`}>💳 Awaiting payment</span>
}

export function OrdersPage() {
  const [orders, setOrders] = useState(null)
  const [params] = useSearchParams()
  const highlight = Number(params.get('highlight'))
  const reference = params.get('reference')
  const toast = useToast()

  useEffect(() => {
    let active = true
    api.getOrders().then(setOrders).catch(() => setOrders([]))

    if (reference) {
      api
        .verifyPayment(reference)
        .then((res) => {
          if (!active) return
          if (res.payment_status === 'paid') {
            toast.success('Payment confirmed — thank you! 🎉')
          } else {
            toast.error('Payment was not completed. You can try again from checkout.')
          }
          api.getOrders().then(setOrders).catch(() => {})
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [reference, toast])

  if (orders === null) return <Spinner />

  if (orders.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>No orders yet</h3>
          <p>When you place your first order, it will show up here.</p>
          <Link to="/products" className="btn btn-primary">Start shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-head">
        <h1>My orders</h1>
        <p>{orders.length} order{orders.length > 1 ? 's' : ''} placed</p>
      </div>

      <div style={{ marginTop: 22 }}>
        {orders.map((order) => (
          <div
            key={order.id}
            className="order-card"
            style={highlight === order.id ? { borderColor: 'var(--primary)', boxShadow: 'var(--shadow)' } : undefined}
          >
            <div className="order-head">
              <div>
                <strong>Order #{order.id}</strong>
                {' · '}
                <span style={{ color: 'var(--text-faint)' }}>Placed on {formatDate(order.created_at)}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <PaymentBadge order={order} />
                <span className={`status-chip status-${order.status}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
            </div>

            <div className="order-items">
              {order.items.map((item) => (
                <div key={item.product_id} className="order-item">
                  <img src={item.product_image} alt={item.product_name} />
                  <div>
                    <div className="name">{item.product_name}</div>
                    <div className="meta">
                      {formatRupee(item.price)} × {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="order-foot">
              <span style={{ color: 'var(--text-faint)' }}>
                Deliver to: {order.address}, {order.city}
              </span>
              <span>
                Total: <span className="total">{formatRupee(order.total)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}