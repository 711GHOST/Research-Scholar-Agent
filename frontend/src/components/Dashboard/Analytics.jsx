import React, { useState, useEffect } from 'react'
import { Paper, Typography, Box, Grid, Card, CardContent, CircularProgress, Alert } from '@mui/material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const Analytics = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [papers, setPapers] = useState([])

  useEffect(() => {
    fetchStats()
    fetchPapers()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/auth/me')
      setStats(response.data.user?.usageStats)
    } catch (error) {
      setError('Failed to fetch statistics')
    } finally {
      setLoading(false)
    }
  }

  const fetchPapers = async () => {
    try {
      const response = await api.get('/papers')
      setPapers(response.data.papers || [])
    } catch (error) {
      console.error('Error fetching papers:', error)
    }
  }

  const analyzedCount = papers.filter((p) => p.status === 'analyzed').length
  const processingCount = papers.filter((p) => p.status === 'processing').length
  const totalTimeSaved = stats?.totalAnalysisTime ? Math.round(stats.totalAnalysisTime / 60) : 0 // in minutes

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Usage Analytics
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Papers Analyzed
              </Typography>
              <Typography variant="h4">
                {stats?.papersAnalyzed || analyzedCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Papers
              </Typography>
              <Typography variant="h4">{papers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Time Saved (minutes)
              </Typography>
              <Typography variant="h4">{totalTimeSaved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Processing
              </Typography>
              <Typography variant="h4">{processingCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default Analytics
