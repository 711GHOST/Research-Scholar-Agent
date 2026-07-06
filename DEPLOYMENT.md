# Deployment Guide

The app has **three deployable pieces** plus a database:

| Piece | Tech | Where |
| --- | --- | --- |
| **Database** | MongoDB | MongoDB Atlas (free M0) |
| **AI service** | Python / FastAPI | Render or Northflank (Docker) |
| **Backend API** | Node / Express | Render or Northflank (Docker) |
| **Frontend** | React / Vite | Vercel (static) |

Data flow: **Browser → Vercel (frontend) → Backend API → { MongoDB, AI service }**.
The AI service is never called by the browser directly; the backend calls it with
a shared secret.

---

## 0. Prerequisites

1. Push the repo to GitHub (all three folders in one repo is fine).
2. **Rotate the secrets in `SECURITY.md`** - never deploy with the ones currently
   in your local `.env` files.
3. Have ready: a MongoDB Atlas cluster, a Gemini API key (optional), and - if you
   want live email OTP / real payments - SMTP and Razorpay credentials.

Generate two strong secrets now (you'll paste them into the dashboards):

```bash
# JWT secret
openssl rand -hex 32
# Shared backend<->AI secret
openssl rand -hex 24
```

---

## 1. MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com.
2. **Database Access** → add a user with a strong password.
3. **Network Access** → add `0.0.0.0/0` (or your host's egress IPs).
4. **Connect → Drivers** → copy the connection string, e.g.
   `mongodb+srv://user:pass@cluster.xxxx.mongodb.net/research_scholar_agent`
   (add the DB name `/research_scholar_agent` before the `?`).

---

## 2A. Backend + AI on **Render** (Blueprint - easiest)

The repo includes `render.yaml`, which provisions both services and links the
shared secret automatically. No persistent disk is needed - PDFs are stored in
MongoDB (GridFS), so this works on the **free tier**.

1. Render → **New → Blueprint** → connect this repo → **Apply**.
2. It creates `rsa-ai-service` and `rsa-backend`. After the first build, open each
   service and fill the values marked `sync: false`:
   - **rsa-backend**: `MONGODB_URI`, `FRONTEND_URL` (your Vercel URL, added in step 3),
     `SEMANTIC_SCHOLAR_API_KEY`, and (optional) SMTP / Razorpay keys.
   - **rsa-ai-service**: `GEMINI_API_KEY` (optional).
3. Confirm the cross-URLs match what Render assigned:
   - `rsa-backend` → `AI_SERVICE_URL` = the AI service's URL.
   - `rsa-ai-service` → `AI_ALLOWED_ORIGINS` = the backend's URL.
4. Redeploy both. Check `https://<backend>/health` returns `{ "success": true }`.

### 2A-alt. Render without the Blueprint (manual)

Create two **Web Services** from the same repo, **Runtime: Docker**:

- **AI service** - Root `ai-service`, Dockerfile `ai-service/Dockerfile`.
  Env: `AI_SERVICE_SECRET`, `GEMINI_API_KEY` (optional), `AI_ALLOWED_ORIGINS=<backend URL>`.
- **Backend** - Root `backend`, Dockerfile `backend/Dockerfile`. No disk needed
  (PDFs go to MongoDB/GridFS). Env: see the table at the bottom. Set
  `AI_SERVICE_SECRET` to the *same* value as the AI service.

> Free-tier services **sleep after 15 min idle**; the first request after that takes
> ~30–60s to wake. Fine for a demo; use a paid instance to avoid cold starts.

---

## 2B. Backend + AI on **Northflank**

Northflank gives you real internal networking, so the AI service can stay private.

1. Create a **Project**.
2. **Add Service → Deployment → from Git repo**, build type **Dockerfile**:
   - **ai-service**: Dockerfile `/ai-service/Dockerfile`, context `/ai-service`.
     Port `8000` (or read `$PORT`). Add env `AI_SERVICE_SECRET`, `GEMINI_API_KEY`,
     `AI_ALLOWED_ORIGINS`. Keep it **internal** (no public ingress needed).
   - **backend**: Dockerfile `/backend/Dockerfile`, context `/backend`. Expose a
     **public port** `5000`. No volume needed (PDFs go to MongoDB/GridFS).
3. Set the backend's `AI_SERVICE_URL` to the AI service's **internal address**
   (e.g. `http://ai-service:8000`) and use the same `AI_SERVICE_SECRET` on both.
4. Set the rest of the backend env (table below), then deploy. Verify `/health`.

---

## 3. Frontend on **Vercel**

1. Vercel → **New Project** → import the repo.
2. **Root Directory: `frontend`**. Vercel auto-detects Vite
   (build `npm run build`, output `dist`; `vercel.json` handles SPA routing).
3. **Environment Variables** → add:
   ```
   VITE_API_URL = https://<your-backend-host>/api
   ```
   (the backend URL from step 2, with `/api` appended).
4. Deploy. Note the resulting URL, e.g. `https://research-scholar-agent.vercel.app`.
5. **Go back to the backend** and set `FRONTEND_URL` to that Vercel URL (this is the
   CORS allow-list), then redeploy the backend.

> Preview deployments get their own URLs. To allow them through CORS, set
> `FRONTEND_URL` to a comma-separated list, or add the specific preview domain.

---

## 4. Final wiring checklist

| Backend env | Value |
| --- | --- |
| `AI_SERVICE_URL` | the AI service URL/internal address |
| `FRONTEND_URL` | your Vercel URL(s), comma-separated |
| Frontend env `VITE_API_URL` | `https://<backend>/api` |
| Both services `AI_SERVICE_SECRET` | identical value |
| AI service `AI_ALLOWED_ORIGINS` | the backend URL |

Smoke test after deploy:

```bash
curl https://<backend>/health
# then register + search from the deployed frontend UI
```

---

## 5. Production gotchas (read these)

- **Uploaded PDFs are stored in MongoDB (GridFS)** - no persistent disk needed, so
  this runs on Render's free tier. Files survive redeploys and re-analysis works.
  (Atlas free tier = 512 MB; plenty for a demo. For heavy use, upgrade Atlas or
  switch the file store to S3/Backblaze.)
- **OTP delivery.** With `OTP_DEV_MODE=false` and no SMTP configured, email
  verification returns 503. Set `SMTP_*` (Gmail app password, SendGrid, Resend,
  etc.) to send real codes - or keep `OTP_DEV_MODE=true` only for a demo (it
  returns the code in the response, which is insecure for real users).
- **Payments.** Without `RAZORPAY_KEY_ID/SECRET`, subscriptions run in **mock mode**
  (simulated success). Add real keys + set the webhook to
  `https://<backend>/api/billing/webhook` for live billing.
- **Gemini key format.** A standard key looks like `AIza...` (from aistudio.google.com).
  If yours is rejected, the AI service falls back to offline mode (still works,
  lower-quality summaries). Leaving `GEMINI_API_KEY` blank forces fast offline mode.
- **"Analysis failed" with `502` / `stream has been aborted` in the backend logs.**
  This means the AI service was unreachable/restarting mid-request. It's fixed in
  code (the analyze/chat endpoints now run in a threadpool so the `/health` check
  stays responsive, and PDF parsing uses the lighter `pypdf`). If you still see it:
  redeploy the **AI service** after pulling these changes; on the very first request
  after idle, the free-tier service cold-starts (~30–60s) - the backend now retries
  automatically, so just try once more.
- **Secrets.** Set every secret in the platform dashboard - never commit `.env`.
- **Atlas IP allow-list** must include your host (or `0.0.0.0/0`).

---

## Environment variable reference

**Backend** (`backend/.env.example` has the full list):
`NODE_ENV=production`, `PORT` (auto), `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRE`,
`AI_SERVICE_URL`, `AI_SERVICE_SECRET`, `SEMANTIC_SCHOLAR_API_KEY`, `FRONTEND_URL`,
`OTP_DEV_MODE`, `SMTP_*`, `RAZORPAY_*`.

**AI service** (`ai-service/.env.example`):
`PORT` (auto), `GEMINI_API_KEY`, `AI_SERVICE_SECRET`, `AI_ALLOWED_ORIGINS`, `DEBUG=False`.

**Frontend**: `VITE_API_URL`.
