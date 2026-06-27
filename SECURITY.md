# Security

## ⚠️ Action required: rotate exposed credentials

The committed-working-tree `.env` files previously contained **live** secrets in
plaintext. Even though they are gitignored, anything that has been on disk and
shared should be considered compromised. **Rotate these now:**

| Secret | Where | How to rotate |
| --- | --- | --- |
| MongoDB Atlas password | `backend/.env` → `MONGODB_URI` | Atlas → Database Access → edit user → reset password, then update the URI |
| Gemini API key | `ai-service/.env` → `GEMINI_API_KEY` | Google AI Studio → API keys → revoke & create new |
| OpenAI API key | `ai-service/.env` (commented) | platform.openai.com → API keys → revoke |
| Semantic Scholar key | both `.env` files | Semantic Scholar dashboard → regenerate |
| JWT secret | `backend/.env` → `JWT_SECRET` | Generate a new one: `openssl rand -hex 32` (invalidates existing logins) |

Never commit real `.env` files. Use the provided `.env.example` templates and
keep real values in your local `.env` (already gitignored) or your host's secret
manager.

## Hardening implemented in this codebase

**Backend (Express)**
- `helmet` security headers on every response.
- CORS restricted to an explicit allow-list (`FRONTEND_URL`, comma-separated).
- Rate limiting: global API limiter, strict auth limiter (anti credential
  stuffing), and a heavy limiter on AI/external endpoints.
- `express-mongo-sanitize` strips `$`/`.` keys to block NoSQL operator injection.
- JSON/body size limits; chat message length capped.
- Regex inputs in search are escaped (prevents regex injection / ReDoS).
- Startup config validation: refuses to boot in production with a missing/weak
  `JWT_SECRET`; the Mongo connection string is never logged.
- Uploads: random server-generated filenames (no path traversal) and real
  PDF magic-byte verification (mimetype alone is not trusted).

**External import (SSRF protection)**
- The previous unauthenticated `/api/external/public/search` proxy was removed.
- Imports only accept **open-access PDF** URLs and are downloaded through an
  SSRF-safe fetcher that:
  - allows only `http`/`https`, rejects embedded credentials,
  - resolves the host and blocks private/loopback/link-local/cloud-metadata IPs,
  - caps size, limits redirects, and verifies the response is actually a PDF.

**AI service (FastAPI)**
- Requires a shared `x-internal-secret` header from the backend (set
  `AI_SERVICE_SECRET`); it must never be exposed publicly.
- CORS restricted to the backend origin(s) — no wildcard-with-credentials.
- Validates base64, size, and PDF magic bytes before processing.
- Runs as a non-root user in Docker and is not published to the host in
  `docker-compose`.

## Reporting

For a real deployment, report vulnerabilities privately to the maintainer rather
than opening a public issue.
