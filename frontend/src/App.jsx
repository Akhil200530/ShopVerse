import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { AIChat } from './components/AIChat'
import { ProtectedRoute, RequireAdmin } from './components/Shared'
import { HomePage } from './pages/Home'
import { ProductsPage } from './pages/Products'
import { ProductDetailPage } from './pages/ProductDetail'
import { CartPage } from './pages/Cart'
import { CheckoutPage } from './pages/Checkout'
import { OrdersPage } from './pages/Orders'
import { SandboxPayPage } from './pages/SandboxPay'
import { SupportPage } from './pages/Support'
import { ProfilePage } from './pages/Profile'
import { AdminPage } from './pages/Admin'
import { LoginPage, RegisterPage } from './pages/Auth'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sandbox/pay"
            element={
              <ProtectedRoute>
                <SandboxPayPage />
              </ProtectedRoute>
            }
          />
          <Route path="/support" element={<SupportPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route
            path="*"
            element={
              <div className="container" style={{ paddingTop: 60 }}>
                <div className="empty-state">
                  <div className="icon">🧭</div>
                  <h3>Page not found</h3>
                  <p>The page you're looking for doesn't exist.</p>
                  <a href="/" className="btn btn-primary">Go home</a>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
      <AIChat />
      <Footer />
    </>
  )
}