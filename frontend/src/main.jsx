import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ColorModeProvider } from './context/ColorModeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ColorModeProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ColorModeProvider>
  </React.StrictMode>
)
