import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null)
      return
    }
    setLoading(true)
    try {
      setCart(await api.getCart())
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (productId, quantity = 1) => {
      const next = await api.addToCart(productId, quantity)
      setCart(next)
      return next
    },
    [],
  )

  const update = useCallback(
    async (itemId, quantity) => {
      const next = await api.updateCartItem(itemId, quantity)
      setCart(next)
      return next
    },
    [],
  )

  const remove = useCallback(
    async (itemId) => {
      const next = await api.removeCartItem(itemId)
      setCart(next)
      return next
    },
    [],
  )

  const clear = useCallback(() => setCart(null), [])

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, refresh, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}