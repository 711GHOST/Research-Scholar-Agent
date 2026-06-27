/**
 * Minimal smoke test against a running backend (http://localhost:5000).
 * Registers a throwaway user, logs in, and exercises the authenticated
 * external search endpoint. The old unauthenticated /public/search route was
 * removed for security, so a token is now required.
 */
const http = require('http');
const https = require('https');

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const u = new URL(url);
    const options = { method: opts.method || 'GET', headers: opts.headers || {} };
    const req = lib.request(u, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

(async () => {
  const base = 'http://localhost:5000';
  const headersJson = { 'Content-Type': 'application/json' };
  try {
    console.log('GET /health');
    const h = await fetch(`${base}/health`);
    console.log(h.status, h.body);

    const email = `smoke+${Date.now()}@example.com`;
    const creds = JSON.stringify({ name: 'Smoke', email, password: 'Test1234' });

    console.log('\nPOST /api/auth/register');
    const reg = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: headersJson, body: creds });
    console.log(reg.status, reg.body.slice(0, 200));

    let token = null;
    try { token = JSON.parse(reg.body).token; } catch (e) {}

    if (token) {
      console.log('\nGET /api/external/search (authenticated)');
      const s = await fetch(`${base}/api/external/search?title=machine+learning&openAccess=true`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      console.log(s.status, s.body.slice(0, 800));
    } else {
      console.log('No token obtained; skipping authenticated calls');
    }
  } catch (e) {
    console.error('Error', e);
  }
})();
