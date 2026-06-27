import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token: newToken, user: newUser } = response.data
      localStorage.setItem('token', newToken)
      setToken(newToken)
      setUser(newUser)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { token: newToken, user: newUser } = response.data
      localStorage.setItem('token', newToken)
      setToken(newToken)
      setUser(newUser)
      return { success: true }
    } catch (error) {
      const data = error.response?.data
      const message =
        data?.message || data?.errors?.[0]?.msg || 'Registration failed'
      return { success: false, message }
    }
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const value = { user, loading, token, login, register, logout, fetchUser, setUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
