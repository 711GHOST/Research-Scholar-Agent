import { createTheme } from '@mui/material/styles'

// Brand palette - teal primary with a warm amber accent.
const brand = {
  primary: '#0f766e',
  primaryLight: '#14b8a6',
  secondary: '#f59e0b',
}

export const getTheme = (mode = 'light') => {
  const isLight = mode === 'light'

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? brand.primary : brand.primaryLight,
        light: brand.primaryLight,
      },
      secondary: { main: brand.secondary },
      success: { main: '#16a34a' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      background: {
        default: isLight ? '#f4f6f8' : '#0b1120',
        paper: isLight ? '#ffffff' : '#111a2e',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      h1: { fontFamily: "'Sora', 'Inter', sans-serif", fontWeight: 800 },
      h2: { fontFamily: "'Sora', 'Inter', sans-serif", fontWeight: 800 },
      h3: { fontFamily: "'Sora', 'Inter', sans-serif", fontWeight: 700 },
      h4: { fontFamily: "'Sora', 'Inter', sans-serif", fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { transition: 'background-color 0.3s ease' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
    },
  })
}

export default getTheme
