import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChatWidget from './components/ChatWidget'

const FullScreenLoader = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <CircularProgress />
  </Box>
)

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  return user ? children : <Navigate to="/login" replace />
}

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  return user ? <Navigate to="/dashboard" replace /> : children
}

function App() {
  const { user } = useAuth()

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      {/* Floating assistant only when signed in */}
      {user && <ChatWidget />}
    </Router>
  )
}

export default App
