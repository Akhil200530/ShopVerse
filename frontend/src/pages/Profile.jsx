import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import { formatDate } from '../utils'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.getOrders().then(setOrders).catch(() => {})
  }, [])

  if (!user) return null

  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const spent = orders.reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="container">
      <div className="profile-layout">
        <div className="panel profile-card">
          <div className="avatar">{initials}</div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <div className="profile-stats">
            <div className="stat-box">
              <strong>{orders.length}</strong>
              <small>Orders</small>
            </div>
            <div className="stat-box">
              <strong>{cart?.item_count ?? 0}</strong>
              <small>In cart</small>
            </div>
            <div className="stat-box">
              <strong>{spent.toLocaleString()} INR</strong>
              <small>Spent</small>
            </div>
          </div>
          <div className="info-row">
            <span>Member since</span>
            <span>{formatDate(user.created_at)}</span>
          </div>
          <div className="info-row">
            <span>Account type</span>
            <span>{user.is_admin ? 'Administrator' : 'Customer'}</span>
          </div>
          <button className="btn btn-outline btn-block" style={{ marginTop: 18 }} onClick={logout}>
            Log out
          </button>
        </div>

        <div className="panel">
          <h2>Recent orders</h2>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <p style={{ color: 'var(--text-faint)', fontSize: 13.5, marginBottom: 14 }}>
                You haven't placed any orders yet.
              </p>
              <Link to="/products" className="btn btn-primary btn-sm">Browse products</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.slice(0, 5).map((o) => (
                <Link
                  key={o.id}
                  to="/orders"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 11,
                    padding: '12px 16px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Order #{o.id}</div>
                    <div style={{ color: 'var(--text-faint)', fontSize: 12.5, marginTop: 2 }}>
                      {o.items.length} item{o.items.length > 1 ? 's' : ''} · {formatDate(o.created_at)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    {o.total.toLocaleString()} INR
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}