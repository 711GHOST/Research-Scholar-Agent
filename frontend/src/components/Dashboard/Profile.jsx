import React from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Avatar,
  Stack,
  Divider,
} from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import EmailIcon from '@mui/icons-material/Email'
import BusinessIcon from '@mui/icons-material/Business'
import ScienceIcon from '@mui/icons-material/Science'
import ApartmentIcon from '@mui/icons-material/Apartment'
import { useAuth } from '../../context/AuthContext'

const Field = ({ icon, label, value }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 40, height: 40 }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    </Box>
  </Stack>
)

const Profile = () => {
  const { user } = useAuth()

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Profile
      </Typography>

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
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {user?.name}
            </Typography>
            <Chip
              size="small"
              label={user?.role || 'Student'}
              sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
            />
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Field icon={<EmailIcon />} label="Email" value={user?.email} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Field icon={<SchoolIcon />} label="Role" value={user?.role} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Field icon={<ApartmentIcon />} label="Institution" value={user?.profile?.institution} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Field icon={<BusinessIcon />} label="Department" value={user?.profile?.department} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Field icon={<ScienceIcon />} label="Research domain" value={user?.profile?.researchDomain} />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Usage
        </Typography>
        <Stack direction="row" spacing={4} divider={<Divider orientation="vertical" flexItem />}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {user?.usageStats?.papersAnalyzed ?? 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Papers processed
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {Math.round((user?.usageStats?.totalAnalysisTime ?? 0))}s
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI compute time
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  )
}

export default Profile
