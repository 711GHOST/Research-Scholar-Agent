const http = require('http');
const https = require('https');

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const u = new URL(url);
    const options = {
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };
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
  try {
    console.log('GET /health');
    const h = await fetch('http://localhost:5000/health');
    console.log(h.status, h.body);

    console.log('\nPOST /api/auth/login');
    const payload = JSON.stringify({ email: 'smoke+test@example.com', password: 'Test1234' });
    const login = await fetch('http://localhost:5000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    console.log(login.status, login.body);

    let token = null;
    try { token = JSON.parse(login.body).token } catch(e){}

    console.log('\nGET /api/external/search (unauthenticated)');
    const s1 = await fetch('http://localhost:5000/api/external/search?query=machine+learning');
    console.log(s1.status, s1.body.slice(0, 800));

    if (token) {
      console.log('\nGET /api/external/search (authenticated)');
      const s2 = await fetch('http://localhost:5000/api/external/search?query=machine+learning', { headers: { Authorization: 'Bearer ' + token } });
      console.log(s2.status, s2.body.slice(0, 800));
    } else {
      console.log('No token available; skipping authenticated call');
    }
  } catch (e) {
    console.error('Error', e);
  }
})();
