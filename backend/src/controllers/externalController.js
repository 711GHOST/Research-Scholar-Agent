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
const crypto = require('crypto');

const { config } = require('../config/env');
const { downloadPdfSafely } = require('../utils/security');
const { storePdf } = require('../services/fileStore');

const SS_SEARCH_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';
const SS_FIELDS =
  'paperId,title,authors,year,url,venue,abstract,isOpenAccess,openAccessPdf,externalIds';
const ARXIV_URL = 'http://export.arxiv.org/api/query';

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

/* ------------------- Normalized source fetchers ------------------ */

async function ssFetch(query, srcOffset, count) {
  const resp = await semanticScholarSearch({
    query,
    fields: SS_FIELDS,
    limit: Math.min(count, 100),
    offset: srcOffset,
  });
  return { items: mapSemanticScholar(resp.data?.data), total: resp.data?.total || 0 };
}

async function arxivFetch(query, srcOffset, count) {
  const { results, total } = await arxivSearch(query, Math.min(count, 100), srcOffset);
  return { items: results, total };
}

/**
 * Collect exactly `pageSize` filtered results for one page using cursor-based
 * pagination. When filters (open-access / year) would drop items, we over-fetch
 * from the source to back-fill the page, and return `nextOffset` — the source
 * offset where the *next* page should resume — so paging never skips or repeats.
 */
async function collectPage(fetcher, query, startOffset, pageSize, passes, needsBackfill) {
  const kept = [];
  let cursor = startOffset;
  let total = 0;
  const CHUNK = Math.min(needsBackfill ? pageSize * 3 : pageSize, 100);

  for (let iter = 0; iter < 6; iter++) {
    const { items, total: t } = await fetcher(query, cursor, CHUNK);
    if (t) total = t;
    for (let i = 0; i < items.length; i++) {
      if (passes(items[i])) kept.push({ item: items[i], srcIdx: cursor + i });
    }
    cursor += items.length;
    if (items.length < CHUNK) break; // source exhausted
    if (kept.length > pageSize) break; // have a full page + lookahead
  }

  const results = kept.slice(0, pageSize).map((k) => k.item);
  const nextOffset = kept.length > pageSize ? kept[pageSize].srcIdx : cursor;
  const hasMore = kept.length > pageSize || (total > 0 && cursor < total);
  return { results, total, nextOffset, hasMore };
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
      limit = 10,
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

    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 25);
    const startOffset = Math.max(Number(offset) || 0, 0);
    const wantOpenAccess = openAccess === 'true' || openAccess === true;

    // Build a single filter predicate used during collection.
    const sinceYear = lastNYears ? new Date().getFullYear() - parseInt(lastNYears, 10) + 1 : null;
    const from = !lastNYears && fromYear ? parseInt(fromYear, 10) : null;
    const to = !lastNYears && toYear ? parseInt(toYear, 10) : null;
    const passes = (p) => {
      if (sinceYear != null && !(p.year && p.year >= sinceYear)) return false;
      if (from != null && !(p.year && p.year >= from)) return false;
      if (to != null && !(p.year && p.year <= to)) return false;
      if (wantOpenAccess && !p.isOpenAccess) return false;
      return true;
    };
    const needsBackfill = wantOpenAccess || sinceYear != null || from != null || to != null;

    let out;
    let source = 'semantic_scholar';
    try {
      out = await collectPage(ssFetch, query, startOffset, pageSize, passes, needsBackfill);
      // If Semantic Scholar has nothing on the first page, try arXiv instead.
      if (out.results.length === 0 && startOffset === 0) {
        try {
          const arx = await collectPage(arxivFetch, query, startOffset, pageSize, passes, needsBackfill);
          if (arx.results.length) {
            out = arx;
            source = 'arxiv';
          }
        } catch (e) {
          /* keep empty SS result */
        }
      }
    } catch (ssErr) {
      const status = ssErr.response?.status;
      const recoverable = ssErr.code || [429, 401, 403, 500, 502, 503, 504].includes(status);
      if (!recoverable) throw ssErr;
      console.warn(`Semantic Scholar unavailable (${status || ssErr.code}); falling back to arXiv.`);
      out = await collectPage(arxivFetch, query, startOffset, pageSize, passes, needsBackfill);
      source = 'arxiv';
    }

    const results = out.results;
    if (sort === 'year_desc') results.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === 'year_asc') results.sort((a, b) => (a.year || 0) - (b.year || 0));

    return res.json({
      success: true,
      source,
      total: out.total,
      count: results.length,
      results,
      offset: startOffset,
      nextOffset: out.nextOffset,
      hasMore: out.hasMore,
      pageSize,
    });
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

    const safeTitle = (title || 'paper')
      .replace(/[^a-z0-9\-_. ]/gi, '_')
      .trim()
      .slice(0, 80);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeTitle}.pdf`;

    // Store the downloaded PDF in GridFS (MongoDB) — no disk required.
    const fileId = await storePdf(buffer, fileName);

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
      fileId,
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
    console.error('Import external error:', error.message || error);
    return res.status(500).json({ success: false, message: 'Import failed' });
  }
};

module.exports = { searchExternal, importExternal };
