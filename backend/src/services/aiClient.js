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

async function analyzePaper(payload) {
  const { data } = await aiClient.post('/ai/analyze-paper', payload, {
    headers: buildHeaders(),
    timeout: 300000,
  });
  return data;
}

async function chat(payload) {
  const { data } = await aiClient.post('/ai/chat', payload, {
    headers: buildHeaders(),
    timeout: 60000,
  });
  return data;
}

module.exports = { analyzePaper, chat };
