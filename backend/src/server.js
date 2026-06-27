/**
 * Server Entry Point
 * Loads and validates environment, connects to MongoDB, and starts Express.
 */

// Load environment variables BEFORE anything else reads process.env
require('dotenv').config();

const { config, validateEnv } = require('./config/env');

// Fail fast on insecure / missing configuration
validateEnv();

const app = require('./app');
const connectDB = require('./config/database');

const PORT = config.port;

// Connect to MongoDB if a URI is provided (skip in local smoke tests if not configured)
if (config.mongoUri) {
  connectDB();
} else {
  console.warn('MONGODB_URI not set — skipping DB connection (smoke-test mode)');
}

const server = app.listen(PORT, () => {
  console.log(`
  🚀 Research Scholar Agent Backend Server
  📍 Environment: ${config.nodeEnv}
  🌐 Server running on port ${PORT}
  🔗 Health check: http://localhost:${PORT}/health
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});
