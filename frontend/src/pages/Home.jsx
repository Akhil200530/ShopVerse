import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { ProductCard } from '../components/ProductCard'
import { CategoryTiles, SkeletonGrid } from '../components/Shared'

export function HomePage() {
  const [featured, setFeatured] = useState(null)
  const [deals, setDeals] = useState(null)

  useEffect(() => {
    api.getProducts({ featured: true, limit: 8 }).then(setFeatured).catch(() => setFeatured([]))
    api.getProducts({ sort: 'rating', limit: 8 }).then(setDeals).catch(() => setDeals([]))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <span className="hero-badge">
              <span className="dot" /> 25,000+ happy shoppers
            </span>
            <h1>
              Every wish, <br />
              <span className="grad">one cart away.</span>
            </h1>
            <p>
              Discover top-rated electronics, fashion, home and beauty essentials — curated by
              experts, delivered to your door in days, not weeks.
            </p>
            <div className="hero-cta">
              <Link to="/products" className="btn btn-primary">Explore products →</Link>
              <Link to="/products?sort=price_asc" className="btn btn-outline">🔥 Hot deals</Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80"
                alt="Curated ShopVerse products"
              />
            </div>
            <div className="hero-float float-1">
              <span className="icon" style={{ background: '#dcfce7' }}>✅</span>
              <div>
                <strong>Genuine products</strong>
                <small>100% authentic, verified</small>
              </div>
            </div>
            <div className="hero-float float-2">
              <span className="icon" style={{ background: '#fef3c7' }}>⚡</span>
              <div>
                <strong>2-day delivery</strong>
                <small>Across major cities</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="trust-strip">
        <div className="container">
          <div className="trust-item">
            <span className="icon">🚚</span>
            <div>
              <strong>Free delivery</strong>
              <small>On orders above 999 INR</small>
            </div>
          </div>
          <div className="trust-item">
            <span className="icon">↩️</span>
            <div>
              <strong>7-day returns</strong>
              <small>No-questions asked</small>
            </div>
          </div>
          <div className="trust-item">
            <span className="icon">🔒</span>
            <div>
              <strong>Secure checkout</strong>
              <small>256-bit encryption</small>
            </div>
          </div>
          <div className="trust-item">
            <span className="icon">💬</span>
            <div>
              <strong>24/7 support</strong>
              <small>We're always here</small>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Shop by category</h2>
              <p>Six curated departments, endless possibilities</p>
            </div>
            <Link to="/products" className="link-more">View all →</Link>
          </div>
          <CategoryTiles />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Featured products</h2>
              <p>Handpicked by our team, loved by customers</p>
            </div>
            <Link to="/products" className="link-more">View all →</Link>
          </div>
          {featured === null ? (
            <SkeletonGrid count={8} />
          ) : (
            <div className="grid-products">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Top rated</h2>
              <p>Customer favourites with the best reviews</p>
            </div>
            <Link to="/products?sort=rating" className="link-more">View all →</Link>
          </div>
          {deals === null ? (
            <SkeletonGrid count={8} />
          ) : (
            <div className="grid-products">
              {deals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}