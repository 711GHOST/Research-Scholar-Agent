import React from 'react'
import { Grid, Box, Typography, Stack, Avatar } from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import ChatIcon from '@mui/icons-material/Chat'

const FEATURES = [
  { icon: <AutoAwesomeIcon />, title: 'AI analysis', text: 'Summaries, keywords and research gaps in minutes.' },
  { icon: <TravelExploreIcon />, title: 'Discover & import', text: 'Pull open-access papers straight into your library.' },
  { icon: <ChatIcon />, title: 'Research chat', text: 'Ask questions grounded in your own papers.' },
]

const AuthHero = () => (
  <Grid
    item
    md={7}
    sx={{
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      justifyContent: 'center',
      p: 8,
      color: '#fff',
      background:
        'radial-gradient(1200px circle at 0% 0%, #14b8a6 0%, transparent 40%), linear-gradient(135deg, #0f766e 0%, #0b3b38 100%)',
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
      <Avatar variant="rounded" sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>
        <SchoolIcon />
      </Avatar>
      <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>
        Research Scholar Agent
      </Typography>
    </Stack>

    <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, maxWidth: 560 }}>
      Read less. Understand more.
    </Typography>
    <Typography sx={{ mt: 2, maxWidth: 520, opacity: 0.9 }}>
      Your AI co-pilot for research papers - analyze, summarize, discover and chat
      across your literature in one place.
    </Typography>

    <Stack spacing={2.5} sx={{ mt: 5, maxWidth: 460 }}>
      {FEATURES.map((f) => (
        <Stack key={f.title} direction="row" spacing={2} alignItems="flex-start">
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 38, height: 38 }}>{f.icon}</Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{f.title}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {f.text}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  </Grid>
)

export default AuthHero
