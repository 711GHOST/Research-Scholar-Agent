import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../context/AuthContext'
import Profile from '../components/Dashboard/Profile'
import Papers from '../components/Dashboard/Papers'
import Chatbot from '../components/Dashboard/Chatbot'
import Analytics from '../components/Dashboard/Analytics'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Research Scholar Agent
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name} ({user?.role})
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab label="Profile" />
            <Tab label="Papers" />
            <Tab label="Chatbot" />
            <Tab label="Analytics" />
          </Tabs>
        </Paper>

        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && <Profile />}
          {tabValue === 1 && <Papers />}
          {tabValue === 2 && <Chatbot />}
          {tabValue === 3 && <Analytics />}
        </Box>
      </Container>
    </Box>
  )
}

export default Dashboard
