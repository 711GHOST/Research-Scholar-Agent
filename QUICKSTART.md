# Quick Start Guide

## Prerequisites

- Node.js (v18 or higher)
- Python (v3.11 or higher)
- MongoDB (running locally or use Docker)
- npm or yarn

## Local Development Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration:
# - MONGODB_URI=mongodb://localhost:27017/research_scholar_agent
# - JWT_SECRET=your-secret-key
# - AI_SERVICE_URL=http://localhost:8000
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. AI Service Setup

```bash
cd ai-service
pip install -r requirements.txt
# Download NLTK data (if needed)
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('averaged_perceptron_tagger')"
python app.py
# Or: uvicorn app:app --reload --port 8000
```

AI Service will run on `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

### 4. MongoDB Setup

Ensure MongoDB is running:
- If installed locally: `mongod`
- Or use Docker: `docker run -d -p 27017:27017 mongo:7.0`

## Docker Setup (Recommended)

```bash
# From project root
docker-compose up -d
```

This starts all services:
- MongoDB: `localhost:27017`
- Backend: `localhost:5000`
- AI Service: `localhost:8000`
- Frontend: `localhost:3000`

## Testing the Application

1. Open `http://localhost:3000` in your browser
2. Register a new account
3. Login
4. Upload a PDF research paper
5. Click "Analyze" on the uploaded paper
6. View results in the dashboard
7. Try the chatbot feature

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/research_scholar_agent
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### AI Service
No environment variables required for basic setup.
For production with LLM APIs, add:
- OPENAI_API_KEY (optional)
- ANTHROPIC_API_KEY (optional)

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in .env
- Verify MongoDB port (default: 27017)

### AI Service Not Responding
- Check if Python dependencies are installed
- Verify NLTK data is downloaded
- Check port 8000 is available

### Frontend Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (v18+)

### File Upload Issues
- Ensure `backend/uploads` directory exists
- Check file size limits (default: 50MB)
- Verify file is PDF format

## API Testing

Use curl or Postman to test endpoints:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role":"Student"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get user (replace TOKEN with JWT from login)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Development Tips

1. **Hot Reload**: Backend uses nodemon, frontend uses Vite - both support hot reload
2. **Logs**: Check console logs for debugging
3. **Database**: Use MongoDB Compass for database inspection
4. **API Docs**: Check AI service docs at `http://localhost:8000/docs` (FastAPI auto-docs)

## Next Steps

- Read the main README.md for detailed documentation
- Explore the codebase structure
- Customize AI processing logic
- Add additional features
