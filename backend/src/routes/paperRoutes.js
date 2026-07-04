/**
 * Paper Routes
 * Defines endpoints for research paper management.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  uploadPaper,
  getPapers,
  getPaper,
  deletePaper,
  analyzePaper,
  searchPapers,
} = require('../controllers/paperController');
const { protect } = require('../middleware/auth');
const { heavyLimiter } = require('../middleware/rateLimiters');
const { config } = require('../config/env');

// Keep the upload in memory; the controller verifies it and streams it into
// GridFS (MongoDB), so no writable disk is required in production.
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter,
});

// Multer errors should return clean 400s rather than crash the request
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large'
          : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

// All routes require authentication
router.use(protect);

router.post('/upload', handleUpload, uploadPaper);
router.get('/search', searchPapers);
router.get('/', getPapers);
router.get('/:id', getPaper);
router.delete('/:id', deletePaper);
router.post('/:id/analyze', heavyLimiter, analyzePaper);

module.exports = router;
