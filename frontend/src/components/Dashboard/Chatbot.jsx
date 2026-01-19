import React, { useState, useEffect, useRef } from 'react'
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import api from '../../services/api'

const Chatbot = ({ onClose } = {}) => {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load persisted session/messages
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('chat_sessionId')
      const storedMessages = localStorage.getItem('chat_messages')
      if (storedSession) setSessionId(storedSession)
      if (storedMessages) setMessages(JSON.parse(storedMessages))

      // If we have a sessionId, try to sync with server
      if (storedSession) {
        (async () => {
          try {
            const res = await api.get(`/chat/sessions/${storedSession}`)
            if (res.data?.session?.messages) {
              setMessages(res.data.session.messages)
              localStorage.setItem('chat_messages', JSON.stringify(res.data.session.messages))
            }
          } catch (e) {
            // ignore
          }
        })()
      }
    } catch (e) {
      console.error('Failed to load chat from storage', e)
    }
  }, [])

  // Persist messages locally
  useEffect(() => {
    try {
      localStorage.setItem('chat_messages', JSON.stringify(messages))
      if (sessionId) localStorage.setItem('chat_sessionId', sessionId)
    } catch (e) {}
  }, [messages, sessionId])

  const handleSend = async () => {
    if (!inputMessage.trim()) return

    const isDeleteCommand = (text) => {
      if (!text) return false
      const t = text.toLowerCase()
      // match phrases like: delete chat, clear conversation, reset session, exit chat
      return /\b(delete|clear|reset|erase|exit|close)\b.*\b(chat|conversation|session)\b/.test(t) || /\b(clear|reset|delete|erase)\b/.test(t) && /\b(chat|conversation|session)\b/.test(t)
    }

    if (isDeleteCommand(inputMessage)) {
      // Add user message
      const userMessage = {
        role: 'user',
        content: inputMessage,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInputMessage('')

      // Delete remote session if exists, then clear local state
      try {
        if (sessionId) {
          await api.delete(`/chat/sessions/${sessionId}`)
        }
      } catch (e) {
        // ignore errors
      }

      // Clear local storage and reset chat
      try {
        localStorage.removeItem('chat_messages')
        localStorage.removeItem('chat_sessionId')
      } catch (e) {}

      setSessionId(null)
      setMessages([
        {
          role: 'assistant',
          content: 'Chat cleared. Start a new conversation when ready.',
          timestamp: new Date(),
        },
      ])

      // Optionally close widget
      if (typeof onClose === 'function') onClose()

      return
    }

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)
    setError('')

    try {
      setTyping(true)
      const response = await api.post('/chat', {
        message: inputMessage,
        sessionId: sessionId,
      })

      // backend returns sessionId and messages array
      if (response.data.sessionId) {
        setSessionId(response.data.sessionId)
        localStorage.setItem('chat_sessionId', response.data.sessionId)
      }

      if (response.data.messages) {
        setMessages(response.data.messages)
      } else if (response.data.message) {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send message')
      console.error('Chat error:', error)
    } finally {
      setLoading(false)
      setTyping(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Paper sx={{ p: 4, height: '70vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        Research Chatbot
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Ask questions about your research papers, get summaries, and discover research gaps
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          p: 2,
          mb: 2,
          backgroundColor: '#fafafa',
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
            <Typography>Start a conversation with your research assistant</Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Try asking: "Summarize my last paper" or "Suggest research gaps in my topic"
            </Typography>
          </Box>
        ) : (
          <List>
            {messages.map((message, index) => (
              <ListItem
                key={index}
                sx={{
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <ListItemText
                  primary={message.content}
                  secondary={new Date(message.timestamp).toLocaleTimeString()}
                  sx={{
                    backgroundColor: message.role === 'user' ? '#1976d2' : '#e0e0e0',
                    color: message.role === 'user' ? 'white' : 'black',
                    padding: 1.5,
                    borderRadius: 2,
                    maxWidth: '70%',
                    '& .MuiListItemText-primary': {
                      color: message.role === 'user' ? 'white' : 'inherit',
                    },
                    '& .MuiListItemText-secondary': {
                      color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                    },
                  }}
                />
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type your message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !inputMessage.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          Send
        </Button>
      </Box>
    </Paper>
  )
}

export default Chatbot
