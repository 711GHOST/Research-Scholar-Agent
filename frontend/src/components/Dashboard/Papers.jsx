import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Stack,
  Paper,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SearchIcon from '@mui/icons-material/Search'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import ArticleIcon from '@mui/icons-material/Article'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import PaperDetailDialog from '../PaperDetailDialog'

const statusColor = (s) =>
  s === 'analyzed' ? 'success' : s === 'processing' ? 'warning' : s === 'failed' ? 'error' : 'default'

const Papers = ({ onDiscover }) => {
  const toast = useToast()
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [viewPaper, setViewPaper] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const pollRef = useRef(null)

  const fetchPapers = useCallback(async () => {
    try {
      const res = await api.get('/papers')
      setPapers(res.data.papers || [])
    } catch (e) {
      toast.error('Failed to load your library')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPapers()
  }, [fetchPapers])

  // Poll while any paper is still processing so the UI updates automatically.
  useEffect(() => {
    const processing = papers.some((p) => p.status === 'processing')
    if (processing && !pollRef.current) {
      pollRef.current = setInterval(fetchPapers, 4000)
    } else if (!processing && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [papers, fetchPapers])

  const handleUpload = async () => {
    if (!selectedFile) return
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', selectedFile.name.replace(/\.pdf$/i, ''))
    try {
      setUploading(true)
      await api.post('/papers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Paper uploaded')
      setUploadOpen(false)
      setSelectedFile(null)
      fetchPapers()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = async (id) => {
    try {
      setAnalyzingId(id)
      // optimistic status
      setPapers((prev) => prev.map((p) => (p._id === id ? { ...p, status: 'processing' } : p)))
      await api.post(`/papers/${id}/analyze`)
      toast.success('Analysis complete')
      fetchPapers()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Analysis failed')
      fetchPapers()
    } finally {
      setAnalyzingId(null)
    }
  }

  const handleView = async (id) => {
    try {
      const res = await api.get(`/papers/${id}`)
      setViewPaper(res.data.paper)
    } catch (e) {
      toast.error('Failed to load paper details')
    }
  }

  const handleDelete = async () => {
    const id = confirmDelete?._id
    setConfirmDelete(null)
    if (!id) return
    try {
      await api.delete(`/papers/${id}`)
      toast.info('Paper deleted')
      setPapers((prev) => prev.filter((p) => p._id !== id))
    } catch (e) {
      toast.error('Failed to delete paper')
    }
  }

  const filtered = papers.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      p.title?.toLowerCase().includes(q) ||
      (p.authors || []).join(' ').toLowerCase().includes(q)
    )
  })

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            My Library
          </Typography>
          <Typography color="text.secondary">
            {papers.length} {papers.length === 1 ? 'paper' : 'papers'} ·{' '}
            {papers.filter((p) => p.status === 'analyzed').length} analyzed
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<TravelExploreIcon />} onClick={onDiscover}>
            Discover
          </Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
            Upload
          </Button>
        </Stack>
      </Stack>

      <TextField
        fullWidth
        placeholder="Search your library by title or author…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, maxWidth: 480 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            {papers.length === 0 ? 'Your library is empty' : 'No matches'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {papers.length === 0
              ? 'Upload a PDF or discover open-access papers to get started.'
              : 'Try a different search term.'}
          </Typography>
          {papers.length === 0 && (
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
                Upload a paper
              </Button>
              <Button variant="outlined" startIcon={<TravelExploreIcon />} onClick={onDiscover}>
                Discover papers
              </Button>
            </Stack>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((paper) => (
            <Grid item xs={12} sm={6} lg={4} key={paper._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Chip size="small" label={paper.status} color={statusColor(paper.status)} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(paper.createdAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mt: 1.5, lineHeight: 1.3 }}
                  >
                    {paper.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {paper.authors?.length ? paper.authors.join(', ') : 'Unknown authors'}
                  </Typography>
                  {paper.topic && (
                    <Chip size="small" variant="outlined" label={paper.topic} sx={{ mt: 1.5 }} />
                  )}
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleView(paper._id)}
                  >
                    Details
                  </Button>
                  <Box>
                    {paper.status !== 'processing' && (
                      <Tooltip title={paper.status === 'analyzed' ? 'Re-analyze' : 'Analyze'}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={analyzingId === paper._id}
                            onClick={() => handleAnalyze(paper._id)}
                          >
                            {analyzingId === paper._id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <PlayArrowIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {paper.status === 'processing' && (
                      <CircularProgress size={18} sx={{ mx: 1.2 }} />
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(paper)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Upload a research paper</DialogTitle>
        <DialogContent>
          <Button
            component="label"
            variant="outlined"
            fullWidth
            startIcon={<UploadFileIcon />}
            sx={{ mt: 1, py: 2, borderStyle: 'dashed' }}
          >
            {selectedFile ? selectedFile.name : 'Choose a PDF file'}
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files[0]
                if (f && f.type === 'application/pdf') setSelectedFile(f)
                else toast.error('Please select a PDF file')
              }}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpload} disabled={uploading || !selectedFile}>
            {uploading ? <CircularProgress size={22} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete paper?</DialogTitle>
        <DialogContent>
          <Typography>
            “{confirmDelete?.title}” and its analysis will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <PaperDetailDialog open={Boolean(viewPaper)} paper={viewPaper} onClose={() => setViewPaper(null)} />
    </Box>
  )
}

export default Papers
