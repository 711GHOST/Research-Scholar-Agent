/**
 * Express Application Configuration
 * Main application setup with middleware and routes.
 * Security-hardened: helmet, CORS allow-list, rate limiting, payload limits,
 * and NoSQL-injection sanitization.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const { config } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

// Import routes
const authRoutes = require('./routes/authRoutes');
const paperRoutes = require('./routes/paperRoutes');
const chatRoutes = require('./routes/chatRoutes');
const externalRoutes = require('./routes/externalRoutes');

const app = express();

// Trust the first proxy (needed for correct client IPs behind nginx/Render)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS allow-list (supports multiple comma-separated origins)
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);
      if (config.frontendUrls.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parsers with sane limits (PDFs are uploaded via multipart, not JSON)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Strip keys containing "$" or "." to neutralize NoSQL operator injection
app.use(mongoSanitize());

// Global rate limit on the API surface
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Research Scholar Agent API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/external', externalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler (must be last middleware)
app.use(errorHandler);

module.exports = app;
