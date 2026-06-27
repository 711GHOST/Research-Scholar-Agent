import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  Stack,
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../context/AuthContext'
import AuthHero from '../components/AuthHero'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) navigate('/dashboard')
    else setError(result.message || 'Login failed')
  }

  return (
    <Grid container sx={{ minHeight: '100vh' }}>
      <AuthHero />
      <Grid
        item
        xs={12}
        md={5}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}
      >
        <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 420 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Welcome back
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Sign in to your Research Scholar Agent account.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="medium"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                size="medium"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                size="large"
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Stack>
          </form>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register" sx={{ fontWeight: 600 }}>
              Create one
            </Link>
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  )
}

export default Login
