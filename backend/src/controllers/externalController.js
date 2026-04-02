const axios = require('axios')
const fs = require('fs').promises
const path = require('path')

/**
 * Proxy search to Semantic Scholar Graph API
 * Supported query params:
 * title, author, isbn, venue,
 * fromYear, toYear, lastNYears,
 * limit, offset, sort, openAccess
 */
const searchExternal = async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      venue,
      fromYear,
      toYear,
      lastNYears,
      limit = 20,
      offset = 0,
      sort,
      openAccess,
    } = req.query

    /* ---------------------------------------
       Build plain-text search query
    ---------------------------------------- */
    const parts = []
    if (title) parts.push(title)
    if (author) parts.push(author)
    if (venue) parts.push(venue)
    if (isbn) parts.push(isbn)

    const query = parts.join(' ').trim()

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      })
    }

    /* ---------------------------------------
       Semantic Scholar API config
    ---------------------------------------- */
    const url = 'https://api.semanticscholar.org/graph/v1/paper/search'

    // ONLY supported fields for search endpoint
    const fields =
      'paperId,title,authors,year,url,venue,abstract,isOpenAccess,openAccessPdf'

    const headers = {}
    const ssKey = process.env.SEMANTIC_SCHOLAR_API_KEY
    if (ssKey) {
      headers['x-api-key'] = ssKey
      try {
        const masked = `${ssKey.slice(0, 4)}...${ssKey.slice(-4)}`
        console.log('Using SEMANTIC_SCHOLAR_API_KEY:', masked)
      } catch (e) {
        console.log('Using SEMANTIC_SCHOLAR_API_KEY: [present]')
      }
    } else {
      console.log('SEMANTIC_SCHOLAR_API_KEY not set in backend environment')
    }

    console.log('External search request:', {
      query,
      limit,
      offset,
      openAccess,
      venue,
      sort,
    })

    const resp = await axios.get(url, {
      params: {
        query,
        fields,
        limit: Math.min(Number(limit) || 10, 100),
        offset: Number(offset) || 0,
      },
      headers,
      timeout: 20000,
    })

    let results = resp.data?.data || []
    const total = resp.data?.total || results.length

    /* ---------------------------------------
       Client-side filters
    ---------------------------------------- */

    // Last N years filter
    if (lastNYears) {
      const n = parseInt(lastNYears, 10)
      if (!isNaN(n)) {
        const since = new Date().getFullYear() - n + 1
        results = results.filter(
          (p) => p.year && p.year >= since
        )
      }
    }

    // Year range filter
    if (!lastNYears && (fromYear || toYear)) {
      const from = fromYear ? parseInt(fromYear, 10) : -Infinity
      const to = toYear ? parseInt(toYear, 10) : Infinity
      results = results.filter(
        (p) => p.year && p.year >= from && p.year <= to
      )
    }

    // Open access filter
    if (openAccess === 'true' || openAccess === true) {
      results = results.filter(
        (p) =>
          p.isOpenAccess === true ||
          (p.openAccessPdf && p.openAccessPdf.url)
      )
    }

    /* ---------------------------------------
       Map to lightweight response
    ---------------------------------------- */
    const mapped = results.map((p) => ({
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      url: p.url,
      venue: p.venue,
      abstract: p.abstract,
      authors: (p.authors || []).map((a) =>
        typeof a === 'string' ? a : a.name
      ),
      isOpenAccess:
        p.isOpenAccess ||
        Boolean(p.openAccessPdf && p.openAccessPdf.url),
    }))

    /* ---------------------------------------
       Sorting
    ---------------------------------------- */
    if (sort === 'year_desc') {
      mapped.sort((a, b) => (b.year || 0) - (a.year || 0))
    } else if (sort === 'year_asc') {
      mapped.sort((a, b) => (a.year || 0) - (b.year || 0))
    }

    return res.json({
      success: true,
      total,
      count: mapped.length,
      results: mapped,
    })
  } catch (error) {
    console.error(
      'External search error:',
      error.response?.data || error.message
    )

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
      })
    }

    return res.status(500).json({
      success: false,
      message: 'External search failed',
    })
  }
}

/**
 * Import an external paper by fetching its PDF and creating a Paper record
 * Body: { title, authors, url, doi, year, venue, topic }
 */
const importExternal = async (req, res) => {
  try {
    const { title, authors, url, doi, year, venue, topic } = req.body

    if (!url) {
      return res.status(400).json({ success: false, message: 'PDF URL is required' })
    }

    // Fetch PDF binary
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
    const buffer = Buffer.from(resp.data)

    // Ensure uploads directory
    const uploadDir = path.join(__dirname, '../../uploads')
    try {
      await fs.access(uploadDir)
    } catch (e) {
      await fs.mkdir(uploadDir, { recursive: true })
    }

    const safeName = (title || 'paper').replace(/[^a-z0-9\-_.]/gi, '_').slice(0, 120)
    const fileName = `${Date.now()}-${req.user.id}-${safeName}.pdf`
    const filePath = path.join(uploadDir, fileName)

    await fs.writeFile(filePath, buffer)

    // Create Paper record
    const Paper = require('../models/Paper')
    const paper = await Paper.create({
      userId: req.user.id,
      title: title || fileName.replace('.pdf', ''),
      authors: authors ? (Array.isArray(authors) ? authors : authors.split(',').map((a) => a.trim())) : [],
      fileName,
      filePath,
      fileSize: buffer.length,
      status: 'uploaded',
      metadata: { doi, publicationDate: year ? new Date(`${year}-01-01`) : undefined, journal: venue },
      topic: topic || '',
    })

    // trigger analysis asynchronously (non-blocking)
    const { performAnalysis } = require('./paperController')
    performAnalysis(paper, req.user.id).catch((e) => console.error('Import analysis failed:', e.message || e))

    return res.json({ success: true, message: 'Paper imported', paper })
  } catch (error) {
    console.error('Import external error:', error.response?.data || error.message || error)
    return res.status(500).json({ success: false, message: 'Import failed' })
  }
}

module.exports = {
  searchExternal,
  importExternal,
}
