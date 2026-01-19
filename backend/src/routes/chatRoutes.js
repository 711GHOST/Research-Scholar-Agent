/**
 * Chat Routes
 * Defines endpoints for research chatbot interactions
 */

const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getSessions,
  getSession,
  deleteSession,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Routes
router.post('/', sendMessage);
router.get('/sessions', getSessions);
router.get('/sessions/:sessionId', getSession);
router.delete('/sessions/:sessionId', deleteSession);

module.exports = router;
