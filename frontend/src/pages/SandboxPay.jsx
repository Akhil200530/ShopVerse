import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Spinner } from '../components/Shared'
import { useToast } from '../context/ToastContext'
import { formatRupee } from '../utils'

export function SandboxPayPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const reference = params.get('reference')
  const orderId = Number(params.get('order_id'))
  const [order, setOrder] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    api
      .getOrders()
      .then((orders) => {
        if (active) setOrder(orders.find((o) => o.id === orderId) ?? null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [orderId])

  const complete = async (success) => {
    if (!reference || busy) return
    setBusy(true)
    try {
      const res = await api.sandboxComplete(reference, success)
      if (success) toast.success('Payment simulated — order confirmed! 🎉')
      else toast.error('Payment simulated as failed.')
      navigate(`/orders?highlight=${res.order_id}`)
    } catch (err) {
      toast.error(err.message)
      setBusy(false)
    }
  }

  if (!order) return <Spinner />

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 4 }}>💳 Sandbox payment</h2>
        <p style={{ color: 'var(--text-faint)', fontSize: 13, marginBottom: 18 }}>
          Demo mode — no Stripe keys are configured, so payments are simulated locally.
          Nothing is charged. In production this page is replaced by Stripe's hosted checkout.
        </p>

        <div className="price-details" style={{ marginBottom: 18 }}>
          <div className="row"><span>Order</span><span>#{order.id}</span></div>
          <div className="row"><span>Reference</span><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{reference}</span></div>
          <div className="row total"><span>Total</span><span>{formatRupee(order.total)}</span></div>
        </div>

        <div className="field">
          <label>Card number (demo)</label>
          <input value="4242 4242 4242 4242" readOnly />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Expiry</label>
            <input value="12 / 34" readOnly />
          </div>
          <div className="field">
            <label>CVV</label>
            <input value="123" readOnly />
          </div>
        </div>

        <button className="btn btn-accent btn-block" disabled={busy} onClick={() => complete(true)} style={{ marginTop: 10 }}>
          {busy ? 'Processing…' : `Pay ${formatRupee(order.total)} (simulate success)`}
        </button>
        <button className="btn btn-block" disabled={busy} onClick={() => complete(false)} style={{ marginTop: 8 }}>
          Simulate payment failure
        </button>
        <Link to="/orders" className="btn btn-block" style={{ marginTop: 8 }}>Back to orders</Link>
      </div>
    </div>
  )
}