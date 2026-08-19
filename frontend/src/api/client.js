const TOKEN_KEY = 'shopverse_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status !== 429) break
    await new Promise((r) => setTimeout(r, 1000 * Math.min(2 ** attempt, 8)))
  }

  if (res.status === 401 && auth) {
    clearToken()
    window.dispatchEvent(new CustomEvent('shopverse:unauthorized'))
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // catalog
  getCategories: () => request('/categories'),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    }
    return request(`/products?${qs.toString()}`)
  },
  getProduct: (slug) => request(`/products/${slug}`),
  getRelated: (slug) => request(`/products/related/${slug}`),

  // auth
  register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
  login: (data) => request('/auth/login', { method: 'POST', body: data, auth: false }),
  me: () => request('/auth/me'),

  // cart
  getCart: () => request('/cart'),
  addToCart: (productId, quantity = 1) => request('/cart/items', { method: 'POST', body: { product_id: productId, quantity } }),
  updateCartItem: (itemId, quantity) => request(`/cart/items/${itemId}`, { method: 'PUT', body: { quantity } }),
  removeCartItem: (itemId) => request(`/cart/items/${itemId}`, { method: 'DELETE' }),

  // orders
  getOrders: () => request('/orders'),
  checkout: (data) => request('/orders/checkout', { method: 'POST', body: data }),

  // payments
  initPayment: (orderId) => request('/payments/initialize', { method: 'POST', body: { order_id: orderId } }),
  verifyPayment: (reference) => request(`/payments/verify/${reference}`),
  sandboxComplete: (reference, success = true) =>
    request('/payments/sandbox/complete', { method: 'POST', body: { reference, success } }),

  // ai assistant
  aiChat: (message, history = []) => request('/ai/chat', { method: 'POST', body: { message, history } }),

  // admin
  adminStats: () => request('/admin/stats'),
  adminOrders: () => request('/admin/orders'),
  adminUpdateOrderStatus: (orderId, status) => request(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } }),
  adminCreateProduct: (data) => request('/admin/products', { method: 'POST', body: data }),
  adminUpdateProduct: (id, data) => request(`/admin/products/${id}`, { method: 'PUT', body: data }),
  adminDeleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
}