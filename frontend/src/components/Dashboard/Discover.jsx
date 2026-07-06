import React, { useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Checkbox,
  CircularProgress,
  Stack,
  Paper,
  InputAdornment,
  Tooltip,
  Link,
  Collapse,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DownloadIcon from '@mui/icons-material/Download'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import TuneIcon from '@mui/icons-material/Tune'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

const PAGE_SIZE = 10 // exactly 10 results per page

const Discover = ({ onImported }) => {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [venue, setVenue] = useState('')
  const [lastNYears, setLastNYears] = useState('')
  const [sort, setSort] = useState('relevance')
  const [openAccessOnly, setOpenAccessOnly] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [currentOffset, setCurrentOffset] = useState(0)
  // Stack of source offsets for previous pages - enables exact Back navigation.
  const [offsetStack, setOffsetStack] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [selected, setSelected] = useState({})
  const [topic, setTopic] = useState('')
  const [importingKey, setImportingKey] = useState(null)
  const [bulkImporting, setBulkImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  // pageNumber is derived purely from how many offsets we've pushed.
  const pageNumber = offsetStack.length + 1

  // Fetch a page at a specific source offset; `stack` is the resulting
  // previous-offset stack to store (so page number + Back stay consistent).
  const doSearch = async (searchOffset, stack) => {
    if (!title.trim() && !author.trim() && !venue.trim()) {
      toast.warning('Enter a topic, author, or venue to search')
      return
    }
    try {
      setLoading(true)
      setSearched(true)
      const params = { limit: PAGE_SIZE, offset: searchOffset }
      if (title) params.title = title
      if (author) params.author = author
      if (venue) params.venue = venue
      if (lastNYears) params.lastNYears = lastNYears
      if (sort !== 'relevance') params.sort = sort
      if (openAccessOnly) params.openAccess = true

      const res = await api.get('/external/search', { params })
      setResults(res.data.results || [])
      setTotal(res.data.total || 0)
      setNextOffset(res.data.nextOffset ?? searchOffset + PAGE_SIZE)
      setHasMore(Boolean(res.data.hasMore))
      setCurrentOffset(searchOffset)
      setOffsetStack(stack)
      setSelected({})
    } catch (e) {
      const msg =
        e.response?.status === 429
          ? 'Search rate limit reached - please wait a moment.'
          : e.response?.data?.message || 'Search failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const startSearch = () => doSearch(0, []) // fresh search resets pagination
  const nextPage = () => doSearch(nextOffset, [...offsetStack, currentOffset])
  const prevPage = () => {
    const prev = offsetStack[offsetStack.length - 1] || 0
    doSearch(prev, offsetStack.slice(0, -1))
  }

  const importOne = async (paper) => {
    if (!paper.pdfUrl) return
    setImportingKey(paper.paperId)
    try {
      await api.post('/external/import', {
        title: paper.title,
        authors: paper.authors,
        pdfUrl: paper.pdfUrl,
        doi: paper.doi,
        year: paper.year,
        venue: paper.venue,
        topic: topic || '',
      })
      toast.success(`Imported “${paper.title}” - analyzing in the background`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import failed')
    } finally {
      setImportingKey(null)
    }
  }

  const importSelected = async () => {
    const keys = Object.keys(selected).filter((k) => selected[k])
    if (keys.length === 0) {
      toast.warning('Select at least one open-access paper to import')
      return
    }
    setBulkImporting(true)
    setProgress({ done: 0, total: keys.length })
    let ok = 0
    for (const key of keys) {
      const paper = results.find((p) => p.paperId === key)
      if (!paper?.pdfUrl) {
        setProgress((p) => ({ ...p, done: p.done + 1 }))
        continue
      }
      try {
        await api.post('/external/import', {
          title: paper.title,
          authors: paper.authors,
          pdfUrl: paper.pdfUrl,
          doi: paper.doi,
          year: paper.year,
          venue: paper.venue,
          topic: topic || '',
        })
        ok += 1
      } catch (e) {
        /* keep going */
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }
    setBulkImporting(false)
    setSelected({})
    toast.success(`Imported ${ok} paper${ok === 1 ? '' : 's'} - analysis running`)
    if (ok > 0 && onImported) onImported()
  }

  const importable = results.filter((p) => p.canImport)
  const selectedCount = Object.values(selected).filter(Boolean).length
  const showPager = pageNumber > 1 || hasMore

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Discover Papers
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Search millions of papers via Semantic Scholar, then import open-access PDFs
        straight into your library for AI analysis.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Topic / title"
              placeholder="e.g. graph neural networks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField fullWidth label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </Grid>
          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              startIcon={<TuneIcon />}
              onClick={() => setShowFilters((s) => !s)}
              sx={{ height: 40 }}
            >
              Filters
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={startSearch}
              disabled={loading}
              sx={{ height: 40 }}
            >
              Search
            </Button>
          </Grid>
        </Grid>

        <Collapse in={showFilters}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4} md={3}>
              <TextField fullWidth label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                select
                fullWidth
                label="Published"
                value={lastNYears}
                onChange={(e) => setLastNYears(e.target.value)}
              >
                <MenuItem value="">Any time</MenuItem>
                <MenuItem value="3">Last 3 years</MenuItem>
                <MenuItem value="5">Last 5 years</MenuItem>
                <MenuItem value="10">Last 10 years</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField
                select
                fullWidth
                label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="year_desc">Newest first</MenuItem>
                <MenuItem value="year_asc">Oldest first</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={openAccessOnly}
                    onChange={(e) => setOpenAccessOnly(e.target.checked)}
                  />
                }
                label="Open access only"
              />
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Bulk import bar */}
      {results.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mb: 2, alignItems: { sm: 'center' } }}
        >
          <TextField
            label="Topic label (optional)"
            placeholder="Group these imports, e.g. survey"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            sx={{ minWidth: 240 }}
          />
          <Button
            variant="contained"
            startIcon={bulkImporting ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
            onClick={importSelected}
            disabled={bulkImporting || selectedCount === 0}
          >
            {bulkImporting
              ? `Importing ${progress.done}/${progress.total}`
              : `Import selected (${selectedCount})`}
          </Button>
          <Typography variant="body2" color="text.secondary">
            {importable.length} of {results.length} on this page are open access
          </Typography>
        </Stack>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !searched ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <TravelExploreIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            Start exploring
          </Typography>
          <Typography color="text.secondary">
            Search a topic above to find papers you can import and analyze.
          </Typography>
        </Paper>
      ) : results.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6">No results found</Typography>
          <Typography color="text.secondary">
            Try a broader query or turn off the open-access filter.
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2.5}>
            {results.map((paper) => (
              <Grid item xs={12} md={6} key={paper.paperId}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Checkbox
                        sx={{ mt: -0.5, ml: -1 }}
                        disabled={!paper.canImport}
                        checked={!!selected[paper.paperId]}
                        onChange={(e) =>
                          setSelected((m) => ({ ...m, [paper.paperId]: e.target.checked }))
                        }
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                          {paper.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {(paper.authors || []).slice(0, 4).join(', ')}
                          {paper.authors?.length > 4 ? ' et al.' : ''}
                          {paper.year ? ` · ${paper.year}` : ''}
                          {paper.venue ? ` · ${paper.venue}` : ''}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          {paper.isOpenAccess ? (
                            <Chip
                              size="small"
                              color="success"
                              icon={<LockOpenIcon />}
                              label={paper.canImport ? 'Open access PDF' : 'Open access'}
                            />
                          ) : (
                            <Chip size="small" variant="outlined" label="No open PDF" />
                          )}
                        </Stack>
                        {paper.abstract && (
                          <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                            {paper.abstract.slice(0, 260)}
                            {paper.abstract.length > 260 ? '…' : ''}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
                    {paper.url && (
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon />}
                        component={Link}
                        href={paper.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source
                      </Button>
                    )}
                    <Tooltip title={paper.canImport ? '' : 'No open-access PDF available to import'}>
                      <span>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={
                            importingKey === paper.paperId ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DownloadIcon />
                            )
                          }
                          disabled={!paper.canImport || importingKey === paper.paperId}
                          onClick={() => importOne(paper)}
                        >
                          Import &amp; Analyze
                        </Button>
                      </span>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {showPager && (
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
              <Button
                variant="outlined"
                disabled={pageNumber === 1 || loading}
                onClick={prevPage}
              >
                Previous
              </Button>
              <Typography variant="body2" color="text.secondary">
                Page {pageNumber}
                {total > 0 ? ` · ${total.toLocaleString()} results` : ''}
              </Typography>
              <Button
                variant="outlined"
                disabled={!hasMore || loading}
                onClick={nextPage}
              >
                Next
              </Button>
            </Stack>
          )}
        </>
      )}
    </Box>
  )
}

export default Discover
