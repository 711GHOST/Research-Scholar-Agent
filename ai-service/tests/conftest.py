"""
Pytest configuration for the AI service.

Forces offline mode (no Gemini key) and disables the internal-secret check by
default so the suite runs without any external services or credentials. These
env vars are set BEFORE the app/config modules are imported.
"""

import os
import sys

# Ensure the service package root is importable when running `pytest` from here.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# load_dotenv(override=False) will not overwrite values that already exist, so
# setting them here guarantees a deterministic, offline test environment.
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("AI_SERVICE_SECRET", "")
os.environ.setdefault("DEBUG", "False")
