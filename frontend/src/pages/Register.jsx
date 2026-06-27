import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Grid,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  Link,
  Stack,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../context/AuthContext'
import AuthHero from '../components/AuthHero'

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Student',
    institution: '',
    department: '',
    researchDomain: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const passwordMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')

    setLoading(true)
    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      profile: {
        institution: form.institution,
        department: form.department,
        researchDomain: form.researchDomain,
      },
    })
    setLoading(false)
    if (result.success) navigate('/dashboard')
    else setError(result.message || 'Registration failed')
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
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 460, my: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Create your account
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Start analyzing research in minutes.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.25}>
              <TextField
                fullWidth
                size="medium"
                label="Full name"
                name="name"
                value={form.name}
                onChange={change}
                required
                autoComplete="name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                size="medium"
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={change}
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
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={change}
                    required
                    autoComplete="new-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Confirm password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={change}
                    required
                    autoComplete="new-password"
                    error={passwordMismatch}
                    helperText={passwordMismatch ? 'Does not match' : ' '}
                  />
                </Grid>
              </Grid>
              <TextField
                fullWidth
                size="medium"
                select
                label="Role"
                name="role"
                value={form.role}
                onChange={change}
              >
                <MenuItem value="Student">Student</MenuItem>
                <MenuItem value="Research Scholar">Research Scholar</MenuItem>
                <MenuItem value="Faculty">Faculty</MenuItem>
              </TextField>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="medium" label="Institution" name="institution" value={form.institution} onChange={change} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="medium" label="Department" name="department" value={form.department} onChange={change} />
                </Grid>
              </Grid>
              <TextField
                fullWidth
                size="medium"
                label="Research domain"
                name="researchDomain"
                value={form.researchDomain}
                onChange={change}
              />
              <Button type="submit" fullWidth size="large" variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Create account'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
              Sign in
            </Link>
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  )
}

export default Register
