import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Avatar,
  Stack,
  LinearProgress,
  Paper,
} from '@mui/material'
import ArticleIcon from '@mui/icons-material/Article'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import ScheduleIcon from '@mui/icons-material/Schedule'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

const StatCard = ({ icon, color, label, value, sub }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar variant="rounded" sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
        </Box>
      </Stack>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
)

const Analytics = () => {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [me, list] = await Promise.all([api.get('/auth/me'), api.get('/papers')])
        setStats(me.data.user?.usageStats)
        setPapers(list.data.papers || [])
      } catch (e) {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const analyzed = papers.filter((p) => p.status === 'analyzed').length
  const processing = papers.filter((p) => p.status === 'processing').length
  const pending = papers.filter((p) => p.status === 'uploaded').length
  const total = papers.length
  const minutesSaved = stats?.totalAnalysisTime
    ? Math.max(1, Math.round((stats.totalAnalysisTime / 60) * 20)) // ~20x reading-time multiplier
    : 0
  const completion = total ? Math.round((analyzed / total) * 100) : 0

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Analytics
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        An overview of your research activity.
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ArticleIcon />} color="primary" label="Total papers" value={total} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<CheckCircleIcon />} color="success" label="Analyzed" value={analyzed} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<HourglassTopIcon />} color="warning" label="Processing" value={processing} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ScheduleIcon />}
            color="secondary"
            label="Est. time saved"
            value={`${minutesSaved}m`}
            sub="Versus reading each paper manually"
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Library completion
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={completion}
              sx={{ height: 12, borderRadius: 6 }}
            />
          </Box>
          <Typography sx={{ fontWeight: 700, minWidth: 48 }}>{completion}%</Typography>
        </Stack>
        <Stack direction="row" spacing={3} sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            ● {analyzed} analyzed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ● {processing} processing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ● {pending} pending
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}

export default Analytics
