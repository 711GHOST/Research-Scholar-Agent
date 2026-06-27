/**
 * Paper Routes
 * Defines endpoints for research paper management.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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

const uploadDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Never trust the client filename — generate a random, collision-free,
    // path-traversal-proof name and force a .pdf extension.
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${req.user.id}-${unique}.pdf`);
  },
});

// Only accept files that declare a PDF mimetype (content is re-verified in the
// controller via magic bytes).
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
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
