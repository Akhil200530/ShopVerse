import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Shared'
import { formatDate, formatRupee } from '../utils'

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

const EMPTY_FORM = {
  name: '',
  brand: 'ShopVerse',
  description: '',
  price: '',
  original_price: '',
  image_url: '',
  stock: 100,
  featured: false,
  category_slug: 'electronics',
}

export function AdminPage() {
  const [tab, setTab] = useState('products')
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState(null)
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState(null)
  const toast = useToast()

  const loadAll = () => {
    api.adminStats().then(setStats).catch(() => {})
    api.getProducts({ limit: 100 }).then(setProducts).catch(() => setProducts([]))
    api.adminOrders().then(setOrders).catch(() => setOrders([]))
  }

  useEffect(() => {
    loadAll()
    api.getCategories().then(setCategories).catch(() => {})
  }, [])

  const revenue = stats?.revenue ?? 0
  const pending = (orders ?? []).filter((o) => o.status === 'pending' || o.status === 'confirmed').length

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-head">
        <h1>Admin dashboard</h1>
        <p>Manage products and fulfil orders</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>💰</span>
          <div>
            <strong>{formatRupee(revenue)}</strong>
            <small>Paid revenue</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>📦</span>
          <div>
            <strong>{stats?.orders_count ?? 0}</strong>
            <small>Total orders</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>⏳</span>
          <div>
            <strong>{pending}</strong>
            <small>Pending fulfilment</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: '#fae8ff', color: '#a21caf' }}>🛍️</span>
          <div>
            <strong>{stats?.products_count ?? 0}</strong>
            <small>Products</small>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          Products
        </button>
        <button className={`admin-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          Orders {orders ? `(${orders.length})` : ''}
        </button>
      </div>

      {tab === 'products' ? (
        <ProductsTab
          products={products}
          categories={categories}
          onChanged={loadAll}
        />
      ) : (
        <OrdersTab orders={orders} onChanged={loadAll} />
      )}
    </div>
  )
}

/* ---------------- Products ---------------- */

function ProductsTab({ products, categories, onChanged }) {
  const toast = useToast()
  const [editing, setEditing] = useState(null) // null | 'new' | product

  const openNew = () => setEditing({ ...EMPTY_FORM })
  const openEdit = (p) =>
    setEditing({
      name: p.name,
      brand: p.brand,
      description: p.description,
      price: p.price,
      original_price: p.original_price ?? '',
      image_url: p.image_url,
      stock: p.stock,
      featured: p.featured,
      category_slug: p.category_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'electronics',
    })

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      await api.adminDeleteProduct(p.id)
      toast.success('Product deleted')
      onChanged()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Products</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add product</button>
      </div>

      {products === null ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 30 }}>No products yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Rating</th>
                <th>Featured</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img src={p.image_url} alt="" style={{ width: 42, height: 42, borderRadius: 9, objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                        <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category_name}</td>
                  <td>
                    <strong>{formatRupee(p.price)}</strong>
                    {p.original_price && (
                      <div style={{ color: 'var(--text-faint)', fontSize: 12, textDecoration: 'line-through' }}>
                        {formatRupee(p.original_price)}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`stock-pill ${p.stock === 0 ? 'out' : p.stock < 20 ? 'low' : ''}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td>{p.rating} ★ ({p.rating_count})</td>
                  <td>{p.featured ? '⭐' : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => remove(p)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          initial={editing}
          categories={categories}
          isNew={!editing.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function ProductForm({ initial, categories, isNew, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
      stock: Number(form.stock),
    }
    try {
      if (isNew) {
        await api.adminCreateProduct(payload)
        toast.success('Product created')
      } else {
        await api.adminUpdateProduct(initial.id, payload)
        toast.success('Product updated')
      }
      onSaved()
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>{isNew ? 'Add product' : 'Edit product'}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={set('name')} required minLength={2} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Brand</label>
              <input value={form.brand} onChange={set('brand')} required />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category_slug} onChange={set('category_slug')}>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={set('description')} required minLength={5} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Price (INR)</label>
              <input type="number" min="1" value={form.price} onChange={set('price')} required />
            </div>
            <div className="field">
              <label>Original price (INR, optional)</label>
              <input type="number" min="1" value={form.original_price} onChange={set('original_price')} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Stock</label>
              <input type="number" min="0" value={form.stock} onChange={set('stock')} required />
            </div>
            <div className="field">
              <label>Image URL</label>
              <input value={form.image_url} onChange={set('image_url')} required />
            </div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} />
            <span>Feature this product on the homepage</span>
          </label>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------------- Orders ---------------- */

function OrdersTab({ orders, onChanged }) {
  const toast = useToast()
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!orders) return []
    if (filter === 'all') return orders
    return orders.filter((o) => o.status === filter)
  }, [orders, filter])

  const changeStatus = async (order, status) => {
    if (status === order.status) return
    try {
      await api.adminUpdateOrderStatus(order.id, status)
      toast.success(`Order #${order.id} → ${status}`)
      onChanged()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Orders</h2>
        <select className="sort-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {orders === null ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 30 }}>No orders in this view.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.user_name}</div>
                    <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>{o.user_email} · {o.city}</div>
                  </td>
                  <td><strong>{formatRupee(o.total)}</strong></td>
                  <td>
                    <span className={`pay-chip ${o.payment_method === 'cod' ? 'pay-cod' : o.payment_status === 'paid' ? 'pay-paid' : 'pay-pending'}`}>
                      {o.payment_method === 'cod' ? '💵 COD' : o.payment_status === 'paid' ? '💳 Paid' : '💳 Unpaid'}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={o.status}
                      onChange={(e) => changeStatus(o, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-faint)', fontSize: 13 }}>
                    {formatDate(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}