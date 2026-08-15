import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <div className="logo">
            <span className="logo-mark">🛒</span>
            <span className="logo-text">Shop<span style={{ color: '#818cf8' }}>Verse</span></span>
          </div>
          <p>
            Every wish, one cart away. ShopVerse brings you quality electronics, fashion, home
            essentials and more — with AI-powered recommendations and lightning delivery.
          </p>
        </div>

        <div>
          <h4>Shop</h4>
          <ul>
            <li><Link to="/products">All products</Link></li>
            <li><Link to="/products?sort=price_asc">Budget finds</Link></li>
            <li><Link to="/products?sort=rating">Top rated</Link></li>
            <li><Link to="/categories">Categories</Link></li>
          </ul>
        </div>

        <div>
          <h4>Account</h4>
          <ul>
            <li><Link to="/profile">My profile</Link></li>
            <li><Link to="/orders">My orders</Link></li>
            <li><Link to="/cart">My cart</Link></li>
            <li><Link to="/login">Sign in</Link></li>
          </ul>
        </div>

        <div>
          <h4>Help</h4>
          <ul>
            <li><Link to="/support">Support centre</Link></li>
            <li>Shipping & delivery</li>
            <li>Returns & refunds</li>
            <li>FAQs</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span>© {new Date().getFullYear()} ShopVerse. All rights reserved.</span>
          <span>Made with React, FastAPI & ❤️</span>
        </div>
      </div>
    </footer>
  )
}