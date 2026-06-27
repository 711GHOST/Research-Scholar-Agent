/**
 * External paper search & import.
 *
 * search  -> query Semantic Scholar; if it is rate limited / unavailable (a very
 *            common situation for keyless access), transparently fall back to
 *            arXiv so the feature keeps working. Both sources are normalized to
 *            one shape, including a direct open-access `pdfUrl` when available.
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
const ARXIV_URL = 'http://export.arxiv.org/api/query';

const uploadDir = path.join(__dirname, '../../uploads');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Track whether the configured key has been rejected so we stop sending it
// (and only warn once) for the lifetime of the process.
let apiKeyRejected = false;

/* ----------------------- Semantic Scholar ----------------------- */

async function semanticScholarSearch(params) {
  const attempt = (useKey) => {
    const headers = {};
    if (useKey && config.semanticScholarApiKey && !apiKeyRejected) {
      headers['x-api-key'] = config.semanticScholarApiKey;
    }
    return axios.get(SS_SEARCH_URL, { params, headers, timeout: 15000 });
  };

  try {
    return await attempt(true);
  } catch (err) {
    const status = err.response?.status;
    if ((status === 401 || status === 403) && config.semanticScholarApiKey && !apiKeyRejected) {
      apiKeyRejected = true;
      console.warn(`SEMANTIC_SCHOLAR_API_KEY rejected (HTTP ${status}); using keyless access.`);
      return attempt(false);
    }
    if (status === 429) {
      await sleep(1200);
      return attempt(false);
    }
    throw err;
  }
}

function mapSemanticScholar(items) {
  return (items || []).map((p) => {
    const pdfUrl = p.openAccessPdf?.url || null;
    return {
      source: 'semantic_scholar',
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      url: p.url,
      pdfUrl,
      venue: p.venue,
      abstract: p.abstract,
      doi: p.externalIds?.DOI || null,
      authors: (p.authors || []).map((a) => (typeof a === 'string' ? a : a.name)),
      isOpenAccess: Boolean(p.isOpenAccess || pdfUrl),
      canImport: Boolean(pdfUrl),
    };
  });
}

/* ----------------------------- arXiv ---------------------------- */

const decodeEntities = (s = '') =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const collapse = (s = '') => decodeEntities(s).replace(/\s+/g, ' ').trim();

function parseArxiv(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const total = (() => {
    const m = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
    return m ? parseInt(m[1], 10) : entries.length;
  })();

  const results = entries.map((entry) => {
    const pick = (re) => {
      const m = entry.match(re);
      return m ? collapse(m[1]) : '';
    };
    const absId = pick(/<id>([\s\S]*?)<\/id>/); // http://arxiv.org/abs/XXXX vN
    const title = pick(/<title>([\s\S]*?)<\/title>/);
    const abstract = pick(/<summary>([\s\S]*?)<\/summary>/);
    const published = pick(/<published>([\s\S]*?)<\/published>/);
    const year = published ? parseInt(published.slice(0, 4), 10) : null;
    const authors = (entry.match(/<name>([\s\S]*?)<\/name>/g) || []).map((a) =>
      collapse(a.replace(/<\/?name>/g, ''))
    );

    // PDF link: prefer the explicit pdf <link>, else derive from the abs id.
    let pdfUrl = null;
    const pdfLink = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/);
    if (pdfLink) pdfUrl = pdfLink[1];
    else if (absId.includes('/abs/')) pdfUrl = absId.replace('/abs/', '/pdf/');
    if (pdfUrl) pdfUrl = pdfUrl.replace(/^http:/, 'https:');

    const doiMatch = entry.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/);

    return {
      source: 'arxiv',
      paperId: absId,
      title,
      year,
      url: absId.replace(/^http:/, 'https:'),
      pdfUrl,
      venue: 'arXiv',
      abstract,
      doi: doiMatch ? collapse(doiMatch[1]) : null,
      authors,
      isOpenAccess: true, // everything on arXiv is open access
      canImport: Boolean(pdfUrl),
    };
  });

  return { results, total };
}

async function arxivSearch(query, limit, offset) {
  const resp = await axios.get(ARXIV_URL, {
    params: {
      search_query: `all:${query}`,
      start: offset,
      max_results: limit,
      sortBy: 'relevance',
    },
    timeout: 15000,
    responseType: 'text',
  });
  return parseArxiv(resp.data);
}

/* --------------------------- Handler ---------------------------- */

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
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const lim = Math.min(Number(limit) || 10, 100);
    const off = Math.max(Number(offset) || 0, 0);

    let results = [];
    let total = 0;
    let source = 'semantic_scholar';

    // 1) Try Semantic Scholar; fall back to arXiv on rate-limit/auth/server errors.
    try {
      const resp = await semanticScholarSearch({
        query,
        fields: SS_FIELDS,
        limit: lim,
        offset: off,
      });
      results = mapSemanticScholar(resp.data?.data);
      total = resp.data?.total || results.length;
    } catch (ssErr) {
      const status = ssErr.response?.status;
      const recoverable =
        ssErr.code || [429, 401, 403, 500, 502, 503, 504].includes(status);
      if (!recoverable) throw ssErr;
      console.warn(`Semantic Scholar unavailable (${status || ssErr.code}); falling back to arXiv.`);
      const arx = await arxivSearch(query, lim, off);
      results = arx.results;
      total = arx.total;
      source = 'arxiv';
    }

    // 2) If SS returned nothing, also try arXiv (broader open-access coverage).
    if (results.length === 0 && source === 'semantic_scholar') {
      try {
        const arx = await arxivSearch(query, lim, off);
        if (arx.results.length) {
          results = arx.results;
          total = arx.total;
          source = 'arxiv';
        }
      } catch (e) {
        /* keep the empty SS result */
      }
    }

    // 3) Unified client-side filters.
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
      results = results.filter((p) => p.isOpenAccess);
    }

    if (sort === 'year_desc') results.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === 'year_asc') results.sort((a, b) => (a.year || 0) - (b.year || 0));

    return res.json({ success: true, source, total, count: results.length, results });
  } catch (error) {
    const status = error.response?.status;
    console.error('External search error:', status || error.message);
    if (status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Search is rate limited right now. Please wait a few seconds and try again.',
      });
    }
    return res.status(502).json({ success: false, message: 'External search failed. Please try again.' });
  }
};

/* --------------------------- Import ----------------------------- */

const importExternal = async (req, res) => {
  let filePath = null;
  try {
    const { title, authors, pdfUrl, url, doi, year, venue, topic } = req.body;

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
