"""
Configuration for the AI Service.

The Gemini key is optional: when it is absent the service runs in a
deterministic "offline" mode (extractive summaries + heuristic analysis) so the
app still works end-to-end without external API calls or cost. This also makes
the service testable in CI without secrets.
"""

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SEMANTIC_SCHOLAR_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY")

# Shared secret the backend must present in the `x-internal-secret` header.
# If empty, the header check is skipped (development convenience only).
AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "")

# Allowed CORS origins (the backend). Never use "*" with credentials.
AI_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("AI_ALLOWED_ORIGINS", "http://localhost:5000").split(",")
    if o.strip()
]

PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# True when we can call Gemini; otherwise the analyzer degrades gracefully.
USE_GEMINI = bool(GEMINI_API_KEY)
