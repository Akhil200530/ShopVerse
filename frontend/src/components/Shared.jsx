import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { useEffect, useState } from 'react'

export function CategoryTiles() {
  const [cats, setCats] = useState([])
  const [counts, setCounts] = useState({})

  useEffect(() => {
    api.getCategories().then(async (list) => {
      setCats(list)
      const counts = {}
      await Promise.all(
        list.map(async (c) => {
          try {
            const products = await api.getProducts({ category: c.slug, limit: 1 })
            counts[c.slug] = products.length
          } catch {
            counts[c.slug] = 0
          }
        }),
      )
      setCounts(counts)
    }).catch(() => {})
  }, [])

  return (
    <div className="cat-grid">
      {cats.map((c) => (
        <Link key={c.id} to={`/products?category=${c.slug}`} className="cat-tile">
          <div className="icon">{c.emoji}</div>
          <strong>{c.name}</strong>
          <small>{counts[c.slug] ?? '…'} products</small>
        </Link>
      ))}
    </div>
  )
}

export function Spinner() {
  return <div className="spinner" />
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  )
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 60 }}>
        <div className="empty-state">
          <div className="icon">🔐</div>
          <h3>Please sign in</h3>
          <p>You need an account to view this page.</p>
          <Link to="/login" className="btn btn-primary">Go to Login</Link>
        </div>
      </div>
    )
  }
  return children
}

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user || !user.is_admin) {
    return (
      <div className="container" style={{ paddingTop: 60 }}>
        <div className="empty-state">
          <div className="icon">🚫</div>
          <h3>Admin access required</h3>
          <p>This area is restricted to ShopVerse administrators.</p>
          <Link to="/" className="btn btn-primary">Go home</Link>
        </div>
      </div>
    )
  }
  return children
}