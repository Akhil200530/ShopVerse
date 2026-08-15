import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

function Icon({ name }) {
  const paths = {
    search: <path d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />,
    user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    cart: <path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.6L4 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

export function Header() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cats, setCats] = useState([])

  useEffect(() => {
    api.getCategories().then(setCats).catch(() => {})
  }, [])

  const submit = (e) => {
    e.preventDefault()
    navigate(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products')
  }

  const itemCount = cart?.item_count ?? 0
  const initials = user ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : ''

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>🚚 Free delivery on orders above 999 INR · 7-day easy returns</span>
          <span>
            <Link to="/support">Help Center</Link> · <Link to="/orders">Track Order</Link>
          </span>
        </div>
      </div>

      <header className="header">
        <div className="container header-main">
          <Link to="/" className="logo" aria-label="ShopVerse home">
            <span className="logo-mark">🛒</span>
            <span className="logo-text">Shop<span>Verse</span></span>
          </Link>

          <form className="header-search" onSubmit={submit}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for laptops, sneakers, skincare…"
              aria-label="Search products"
            />
            <button type="submit" aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="18" height="18">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </form>

          <div className="header-actions">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {user.is_admin && (
                  <Link to="/admin" className="icon-btn" title="Admin dashboard">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="21" height="21">
                      <path d="M12 2 3 6v6c0 5 3.8 8.6 9 10 5.2-1.4 9-5 9-10V6l-9-4z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    <span>Admin</span>
                  </Link>
                )}
                <Link to="/profile" className="user-chip" title="My profile">
                  <span className="avatar">{initials}</span>
                  <span>{user.name.split(' ')[0]}</span>
                </Link>
                <button className="icon-btn" title="Log out" onClick={logout}>
                  <Icon name="logout" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="icon-btn">
                <Icon name="user" />
                <span>Login</span>
              </Link>
            )}
            <Link to="/cart" className="icon-btn" title="Cart">
              <Icon name="cart" />
              <span>Cart</span>
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </Link>
          </div>
        </div>

        <nav className="cat-strip" aria-label="Categories">
          <div className="container">
            <NavLink to="/products" end className="cat-link">
              All
            </NavLink>
            {cats.map((c) => (
              <NavLink key={c.id} to={`/products?category=${c.slug}`} className="cat-link">
                <span>{c.emoji}</span> {c.name}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
    </>
  )
}