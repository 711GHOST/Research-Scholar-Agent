import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Avatar,
  Stack,
  Divider,
  Button,
  Tooltip,
} from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import BusinessIcon from '@mui/icons-material/Business'
import ScienceIcon from '@mui/icons-material/Science'
import ApartmentIcon from '@mui/icons-material/Apartment'
import EditIcon from '@mui/icons-material/Edit'
import VerifiedIcon from '@mui/icons-material/Verified'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { useAuth } from '../../context/AuthContext'
import EditProfileDialog from './EditProfileDialog'
import VerifyDialog from './VerifyDialog'

const Field = ({ icon, label, value, action }) => (
  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ justifyContent: 'space-between' }}>
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
      <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 40, height: 40 }}>
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
    {action}
  </Stack>
)

const VerifyBadge = ({ verified }) =>
  verified ? (
    <Chip size="small" color="success" icon={<VerifiedIcon />} label="Verified" />
  ) : (
    <Chip size="small" color="warning" variant="outlined" icon={<ErrorOutlineIcon />} label="Unverified" />
  )

const Profile = ({ onManagePlan }) => {
  const { user, updateUser } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [verify, setVerify] = useState({ open: false, channel: 'email', target: '' })

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const plan = user?.subscription?.plan || 'free'

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Profile
        </Typography>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
          Edit profile
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
        <Box
          sx={{
            p: 3,
            background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <Avatar sx={{ width: 72, height: 72, fontSize: 28, bgcolor: 'rgba(255,255,255,0.2)' }}>
            {initials}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {user?.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip size="small" label={user?.role || 'Student'} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
              <Chip
                size="small"
                icon={<WorkspacePremiumIcon sx={{ color: '#fff !important' }} />}
                label={`${plan[0].toUpperCase()}${plan.slice(1)} plan`}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              />
            </Stack>
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          {user?.profile?.bio && (
            <>
              <Typography variant="body2" color="text.secondary">
                {user.profile.bio}
              </Typography>
              <Divider sx={{ my: 2.5 }} />
            </>
          )}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Field
                icon={<EmailIcon />}
                label="Email"
                value={user?.email}
                action={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VerifyBadge verified={user?.emailVerified} />
                    {!user?.emailVerified && (
                      <Button
                        size="small"
                        onClick={() => setVerify({ open: true, channel: 'email', target: user?.email || '' })}
                      >
                        Verify
                      </Button>
                    )}
                  </Stack>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                icon={<PhoneIcon />}
                label="Phone"
                value={user?.phone || 'Not added'}
                action={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {user?.phone ? <VerifyBadge verified={user?.phoneVerified} /> : null}
                    {!user?.phoneVerified && (
                      <Button
                        size="small"
                        onClick={() => setVerify({ open: true, channel: 'phone', target: user?.phone || '' })}
                      >
                        {user?.phone ? 'Verify' : 'Add'}
                      </Button>
                    )}
                  </Stack>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field icon={<SchoolIcon />} label="Role" value={user?.role} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field icon={<ApartmentIcon />} label="Institution" value={user?.profile?.institution} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field icon={<BusinessIcon />} label="Department" value={user?.profile?.department} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field icon={<ScienceIcon />} label="Research domain" value={user?.profile?.researchDomain} />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Subscription
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are on the <strong>{plan}</strong> plan.
              {user?.subscription?.currentPeriodEnd
                ? ` Renews ${new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}.`
                : ''}
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<WorkspacePremiumIcon />} onClick={onManagePlan}>
            Manage plan
          </Button>
        </Stack>
      </Paper>

      <EditProfileDialog
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={(u) => updateUser(u)}
      />
      <VerifyDialog
        open={verify.open}
        channel={verify.channel}
        initialTarget={verify.target}
        onClose={() => setVerify((v) => ({ ...v, open: false }))}
        onVerified={(u) => updateUser(u)}
      />
    </Box>
  )
}

export default Profile
