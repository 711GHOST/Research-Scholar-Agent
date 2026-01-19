import React, { useState } from 'react'
import Fab from '@mui/material/Fab'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import Dialog from '@mui/material/Dialog'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Chatbot from './Dashboard/Chatbot'

const ChatWidget = () => {
  const [open, setOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chatWidgetOpen')) || false
    } catch (e) {
      return false
    }
  })

  const toggleOpen = (val) => {
    setOpen(val)
    try {
      localStorage.setItem('chatWidgetOpen', JSON.stringify(val))
    } catch (e) {}
  }

  return (
    <>
      <div className="fixed right-6 bottom-6 z-50">
        <Fab
          color="primary"
          aria-label="chat"
          onClick={() => toggleOpen(true)}
          className="shadow-lg"
        >
          <ChatIcon />
        </Fab>
      </div>

      <Dialog
        open={open}
        onClose={() => toggleOpen(false)}
        PaperProps={{
          style: { width: 380, height: 560, position: 'fixed', right: 24, bottom: 88, margin: 0, borderRadius: 12 },
        }}
      >
        <Paper sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }} elevation={0}>
          <div style={{ paddingLeft: 8, fontWeight: 600 }}>Research Assistant</div>
          <IconButton size="small" onClick={() => toggleOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Paper>
        <div style={{ padding: 8, height: '100%' }}>
          <Chatbot onClose={() => toggleOpen(false)} />
        </div>
      </Dialog>
    </>
  )
}

export default ChatWidget
