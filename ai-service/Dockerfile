FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed by some PDF/NLP libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data (both legacy and current resource names)
RUN python -c "import nltk; [nltk.download(r) for r in ['punkt','punkt_tab','stopwords','averaged_perceptron_tagger','averaged_perceptron_tagger_eng']]"

COPY . .

# Run as a non-root user
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
