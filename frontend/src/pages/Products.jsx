import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { ProductCard } from '../components/ProductCard'
import { SkeletonGrid } from '../components/Shared'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const sort = params.get('sort') || 'featured'

  const [products, setProducts] = useState(null)
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .getProducts({ q, category, sort, limit: 60 })
      .then((data) => active && setProducts(data))
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [q, category, sort])

  useEffect(() => {
    api.getCategories().then(setCats).catch(() => {})
  }, [])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const title = useMemo(() => {
    if (q) return `Results for "${q}"`
    if (category) {
      const c = cats.find((x) => x.slug === category)
      return c ? c.name : 'All products'
    }
    return 'All products'
  }, [q, category, cats])

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-head">
        <h1>{title}</h1>
        <p>
          {loading ? 'Loading catalog…' : `${products?.length ?? 0} products available`}
        </p>
      </div>

      <div className="filter-bar">
        <button className={`chip ${!category ? 'active' : ''}`} onClick={() => setParam('category', '')}>
          All
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            className={`chip ${category === c.slug ? 'active' : ''}`}
            onClick={() => setParam('category', c.slug)}
          >
            {c.emoji} {c.name}
          </button>
        ))}
        <select className="sort-select" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
          <option value="featured">Sort: Featured</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      {loading ? (
        <SkeletonGrid count={12} />
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>No products found</h3>
          <p>Try a different search term or clear your filters.</p>
          <button className="btn btn-primary" onClick={() => setParams({})}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid-products">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}