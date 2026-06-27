import React, { useState, useEffect, useRef } from 'react'
import {
  Paper,
  Typography,
  Box,
  TextField,
  IconButton,
  Avatar,
  Stack,
  Button,
  Chip,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

const SUGGESTIONS = [
  'Summarize my most recent paper',
  'What research gaps appear across my library?',
  'Suggest follow-up research questions',
]

const Chatbot = ({ onClose, height = '72vh', embedded = false } = {}) => {
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Restore persisted session
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('chat_sessionId')
      const storedMessages = localStorage.getItem('chat_messages')
      if (storedSession) setSessionId(storedSession)
      if (storedMessages) setMessages(JSON.parse(storedMessages))
      if (storedSession) {
        ;(async () => {
          try {
            const res = await api.get(`/chat/sessions/${storedSession}`)
            if (res.data?.session?.messages) {
              setMessages(res.data.session.messages)
              localStorage.setItem('chat_messages', JSON.stringify(res.data.session.messages))
            }
          } catch (e) {
            /* ignore */
          }
        })()
      }
    } catch (e) {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('chat_messages', JSON.stringify(messages))
      if (sessionId) localStorage.setItem('chat_sessionId', sessionId)
    } catch (e) {}
  }, [messages, sessionId])

  const clearChat = async () => {
    try {
      if (sessionId) await api.delete(`/chat/sessions/${sessionId}`)
    } catch (e) {}
    localStorage.removeItem('chat_messages')
    localStorage.removeItem('chat_sessionId')
    setSessionId(null)
    setMessages([])
    toast.info('Conversation cleared')
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setMessages((prev) => [...prev, { role: 'user', content, timestamp: new Date() }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/chat', { message: content, sessionId })
      if (res.data.sessionId) setSessionId(res.data.sessionId)
      if (res.data.messages) setMessages(res.data.messages)
      else if (res.data.message)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.data.message, timestamp: new Date() },
        ])
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to reach the assistant'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: msg, timestamp: new Date() },
      ])
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper
      variant={embedded ? 'elevation' : 'outlined'}
      elevation={0}
      sx={{ height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <SmartToyIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>Research Assistant</Typography>
          <Typography variant="caption" color="text.secondary">
            Context-aware over your library
          </Typography>
        </Box>
        <IconButton size="small" onClick={clearChat} title="Clear conversation">
          <DeleteSweepIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default' }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            <SmartToyIcon sx={{ fontSize: 40, opacity: 0.5 }} />
            <Typography sx={{ mt: 1, fontWeight: 600 }}>
              Ask about your research
            </Typography>
            <Stack spacing={1} sx={{ mt: 2, alignItems: 'center' }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onClick={() => send(s)} variant="outlined" />
              ))}
            </Stack>
          </Box>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === 'user'
            return (
              <Stack
                key={i}
                direction="row"
                spacing={1}
                sx={{
                  mb: 1.5,
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                }}
              >
                {!isUser && (
                  <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                    <SmartToyIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '78%',
                    px: 1.75,
                    py: 1.25,
                    borderRadius: 2,
                    bgcolor: isUser ? 'primary.main' : 'background.paper',
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    border: (t) => (isUser ? 'none' : `1px solid ${t.palette.divider}`),
                    boxShadow: isUser ? 2 : 0,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </Typography>
                </Box>
                {isUser && (
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 28, height: 28 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
              </Stack>
            )
          })
        )}

        {loading && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
              <SmartToyIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Box
              className="rsa-typing"
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: (t) => `1px solid ${t.palette.divider}`,
                color: 'text.secondary',
              }}
            >
              <span />
              <span />
              <span />
            </Box>
          </Stack>
        )}
        <div ref={endRef} />
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: (t) => `1px solid ${t.palette.divider}`,
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          multiline
          maxRows={4}
        />
        <IconButton
          color="primary"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          sx={{ alignSelf: 'flex-end', bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  )
}

export default Chatbot
