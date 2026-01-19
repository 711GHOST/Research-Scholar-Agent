/**
 * Paper Routes
 * Defines endpoints for research paper management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  uploadPaper,
  getPapers,
  getPaper,
  deletePaper,
  analyzePaper,
  searchPapers,
} = require('../controllers/paperController');
const { protect } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-userId-originalname
    const uniqueSuffix = `${Date.now()}-${req.user.id}-${file.originalname}`;
    cb(null, uniqueSuffix);
  },
});

// File filter - only accept PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: fileFilter,
});

// All routes require authentication
router.use(protect);

// Routes
router.post('/upload', upload.single('file'), uploadPaper);
router.get('/search', searchPapers);
router.get('/', getPapers);
router.get('/:id', getPaper);
router.delete('/:id', deletePaper);
router.post('/:id/analyze', analyzePaper);

module.exports = router;
