// Runs before the test framework and before any app module is required.
// Provides a deterministic, secure-enough config so config/env validation and
// JWT signing work without touching the real .env.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-which-is-long-enough-1234567890';
process.env.JWT_EXPIRE = '1h';
process.env.AI_SERVICE_URL = 'http://localhost:9999';
process.env.AI_SERVICE_SECRET = '';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.SEMANTIC_SCHOLAR_API_KEY = '';
