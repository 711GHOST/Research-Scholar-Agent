/**
 * AI Service client
 * Centralizes calls from the backend to the Python AI microservice.
 * Adds a shared-secret header so the AI service can reject requests that do
 * not originate from this backend (the AI service must never be public).
 */

const axios = require('axios');
const { config } = require('../config/env');

function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (config.aiServiceSecret) {
    headers['x-internal-secret'] = config.aiServiceSecret;
  }
  return headers;
}

const aiClient = axios.create({
  baseURL: config.aiServiceUrl,
  // base64-encoded PDFs can be large; allow generous body sizes for this
  // trusted internal hop only.
  maxBodyLength: 80 * 1024 * 1024,
  maxContentLength: 80 * 1024 * 1024,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry transient failures. On free-tier hosts the AI service can be cold
// (waking up returns 502/503) or briefly drop the connection, so one or two
// spaced retries make analysis reliable without changing behavior on success.
function isTransient(err) {
  const status = err.response?.status;
  if ([502, 503, 504].includes(status)) return true;
  if (!err.response) return true; // network error / connection reset / timeout
  return /aborted|ECONNRESET|socket hang up|ETIMEDOUT|ECONNREFUSED/i.test(err.message || '');
}

async function withRetry(fn, { retries = 2, delayMs = 5000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === retries) throw err;
      console.warn(
        `AI service call failed (${err.response?.status || err.message}); retrying in ${delayMs}ms…`
      );
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

async function analyzePaper(payload) {
  const { data } = await withRetry(() =>
    aiClient.post('/ai/analyze-paper', payload, {
      headers: buildHeaders(),
      timeout: 300000,
    })
  );
  return data;
}

async function chat(payload) {
  const { data } = await withRetry(
    () =>
      aiClient.post('/ai/chat', payload, {
        headers: buildHeaders(),
        timeout: 60000,
      }),
    { retries: 1, delayMs: 4000 }
  );
  return data;
}

module.exports = { analyzePaper, chat };
