import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import api from '../../services/api'

const Papers = () => {
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [searchAuthor, setSearchAuthor] = useState('')
  const [searchIsbn, setSearchIsbn] = useState('')
  const [lastNYears, setLastNYears] = useState('')
  const [useExternal, setUseExternal] = useState(false)
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(10)
  const [totalResults, setTotalResults] = useState(0)
  const [sort, setSort] = useState('relevance')
  const [venueFilter, setVenueFilter] = useState('')
  const [openAccessOnly, setOpenAccessOnly] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [selectedExternal, setSelectedExternal] = useState({})
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importTopic, setImportTopic] = useState('')

  useEffect(() => {
    fetchPapers()
  }, [])

  const fetchPapers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/papers')
      setPapers(response.data.papers || [])
    } catch (error) {
      setError('Failed to fetch papers')
      console.error('Error fetching papers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {}
      if (searchTitle) params.title = searchTitle
      if (searchAuthor) params.author = searchAuthor
      if (searchIsbn) params.isbn = searchIsbn
      if (lastNYears) params.lastNYears = lastNYears
      params.limit = limit
      params.offset = page * limit
      if (sort && sort !== 'relevance') params.sort = sort
      if (venueFilter) params.venue = venueFilter
      if (openAccessOnly) params.openAccess = true

      if (useExternal) {
        const response = await api.get('/external/search', { params })
        setPapers(response.data.results || [])
        setTotalResults(response.data.total || response.data.count || 0)
      } else {
        const response = await api.get('/papers/search', { params })
        setPapers(response.data.papers || [])
        setTotalResults(response.data.count || 0)
      }
    } catch (err) {
      setError('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClearSearch = () => {
    setSearchTitle('')
    setSearchAuthor('')
    setSearchIsbn('')
    setLastNYears('')
    fetchPapers()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      setError('Please select a PDF file')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', selectedFile.name.replace('.pdf', ''))

    try {
      setUploading(true)
      setError('')
      await api.post('/papers/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setUploadDialogOpen(false)
      setSelectedFile(null)
      fetchPapers()
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this paper?')) {
      return
    }

    try {
      await api.delete(`/papers/${paperId}`)
      fetchPapers()
    } catch (error) {
      setError('Failed to delete paper')
    }
  }

  const handleAnalyze = async (paperId) => {
    try {
      setError('')
      await api.post(`/papers/${paperId}/analyze`)
      fetchPapers()
      alert('Analysis started! This may take a few minutes.')
    } catch (error) {
      setError(error.response?.data?.message || 'Analysis failed')
    }
  }

  const handleView = async (paperId) => {
    try {
      const response = await api.get(`/papers/${paperId}`)
      setSelectedPaper(response.data.paper)
      setViewDialogOpen(true)
    } catch (error) {
      setError('Failed to fetch paper details')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'analyzed':
        return 'success'
      case 'processing':
        return 'warning'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5">Research Papers</Typography>

          <TextField
            size="small"
            placeholder="Title"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
          />
          <TextField
            size="small"
            placeholder="Author"
            value={searchAuthor}
            onChange={(e) => setSearchAuthor(e.target.value)}
          />
          <TextField
            size="small"
            placeholder="ISBN/DOI"
            value={searchIsbn}
            onChange={(e) => setSearchIsbn(e.target.value)}
          />
          <TextField
            size="small"
            select
            label="Last"
            value={lastNYears}
            onChange={(e) => setLastNYears(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ width: 120 }}
          >
            <option value="">--</option>
            <option value="5">5 years</option>
            <option value="10">10 years</option>
          </TextField>

          <TextField
            size="small"
            placeholder="Venue"
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
          />

          <TextField
            size="small"
            select
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ width: 140 }}
          >
            <option value="relevance">Relevance</option>
            <option value="year_desc">Year (newest)</option>
            <option value="year_asc">Year (oldest)</option>
          </TextField>

          <FormControlLabel
            control={<Switch checked={openAccessOnly} onChange={(e) => setOpenAccessOnly(e.target.checked)} />}
            label="Open access"
          />

          <FormControlLabel
            control={<Switch checked={useExternal} onChange={(e) => setUseExternal(e.target.checked)} />}
            label="Search Online"
          />

          <Button variant="outlined" onClick={handleSearch}>Search</Button>
          <Button variant="text" onClick={handleClearSearch}>Clear</Button>
        </Box>

        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Paper
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : useExternal ? (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
            <TextField size="small" placeholder="Topic (optional)" value={importTopic} onChange={(e) => setImportTopic(e.target.value)} sx={{ minWidth: 220 }} />
            <Button variant="contained" onClick={async () => {
              // import selected items
              const selectedKeys = Object.keys(selectedExternal).filter(k => selectedExternal[k])
              if (selectedKeys.length === 0) {
                alert('No items selected for import')
                return
              }
              try {
                setImporting(true)
                setImportProgress({ done: 0, total: selectedKeys.length })
                for (let i = 0; i < selectedKeys.length; i++) {
                  const key = selectedKeys[i]
                  const item = papers.find(p => (p.paperId || p.paper_id || p.id) === key || p.paperId === key)
                  if (!item) continue
                  const payload = {
                    title: item.title,
                    authors: item.authors,
                    url: item.url,
                    doi: item.doi || item.paperId,
                    year: item.year,
                    venue: item.venue,
                    topic: importTopic || '',
                  }
                  try {
                    await api.post('/external/import', payload)
                  } catch (e) {
                    console.error('Import failed for', item.title, e)
                  }
                  setImportProgress((p) => ({ ...p, done: p.done + 1 }))
                }
                // refresh uploaded papers list
                fetchPapers()
                setSelectedExternal({})
                setImportTopic('')
                alert('Import requests submitted')
              } finally {
                setImporting(false)
                setImportProgress({ done: 0, total: 0 })
              }
            }} disabled={importing}>
              {importing ? `Importing (${importProgress.done}/${importProgress.total})` : 'Import Selected'}
            </Button>
            <Button variant="text" onClick={() => {
              // select all toggle
              if (papers.every(p => selectedExternal[p.paperId])) {
                setSelectedExternal({})
              } else {
                const m = {}
                papers.forEach(p => { if (p.paperId) m[p.paperId] = true })
                setSelectedExternal(m)
              }
            }}>Toggle Select All</Button>
          </Box>
          {papers.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>No results found</Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {papers.map((p, i) => (
                <Paper key={p.paperId || i} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <input
                        type="checkbox"
                        checked={!!selectedExternal[p.paperId]}
                        onChange={(e) => setSelectedExternal((m) => ({ ...m, [p.paperId]: e.target.checked }))}
                        style={{ width: 18, height: 18, marginTop: 6 }}
                      />
                      <Box>
                        <Typography variant="h6">{p.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{(p.authors || []).join(', ')} — {p.year || ''} {p.venue ? `· ${p.venue}` : ''}</Typography>
                        {p.abstract && <Typography variant="body2" sx={{ mt: 1 }}>{p.abstract.slice(0, 400)}{p.abstract.length > 400 ? '…' : ''}</Typography>}
                        {p.url && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <a href={p.url} target="_blank" rel="noreferrer">Open in Semantic Scholar</a>
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {/* Pagination controls for external search */}
          {useExternal && totalResults > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography variant="body2">Showing {page * limit + 1} - {Math.min((page + 1) * limit, totalResults)} of {totalResults}</Typography>
              <Box>
                <Button disabled={page === 0} onClick={() => { setPage((p) => Math.max(0, p - 1)); handleSearch() }} sx={{ mr: 1 }}>Previous</Button>
                <Button disabled={(page + 1) * limit >= totalResults} onClick={() => { setPage((p) => p + 1); handleSearch() }}>Next</Button>
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Authors</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {papers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No papers uploaded yet
                  </TableCell>
                </TableRow>
              ) : (
                papers.map((paper) => (
                  <TableRow key={paper._id}>
                    <TableCell>{paper.title}</TableCell>
                    <TableCell>
                      {paper.authors && paper.authors.length > 0
                        ? paper.authors.join(', ')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={paper.status}
                        color={getStatusColor(paper.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(paper.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleView(paper._id)}
                        title="View Details"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      {paper.status !== 'processing' && (
                        <IconButton
                          size="small"
                          onClick={() => handleAnalyze(paper._id)}
                          title="Analyze Paper"
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(paper._id)}
                        color="error"
                        title="Delete Paper"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
        <DialogTitle>Upload Research Paper</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ marginTop: '16px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading || !selectedFile}>
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedPaper?.title}</DialogTitle>
        <DialogContent>
          {selectedPaper && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Authors: {selectedPaper.authors?.join(', ') || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Status: <Chip label={selectedPaper.status} color={getStatusColor(selectedPaper.status)} size="small" />
              </Typography>
              {selectedPaper.summary && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6">Analysis</Typography>

                  {/* Sections */}
                  {selectedPaper.summary.sections && (
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(selectedPaper.summary.sections).map(([key, val]) =>
                        val ? (
                          <Box key={key} sx={{ mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                              {key}
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                              {val}
                            </Typography>
                          </Box>
                        ) : null
                      )}
                    </Box>
                  )}

                  {/* Keywords */}
                  {selectedPaper.summary.keywords && selectedPaper.summary.keywords.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Keywords</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {selectedPaper.summary.keywords.map((k, i) => (
                          <Chip key={i} label={`${k.word} ${k.frequency ? `(${k.frequency})` : ''}`} size="small" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Topics */}
                  {selectedPaper.summary.topics && selectedPaper.summary.topics.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Topics</Typography>
                      <Box sx={{ mt: 1 }}>
                        {selectedPaper.summary.topics.map((t, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2">{t.topic}</Typography>
                            <Chip label={`${Math.round((t.confidence || 0) * 100)}%`} size="small" />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Research Gaps */}
                  {selectedPaper.summary.researchGaps && selectedPaper.summary.researchGaps.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Research Gaps</Typography>
                      <Box sx={{ mt: 1 }}>
                        {selectedPaper.summary.researchGaps.map((g, i) => (
                          <Box key={i} sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.gap}</Typography>
                            {g.reasoning && <Typography variant="body2" sx={{ mt: 0.5 }}>{g.reasoning}</Typography>}
                            {g.priority && <Chip label={g.priority} size="small" sx={{ mt: 0.5 }} />}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Related Work */}
                  {selectedPaper.summary.relatedWorkSuggestions && selectedPaper.summary.relatedWorkSuggestions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Related Work Suggestions</Typography>
                      <Box sx={{ mt: 1 }}>
                        {selectedPaper.summary.relatedWorkSuggestions.map((r, i) => (
                          <Box key={i} sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{(r.authors || []).join(', ')}</Typography>
                            {r.reason && <Typography variant="body2" sx={{ mt: 0.5 }}>{r.reason}</Typography>}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Processing meta */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption">Processed at: {new Date(selectedPaper.summary.processedAt).toLocaleString()}</Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>Processing time: {selectedPaper.summary.processingTime || 0}s</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

export default Papers
