import React, { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from '../theme'

const ColorModeContext = createContext(null)

export const useColorMode = () => {
  const ctx = useContext(ColorModeContext)
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider')
  return ctx
}

export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('color-mode') || 'light'
    } catch (e) {
      return 'light'
    }
  })

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem('color-mode', next)
      } catch (e) {}
      return next
    })
  }, [])

  const theme = useMemo(() => getTheme(mode), [mode])
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle])

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

export default ColorModeContext
