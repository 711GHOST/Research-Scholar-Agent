import React, { createContext, useContext, useCallback, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

const ToastContext = createContext(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export const ToastProvider = ({ children }) => {
  const [state, setState] = useState({ open: false, message: '', severity: 'info' })

  const toast = useCallback((message, severity = 'info') => {
    setState({ open: true, message: String(message || ''), severity })
  }, [])

  const value = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info'),
    warning: (m) => toast(m, 'warning'),
  }

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return
    setState((s) => ({ ...s, open: false }))
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={state.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export default ToastContext
