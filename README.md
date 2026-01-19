# Research Scholar Agent

An AI-powered research assistant for IIT Mandi scholars, postgraduate students, and researchers. This full-stack MERN application provides automated research paper analysis, intelligent summarization, research gap identification, and conversational AI assistance.

## 🎯 Problem Statement

Researchers and scholars face challenges in:
- **Time-consuming paper analysis**: Manually reading and analyzing multiple research papers
- **Research gap identification**: Difficulty identifying areas requiring further investigation
- **Context management**: Keeping track of multiple papers and their key insights
- **Knowledge extraction**: Extracting structured information from unstructured PDF documents

This system automates these processes using AI and NLP techniques, saving researchers significant time and providing intelligent insights.

## 🏗️ System Architecture

### Technology Stack

- **Frontend**: React.js with Material UI, React Router, Axios
- **Backend**: Node.js with Express.js, MongoDB, JWT authentication
- **AI Service**: Python with FastAPI, NLP libraries (NLTK, spaCy), PDF processing
- **Database**: MongoDB (Users, Papers, Summaries, ChatHistory collections)
- **Deployment**: Docker & Docker Compose

### Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend   │────────▶│  AI Service │
│   (React)   │◀────────│  (Node.js)  │◀────────│  (FastAPI)  │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │   MongoDB   │
                        └─────────────┘
```

## 🔄 Data Flow Diagram

### Paper Analysis Pipeline (Automation Flow)

```
1. User Uploads PDF
   │
   ▼
2. Backend Receives File
   │
   ▼
3. File Stored + Metadata Saved to MongoDB
   │
   ▼
4. User Triggers Analysis
   │
   ▼
5. Backend Sends PDF to AI Service
   │
   ▼
6. AI Service:
   ├─ PDF Text Extraction
   ├─ Section Identification
   ├─ NLP Processing (Keywords, Topics)
   ├─ AI Summarization
   ├─ Research Gap Identification
   ├─ Question Generation
   └─ Related Work Suggestions
   │
   ▼
7. Results Stored in MongoDB (Summary Collection)
   │
   ▼
8. Dashboard Updates Automatically
```

### Chatbot Interaction Flow

```
1. User Sends Message
   │
   ▼
2. Backend Receives Query
   │
   ▼
3. Backend Fetches User Context:
   ├─ Uploaded Papers
   ├─ Research Domain
   └─ Chat History
   │
   ▼
4. Backend Sends to AI Service
   │
   ▼
5. AI Service Generates Context-Aware Response
   │
   ▼
6. Response Stored in ChatHistory
   │
   ▼
7. Response Displayed to User
```

## 🤖 AI Techniques Used

### 1. **PDF Text Extraction**
- **Library**: PyPDF2, pdfplumber
- **Automation**: Automatically extracts text and structure from PDF files
- **Technique**: Multi-library approach for robust extraction

### 2. **Section Identification**
- **Technique**: Keyword-based pattern matching with heuristics
- **Automation**: Identifies paper sections (Abstract, Introduction, Methodology, etc.)
- **Future Enhancement**: ML-based section detection

### 3. **NLP Processing**
- **Libraries**: NLTK
- **Techniques**:
  - Tokenization (word, sentence)
  - Part-of-Speech (POS) tagging
  - Stopword removal
  - Keyword extraction (frequency-based with POS filtering)
  - Topic extraction (noun phrase identification)
- **Automation**: Automatically extracts keywords and topics from papers

### 4. **Text Summarization**
- **Technique**: Extractive summarization (sentence extraction)
- **Automation**: Generates section-wise summaries
- **Future Enhancement**: Abstractive summarization using LLMs (BERT, GPT)

### 5. **Research Gap Identification**
- **Technique**: Pattern matching for limitation/future work indicators
- **Automation**: Automatically identifies potential research gaps
- **Indicators**: "future work", "limitations", "further research", etc.

### 6. **Research Question Generation**
- **Technique**: Template-based generation using extracted keywords and topics
- **Automation**: Generates relevant research questions

### 7. **Conversational AI (Chatbot)**
- **Technique**: Rule-based responses with context awareness
- **Automation**: Provides context-aware research assistance
- **Context**: User papers, research domain, chat history
- **Future Enhancement**: LLM integration (OpenAI, Anthropic)

## 🔐 Authentication & Authorization

- **JWT-based authentication**: Secure token-based authentication
- **Password hashing**: bcrypt with salt rounds
- **Protected routes**: Middleware-based route protection
- **User roles**: Student, Research Scholar, Faculty (role-based access control)

## 📊 Core Features

### 1. User Authentication
- Sign Up / Sign In / Sign Out
- JWT-based session management
- Role-based access control

### 2. Research Paper Management
- Upload PDF papers
- Store metadata (title, authors, upload date)
- View and delete papers
- Re-run analysis

### 3. AI-Powered Analysis
- PDF text extraction
- Section-wise summarization
- Keyword and topic extraction
- Research gap identification
- Research question generation
- Related work suggestions

### 4. Research Chatbot
- Context-aware conversational interface
- Access to user's uploaded papers
- Research domain awareness
- Chat history storage

### 5. Dashboard & Analytics
- Profile information
- Uploaded papers list
- Usage statistics (papers analyzed, time saved)
- Past summaries and insights

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.11+)
- MongoDB (or use Docker)
- Docker & Docker Compose (optional, for containerized deployment)

### Installation (Local Development)

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Research_Scholar_Agent
```

#### 2. Backend Setup

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration
npm run dev
```

#### 3. AI Service Setup

```bash
cd ai-service
pip install -r requirements.txt
python app.py
```

#### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

#### 5. MongoDB Setup

Ensure MongoDB is running on `localhost:27017` or update the connection string in `.env`.

### Installation (Docker)

```bash
docker-compose up -d
```

This will start:
- MongoDB on port 27017
- Backend API on port 5000
- AI Service on port 8000
- Frontend on port 3000

## 📁 Project Structure

```
research-scholar-agent/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── Profile.jsx
│   │   │   │   ├── Papers.jsx
│   │   │   │   ├── Chatbot.jsx
│   │   │   │   └── Analytics.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── paperController.js
│   │   │   └── chatController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── paperRoutes.js
│   │   │   └── chatRoutes.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Paper.js
│   │   │   ├── Summary.js
│   │   │   └── ChatHistory.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── utils/
│   │   │   └── generateToken.js
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── Dockerfile
│
├── ai-service/
│   ├── services/
│   │   ├── pdf_extractor.py
│   │   ├── nlp_processor.py
│   │   └── ai_analyzer.py
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

## 🔗 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Papers

- `POST /api/papers/upload` - Upload research paper (protected)
- `GET /api/papers` - Get all user's papers (protected)
- `GET /api/papers/:id` - Get paper details (protected)
- `DELETE /api/papers/:id` - Delete paper (protected)
- `POST /api/papers/:id/analyze` - Trigger AI analysis (protected)

### Chat

- `POST /api/chat` - Send message to chatbot (protected)
- `GET /api/chat/sessions` - Get chat sessions (protected)
- `GET /api/chat/sessions/:sessionId` - Get chat session (protected)
- `DELETE /api/chat/sessions/:sessionId` - Delete chat session (protected)

### AI Service (Internal)

- `POST /ai/analyze-paper` - Analyze paper (called by backend)
- `POST /ai/chat` - Generate chat response (called by backend)
- `POST /ai/suggest-gaps` - Suggest research gaps

## 🔄 Automation Explanation

### Why Automation is Needed

1. **Time Efficiency**: Manual paper analysis takes hours; automation reduces this to minutes
2. **Consistency**: Automated analysis provides consistent results
3. **Scalability**: Can process multiple papers simultaneously
4. **Intelligence**: AI extracts insights that might be missed manually
5. **Accessibility**: Makes research analysis accessible to all users

### Automation Points

1. **PDF Processing**: Automatic text extraction and structure identification
2. **NLP Pipeline**: Automatic keyword/topic extraction without manual tagging
3. **Summarization**: Automatic section-wise summaries
4. **Gap Identification**: Automatic detection of research gaps
5. **Question Generation**: Automatic generation of research questions
6. **Chatbot**: Automatic context-aware responses

### Integration Points

- **Backend ↔ AI Service**: REST API calls for paper analysis and chat
- **Frontend ↔ Backend**: REST API for all user operations
- **Backend ↔ MongoDB**: Mongoose ODM for data persistence

## ⚠️ Limitations & Ethics

### Current Limitations

1. **AI Capabilities**: Uses rule-based and simple NLP techniques; advanced LLM features require API integration
2. **PDF Quality**: Extraction quality depends on PDF structure and formatting
3. **Section Detection**: Heuristic-based; may miss sections in non-standard formats
4. **Summarization**: Extractive summarization; abstractive summarization requires LLM APIs
5. **Related Work**: Currently generates mock suggestions; real suggestions require academic database APIs

### Ethical Considerations

1. **Data Privacy**: User papers are stored securely; consider encryption for sensitive research
2. **Academic Integrity**: Generated summaries and insights should be used as aids, not replacements for reading
3. **Citation**: Do NOT use AI-generated related work as real citations without verification
4. **Bias**: AI models may have biases; users should verify insights
5. **Attribution**: Always attribute AI-generated content appropriately

## 🔮 Future Scope

### Short-term Enhancements

1. **LLM Integration**: Integrate OpenAI/Anthropic APIs for advanced summarization
2. **Real Related Work**: Integration with Semantic Scholar, arXiv APIs
3. **Export Features**: Export summaries as PDF/Word documents
4. **Search Functionality**: Full-text search across papers
5. **Collaboration**: Multi-user paper sharing and collaboration

### Long-term Enhancements

1. **Advanced NLP**: BERT-based embeddings, topic modeling (LDA, BERTopic)
2. **Citation Network**: Build citation graphs and identify citation patterns
3. **Visual Analytics**: Interactive visualizations of research trends
4. **Mobile App**: React Native mobile application
5. **Multi-language Support**: Support for papers in multiple languages
6. **Real-time Collaboration**: WebSocket-based real-time features

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Paper upload and metadata storage
- [ ] PDF text extraction
- [ ] AI analysis pipeline
- [ ] Chatbot interactions
- [ ] Dashboard analytics
- [ ] Paper deletion and cleanup

### API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📝 License

This project is developed for academic evaluation in "Introduction to AI and Automation" course.

## 👥 Authors

Developed for IIT Mandi scholars and researchers.

## 🙏 Acknowledgments

- IIT Mandi for providing the academic context
- Open source libraries: React, Express, FastAPI, NLTK, PyPDF2
- Material UI for UI components

---

**Note**: This system is designed for academic use. For production deployment, ensure proper security measures, API key management, and scalability considerations.
