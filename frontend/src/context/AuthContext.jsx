import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'
import { clearToken, getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then((u) => active && setUser(u))
      .catch(() => clearToken())
      .finally(() => active && setLoading(false))

    const onUnauthorized = () => setUser(null)
    window.addEventListener('shopverse:unauthorized', onUnauthorized)
    return () => {
      active = false
      window.removeEventListener('shopverse:unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { access_token } = await api.login({ email, password })
    setToken(access_token)
    const me = await api.me()
    setUser(me)
    return me
  }, [])

  const register = useCallback(async (name, email, password) => {
    const { access_token } = await api.register({ name, email, password })
    setToken(access_token)
    const me = await api.me()
    setUser(me)
    return me
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}