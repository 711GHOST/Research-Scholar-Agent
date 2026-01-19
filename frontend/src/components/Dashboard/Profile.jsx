import React from 'react'
import { Paper, Typography, Box, Grid, Chip } from '@mui/material'
import { useAuth } from '../../context/AuthContext'

const Profile = () => {
  const { user } = useAuth()

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Profile Information
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.name || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.email || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Role
            </Typography>
            <Chip label={user?.role || 'Student'} color="primary" sx={{ mt: 1 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Institution
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.profile?.institution || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Department
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.profile?.department || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Research Domain
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.profile?.researchDomain || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  )
}

export default Profile
