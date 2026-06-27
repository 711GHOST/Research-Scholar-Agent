/**
 * External paper search & import (Semantic Scholar Graph API)
 *
 * search  -> proxy a query to Semantic Scholar and return normalized results,
 *            including the direct open-access PDF URL when available.
 * import  -> download an OPEN-ACCESS PDF safely (SSRF-protected), persist it as
 *            a Paper, and kick off AI analysis so it appears in the dashboard.
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const { config } = require('../config/env');
const { downloadPdfSafely } = require('../utils/security');

const SS_SEARCH_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';
const SS_FIELDS =
  'paperId,title,authors,year,url,venue,abstract,isOpenAccess,openAccessPdf,externalIds';

const uploadDir = path.join(__dirname, '../../uploads');

function buildHeaders() {
  const headers = {};
  if (config.semanticScholarApiKey) {
    headers['x-api-key'] = config.semanticScholarApiKey;
  }
  return headers;
}

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
    } = req.query;

    const parts = [];
    if (title) parts.push(title);
    if (author) parts.push(author);
    if (venue) parts.push(venue);
    if (isbn) parts.push(isbn);

    const query = parts.join(' ').trim();

    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'Search query is required' });
    }

    const resp = await axios.get(SS_SEARCH_URL, {
      params: {
        query,
        fields: SS_FIELDS,
        limit: Math.min(Number(limit) || 10, 100),
        offset: Math.max(Number(offset) || 0, 0),
      },
      headers: buildHeaders(),
      timeout: 20000,
    });

    let results = resp.data?.data || [];
    const total = resp.data?.total || results.length;

    if (lastNYears) {
      const n = parseInt(lastNYears, 10);
      if (!isNaN(n)) {
        const since = new Date().getFullYear() - n + 1;
        results = results.filter((p) => p.year && p.year >= since);
      }
    } else if (fromYear || toYear) {
      const from = fromYear ? parseInt(fromYear, 10) : -Infinity;
      const to = toYear ? parseInt(toYear, 10) : Infinity;
      results = results.filter((p) => p.year && p.year >= from && p.year <= to);
    }

    if (openAccess === 'true' || openAccess === true) {
      results = results.filter(
        (p) => p.isOpenAccess === true || (p.openAccessPdf && p.openAccessPdf.url)
      );
    }

    const mapped = results.map((p) => {
      const pdfUrl = p.openAccessPdf && p.openAccessPdf.url ? p.openAccessPdf.url : null;
      return {
        paperId: p.paperId,
        title: p.title,
        year: p.year,
        url: p.url, // Semantic Scholar landing page
        pdfUrl, // direct open-access PDF (used for import/analysis)
        venue: p.venue,
        abstract: p.abstract,
        doi: p.externalIds?.DOI || null,
        authors: (p.authors || []).map((a) => (typeof a === 'string' ? a : a.name)),
        isOpenAccess: Boolean(p.isOpenAccess || pdfUrl),
        canImport: Boolean(pdfUrl), // only open-access PDFs can be imported
      };
    });

    if (sort === 'year_desc') mapped.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === 'year_asc') mapped.sort((a, b) => (a.year || 0) - (b.year || 0));

    return res.json({ success: true, total, count: mapped.length, results: mapped });
  } catch (error) {
    console.error('External search error:', error.response?.status || error.message);

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    return res.status(502).json({ success: false, message: 'External search failed' });
  }
};

/**
 * Import an open-access paper: download its PDF, store it, and analyze it.
 * Body: { title, authors, pdfUrl, doi, year, venue, topic }
 */
const importExternal = async (req, res) => {
  let filePath = null;
  try {
    const { title, authors, pdfUrl, url, doi, year, venue, topic } = req.body;

    // Only open-access PDF URLs are importable. We accept `pdfUrl` (preferred)
    // and fall back to `url` for backward compatibility, but it must resolve to
    // a real PDF — landing pages are rejected by downloadPdfSafely().
    const sourceUrl = pdfUrl || url;
    if (!sourceUrl) {
      return res.status(400).json({
        success: false,
        message: 'An open-access PDF URL is required to import this paper',
      });
    }

    let buffer;
    try {
      buffer = await downloadPdfSafely(sourceUrl);
    } catch (dlErr) {
      return res.status(400).json({
        success: false,
        message: `Could not import paper: ${dlErr.message}`,
      });
    }

    if (!(await fs.access(uploadDir).then(() => true).catch(() => false))) {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const safeTitle = (title || 'paper')
      .replace(/[^a-z0-9\-_. ]/gi, '_')
      .trim()
      .slice(0, 80);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeTitle}.pdf`;
    filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const Paper = require('../models/Paper');
    const User = require('../models/User');

    const paper = await Paper.create({
      userId: req.user.id,
      title: (title || fileName.replace(/\.pdf$/i, '')).slice(0, 300),
      authors: authors
        ? Array.isArray(authors)
          ? authors
          : String(authors).split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      fileName,
      filePath,
      fileSize: buffer.length,
      status: 'uploaded',
      metadata: {
        doi: doi || undefined,
        publicationDate: year ? new Date(`${parseInt(year, 10)}-01-01`) : undefined,
        journal: venue || undefined,
      },
      topic: (topic || '').slice(0, 120),
    });

    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'usageStats.papersAnalyzed': 1 },
    }).catch(() => {});

    // Trigger analysis asynchronously so the import response returns quickly.
    const { performAnalysis } = require('./paperController');
    performAnalysis(paper, req.user.id).catch((e) =>
      console.error('Import analysis failed:', e.message || e)
    );

    return res.json({ success: true, message: 'Paper imported and queued for analysis', paper });
  } catch (error) {
    if (filePath) await fs.unlink(filePath).catch(() => {});
    console.error('Import external error:', error.message || error);
    return res.status(500).json({ success: false, message: 'Import failed' });
  }
};

module.exports = { searchExternal, importExternal };
