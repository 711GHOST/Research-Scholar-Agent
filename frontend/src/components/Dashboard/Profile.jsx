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

// A profile field row. The label/value block is allowed to shrink and wrap so a
// long value (e.g. an email) never pushes the action off-screen on mobile.
const Field = ({ icon, label, value, action }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={{ xs: 1, sm: 1.5 }}
    alignItems={{ xs: 'stretch', sm: 'flex-start' }}
    sx={{ justifyContent: 'space-between', gap: 1 }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
      <Avatar
        variant="rounded"
        sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 40, height: 40, flexShrink: 0 }}
      >
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
    {/* On mobile the action drops below and aligns under the value text. */}
    {action && <Box sx={{ flexShrink: 0, pl: { xs: 6.5, sm: 0 } }}>{action}</Box>}
  </Stack>
)

const VerifyBadge = ({ verified }) =>
  verified ? (
    <Chip size="small" color="success" icon={<VerifiedIcon />} label="Verified" />
  ) : (
    <Chip size="small" color="warning" variant="outlined" icon={<ErrorOutlineIcon />} label="Unverified" />
  )

// Action for email/phone: badge + verify button, wrapping neatly on narrow screens.
const VerifyAction = ({ verified, showBadge, buttonLabel, onVerify }) => (
  <Stack
    direction="row"
    spacing={0.75}
    alignItems="center"
    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
    sx={{ flexWrap: 'wrap', rowGap: 0.5 }}
  >
    {showBadge && <VerifyBadge verified={verified} />}
    {!verified && (
      <Button size="small" onClick={onVerify}>
        {buttonLabel}
      </Button>
    )}
  </Stack>
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
    <Box sx={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Profile
        </Typography>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => setEditOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          Edit profile
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.75, sm: 2.5 },
          }}
        >
          <Avatar
            sx={{
              width: { xs: 56, sm: 72 },
              height: { xs: 56, sm: 72 },
              fontSize: { xs: 22, sm: 28 },
              bgcolor: 'rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
              {user?.name}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap' }}>
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

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {user?.profile?.bio && (
            <>
              <Typography variant="body2" color="text.secondary">
                {user.profile.bio}
              </Typography>
              <Divider sx={{ my: 2.5 }} />
            </>
          )}
          <Grid container spacing={{ xs: 2.5, sm: 3 }}>
            <Grid item xs={12} md={6}>
              <Field
                icon={<EmailIcon />}
                label="Email"
                value={user?.email}
                action={
                  <VerifyAction
                    verified={user?.emailVerified}
                    showBadge
                    buttonLabel="Verify"
                    onVerify={() => setVerify({ open: true, channel: 'email', target: user?.email || '' })}
                  />
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                icon={<PhoneIcon />}
                label="Phone"
                value={user?.phone || 'Not added'}
                action={
                  <VerifyAction
                    verified={user?.phoneVerified}
                    showBadge={Boolean(user?.phone)}
                    buttonLabel={user?.phone ? 'Verify' : 'Add'}
                    onVerify={() => setVerify({ open: true, channel: 'phone', target: user?.phone || '' })}
                  />
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

      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
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
          <Button
            variant="outlined"
            startIcon={<WorkspacePremiumIcon />}
            onClick={onManagePlan}
            sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'auto' } }}
          >
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
