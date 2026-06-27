import React, { useState } from 'react'
import { Fab, Zoom, Paper, Box, IconButton, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import Chatbot from './Dashboard/Chatbot'

const ChatWidget = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)

  return (
    <>
      <Zoom in={!open}>
        <Fab
          color="primary"
          aria-label="Open research assistant"
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1300 }}
        >
          <ChatIcon />
        </Fab>
      </Zoom>

      <Zoom in={open} unmountOnExit>
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            zIndex: 1300,
            right: isMobile ? 8 : 24,
            bottom: isMobile ? 8 : 24,
            left: isMobile ? 8 : 'auto',
            width: isMobile ? 'auto' : 390,
            height: isMobile ? '80vh' : 600,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>Research Assistant</Typography>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'inherit' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <Chatbot height="100%" embedded onClose={() => setOpen(false)} />
          </Box>
        </Paper>
      </Zoom>
    </>
  )
}

export default ChatWidget
