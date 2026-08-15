import { Link } from 'react-router-dom'
import { formatRupee } from '../utils'

const TOPICS = [
  {
    icon: '📦',
    title: 'Ordering & tracking',
    body: [
      'Orders are confirmed instantly after checkout and stock is reserved for you.',
      'Track your order anytime from the My Orders page — status moves from Pending → Confirmed → Shipped → Delivered.',
      'You can see payment status on every order: unpaid, paid, or failed.',
    ],
  },
  {
    icon: '🚚',
    title: 'Delivery & shipping',
    body: [
      `Delivery is FREE on orders above ${formatRupee(999)} — otherwise a flat ${formatRupee(79)} applies.`,
      'Most orders arrive within 3–7 working days depending on your city.',
      'You will receive a confirmation once your order ships.',
    ],
  },
  {
    icon: '🔄',
    title: 'Returns & refunds',
    body: [
      '7-day easy returns on all items — no questions asked.',
      'Items must be unused and in their original packaging.',
      'Refunds go back to your original payment method within 5–7 working days.',
    ],
  },
  {
    icon: '💳',
    title: 'Payments',
    body: [
      'We accept Cash on Delivery (COD) and card payments via Stripe.',
      'Card payments are processed on Stripe\'s secure hosted checkout page.',
      'In demo mode, card payments use the sandbox page with the test card 4242 4242 4242 4242.',
    ],
  },
]

export function SupportPage() {
  return (
    <div className="container" style={{ paddingBottom: 70 }}>
      <div className="page-head">
        <h1>Help Center</h1>
        <p>Everything you need to know about shopping on ShopVerse</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 22 }}>
        {TOPICS.map((t) => (
          <div key={t.title} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 30 }}>{t.icon}</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{t.title}</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 18, fontSize: 13.5, color: 'var(--text-soft)' }}>
              {t.body.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 4 }}>Still need help? 💬</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>
            Ask the AI assistant (✨ bottom-right) or reach us at{' '}
            <strong>support@shopverse.com</strong> · Mon–Sat, 9am–6pm
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/products" className="btn btn-primary">Start shopping</Link>
          <Link to="/orders" className="btn btn-outline">Track an order</Link>
        </div>
      </div>
    </div>
  )
}