import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

const labels = {
  email: { title: 'Verify email', field: 'Email address', placeholder: 'you@example.com' },
  phone: { title: 'Verify phone', field: 'Phone number', placeholder: '+919876543210' },
}

const VerifyDialog = ({ open, channel = 'email', initialTarget = '', onClose, onVerified }) => {
  const toast = useToast()
  const cfg = labels[channel]
  const [target, setTarget] = useState(initialTarget)
  const [step, setStep] = useState('request') // 'request' | 'verify'
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTarget(initialTarget)
      setStep('request')
      setCode('')
      setDevCode('')
      setError('')
    }
  }, [open, initialTarget])

  const sendCode = async () => {
    setError('')
    setSending(true)
    try {
      const res = await api.post('/auth/otp/request', { channel, target })
      setStep('verify')
      if (res.data.devCode) setDevCode(res.data.devCode)
      toast.success('Verification code sent')
    } catch (e) {
      setError(e.response?.data?.message || 'Could not send code')
    } finally {
      setSending(false)
    }
  }

  const verify = async () => {
    setError('')
    setVerifying(true)
    try {
      const res = await api.post('/auth/otp/verify', { channel, code })
      toast.success('Verified successfully')
      onVerified?.(res.data.user)
      onClose?.()
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid code')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{cfg.title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 'request' ? (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We&apos;ll send a 6-digit code to confirm this {channel}.
            </Typography>
            <TextField
              fullWidth
              label={cfg.field}
              placeholder={cfg.placeholder}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the code sent to <strong>{target}</strong>.
            </Typography>
            {devCode && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Dev mode (no email/SMS provider configured): your code is{' '}
                <strong>{devCode}</strong>
              </Alert>
            )}
            <TextField
              fullWidth
              label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ inputMode: 'numeric', style: { letterSpacing: 6, fontSize: 20 } }}
            />
            <Button size="small" sx={{ mt: 1 }} onClick={sendCode} disabled={sending}>
              Resend code
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {step === 'request' ? (
          <Button variant="contained" onClick={sendCode} disabled={sending || !target.trim()}>
            {sending ? <CircularProgress size={22} /> : 'Send code'}
          </Button>
        ) : (
          <Button variant="contained" onClick={verify} disabled={verifying || code.length !== 6}>
            {verifying ? <CircularProgress size={22} /> : 'Verify'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default VerifyDialog
