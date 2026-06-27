import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = RAZORPAY_SRC
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const formatPrice = (paise, currency = 'INR') =>
  paise === 0
    ? 'Free'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
        paise / 100
      )

const Billing = () => {
  const toast = useToast()
  const { user, updateUser } = useAuth()
  const [plans, setPlans] = useState([])
  const [paymentsConfigured, setPaymentsConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState(null)

  const currentPlan = user?.subscription?.plan || 'free'

  const fetchPlans = async () => {
    try {
      const res = await api.get('/billing/plans')
      setPlans(res.data.plans || [])
      setPaymentsConfigured(res.data.paymentsConfigured)
    } catch (e) {
      toast.error('Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activate = async (plan, orderId, paymentId, signature) => {
    const res = await api.post('/billing/verify', { plan, orderId, paymentId, signature })
    updateUser(res.data.user)
    toast.success(res.data.message || 'Subscription activated')
  }

  const subscribe = async (plan) => {
    setBusyPlan(plan)
    try {
      const { data: order } = await api.post('/billing/checkout', { plan })

      if (order.mock) {
        // No real gateway configured — simulate a successful payment.
        await activate(plan, order.orderId, `mock_pay_${Date.now()}`)
        return
      }

      const ok = await loadRazorpay()
      if (!ok) {
        toast.error('Could not load the payment gateway')
        return
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Research Scholar Agent',
        description: `${plan} subscription`,
        order_id: order.orderId,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#0f766e' },
        handler: async (response) => {
          try {
            await activate(
              plan,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            )
          } catch (e) {
            toast.error('Payment verification failed')
          }
        },
        modal: { ondismiss: () => setBusyPlan(null) },
      })
      rzp.open()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Checkout failed')
    } finally {
      setBusyPlan(null)
    }
  }

  const cancelPlan = async () => {
    setBusyPlan('cancel')
    try {
      const res = await api.post('/billing/cancel')
      updateUser(res.data.user)
      toast.info('Switched to the Free plan')
    } catch (e) {
      toast.error('Could not cancel subscription')
    } finally {
      setBusyPlan(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Subscription
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Choose the plan that fits your research workflow.
      </Typography>

      {!paymentsConfigured && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Payments are in <strong>demo mode</strong> — “Subscribe” simulates a successful
          payment. Add Razorpay keys on the server to enable real checkout.
        </Alert>
      )}

      <Grid container spacing={2.5} alignItems="stretch">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan
          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  borderColor: plan.popular ? 'primary.main' : undefined,
                  borderWidth: plan.popular ? 2 : 1,
                }}
              >
                {plan.popular && (
                  <Chip
                    color="primary"
                    label="Most popular"
                    size="small"
                    sx={{ position: 'absolute', top: 14, right: 14 }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    {plan.tagline}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {plan.name}
                  </Typography>
                  <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mt: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {formatPrice(plan.price, plan.currency)}
                    </Typography>
                    {plan.price > 0 && (
                      <Typography color="text.secondary">/{plan.interval}</Typography>
                    )}
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <List dense disablePadding>
                    {plan.features.map((f) => (
                      <ListItem key={f} disableGutters sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckCircleIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText primary={f} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  {isCurrent ? (
                    <Button fullWidth variant="outlined" disabled startIcon={<CheckCircleIcon />}>
                      Current plan
                    </Button>
                  ) : plan.id === 'free' ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="inherit"
                      disabled={busyPlan === 'cancel'}
                      onClick={cancelPlan}
                    >
                      {busyPlan === 'cancel' ? <CircularProgress size={22} /> : 'Downgrade to Free'}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<WorkspacePremiumIcon />}
                      disabled={busyPlan === plan.id}
                      onClick={() => subscribe(plan.id)}
                    >
                      {busyPlan === plan.id ? <CircularProgress size={22} color="inherit" /> : `Choose ${plan.name}`}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}

export default Billing
