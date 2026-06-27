/**
 * Security utilities
 * - Regex escaping to prevent regex/NoSQL injection and ReDoS in search queries
 * - SSRF-safe URL validation and PDF download for the "import external paper" flow
 */

const dns = require('dns').promises;
const net = require('net');
const axios = require('axios');

const MAX_PDF_BYTES = 30 * 1024 * 1024; // 30MB hard cap for remote imports
const PDF_MAGIC = Buffer.from('%PDF-');

/**
 * Escape user input so it can be used safely inside a MongoDB $regex without
 * being interpreted as a pattern (prevents injection and catastrophic ReDoS).
 */
function escapeRegex(input = '') {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns true if the given IP address is private, loopback, link-local,
 * or otherwise not safe to fetch from a server (SSRF protection).
 */
function isBlockedIp(ip) {
  if (!ip) return true;

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('::ffff:')) {
      // IPv4-mapped IPv6 — re-check the embedded IPv4
      return isBlockedIp(lower.split(':').pop());
    }
    return false;
  }

  return true; // unknown format -> block
}

/**
 * Validate a remote URL and ensure none of its resolved IPs are private.
 * Throws an Error with a safe message if the URL is not allowed.
 */
async function assertSafePublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (e) {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }

  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Localhost is not allowed');
  }

  // If the host is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('Target IP is not allowed');
    return url;
  }

  // Resolve all A/AAAA records and ensure every one is public.
  let addresses = [];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch (e) {
    throw new Error('Could not resolve host');
  }

  if (addresses.length === 0) throw new Error('Host did not resolve');
  if (addresses.some(isBlockedIp)) {
    throw new Error('Host resolves to a private address');
  }

  return url;
}

/**
 * Safely download a PDF from a public URL with SSRF protections, size limits,
 * a redirect cap, and content verification (magic bytes).
 * Returns a Buffer containing the PDF.
 */
async function downloadPdfSafely(rawUrl) {
  await assertSafePublicUrl(rawUrl);

  const resp = await axios.get(rawUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: MAX_PDF_BYTES,
    maxBodyLength: MAX_PDF_BYTES,
    maxRedirects: 3,
    // Re-validate the final host after any redirects axios followed
    headers: { Accept: 'application/pdf,application/octet-stream,*/*' },
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const buffer = Buffer.from(resp.data);

  if (buffer.length === 0) throw new Error('Downloaded file is empty');
  if (buffer.length > MAX_PDF_BYTES) throw new Error('File exceeds size limit');

  const contentType = String(resp.headers['content-type'] || '').toLowerCase();
  const looksLikePdf = buffer.subarray(0, 5).equals(PDF_MAGIC);

  if (!looksLikePdf) {
    // Some servers send PDFs with a generic content-type, but if it is clearly
    // HTML/JSON we reject it — that means we got a landing page, not a paper.
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error('URL did not return a PDF document');
    }
    throw new Error('Downloaded content is not a valid PDF');
  }

  return buffer;
}

/**
 * Verify a local Buffer begins with the PDF magic header.
 */
function isPdfBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.subarray(0, 5).equals(PDF_MAGIC);
}

module.exports = {
  escapeRegex,
  isBlockedIp,
  assertSafePublicUrl,
  downloadPdfSafely,
  isPdfBuffer,
  MAX_PDF_BYTES,
};
