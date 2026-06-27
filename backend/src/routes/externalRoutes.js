const express = require('express');
const router = express.Router();
const { searchExternal, importExternal } = require('../controllers/externalController');
const { protect } = require('../middleware/auth');
const { heavyLimiter } = require('../middleware/rateLimiters');

// All external routes require authentication. The previous unauthenticated
// "/public/search" proxy was removed — it let anonymous clients use this server
// as an open proxy to the Semantic Scholar API.
router.use(protect);

router.get('/search', heavyLimiter, searchExternal);
router.post('/import', heavyLimiter, importExternal);

module.exports = router;
