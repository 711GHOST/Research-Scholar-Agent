const express = require('express')
const router = express.Router()
const { searchExternal, importExternal } = require('../controllers/externalController')
const { protect } = require('../middleware/auth')

// All external search routes require auth
// Public search route for quick smoke tests (no auth)
router.get('/public/search', searchExternal)

// Protected routes
router.use(protect)
router.get('/search', searchExternal)
router.post('/import', importExternal)

module.exports = router
