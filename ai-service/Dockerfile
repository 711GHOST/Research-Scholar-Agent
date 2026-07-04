FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed by some PDF/NLP libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data into a shared, world-readable path so the non-root
# runtime user can read it.
ENV NLTK_DATA=/usr/share/nltk_data
RUN python -c "import nltk; [nltk.download(r, download_dir='/usr/share/nltk_data') for r in ['punkt','punkt_tab','stopwords','averaged_perceptron_tagger','averaged_perceptron_tagger_eng']]"

COPY . .

# Run as a non-root user
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Bind to the platform-provided $PORT (Render/Northflank), default 8000 locally.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
