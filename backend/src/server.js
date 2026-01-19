/**
 * Server Entry Point
 * Starts the Express server and connects to MongoDB
 * Production-ready server configuration
 */

const app = require('./app');
const connectDB = require('./config/database');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB if a URI is provided (skip in local smoke tests if not configured)
if (process.env.MONGODB_URI) {
  connectDB();
} else {
  console.warn('MONGODB_URI not set — skipping DB connection (smoke-test mode)');
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Research Scholar Agent Backend Server
  📍 Environment: ${process.env.NODE_ENV || 'development'}
  🌐 Server running on port ${PORT}
  🔗 Health check: http://localhost:${PORT}/health
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});
