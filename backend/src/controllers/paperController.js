/**
 * Paper Controller
 * Handles research paper upload, retrieval, and management.
 * Integrates with the AI service for paper analysis.
 */

const Paper = require('../models/Paper');
const Summary = require('../models/Summary');
const User = require('../models/User');
const fs = require('fs').promises;
const aiClient = require('../services/aiClient');
const { escapeRegex, isPdfBuffer } = require('../utils/security');
const { storePdf, getPdf, deletePdf } = require('../services/fileStore');

// Read a paper's PDF bytes from GridFS (preferred) or a legacy on-disk path.
const readPaperBuffer = async (paper) => {
  if (paper.fileId) return getPdf(paper.fileId);
  if (paper.filePath) return fs.readFile(paper.filePath);
  throw new Error('Paper has no stored file');
};

// Helper: perform analysis for a paper record (internal use)
const performAnalysis = async (paper, userId) => {
  paper.status = 'processing';
  await paper.save();

  try {
    const fileBuffer = await readPaperBuffer(paper);

    const analysisData = await aiClient.analyzePaper({
      fileName: paper.fileName,
      fileContent: fileBuffer.toString('base64'),
    });

    const summary = await Summary.findOneAndUpdate(
      { paperId: paper._id },
      {
        paperId: paper._id,
        userId: userId,
        sections: analysisData.sections || {},
        keywords: analysisData.keywords || [],
        topics: analysisData.topics || [],
        researchGaps: analysisData.researchGaps || [],
        researchQuestions: analysisData.researchQuestions || [],
        relatedWorkSuggestions: analysisData.relatedWorkSuggestions || [],
        processingTime: analysisData.processingTime || 0,
        processedAt: new Date(),
        aiModel: analysisData.aiModel || 'default',
      },
      { upsert: true, new: true }
    );

    paper.status = 'analyzed';
    if (analysisData.metadata) {
      paper.metadata = { ...paper.metadata, ...analysisData.metadata };
    }
    await paper.save();

    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'usageStats.totalAnalysisTime': analysisData.processingTime || 0 },
      });
    } catch (e) {
      console.warn('Failed to update user stats', e.message);
    }

    return summary;
  } catch (err) {
    paper.status = 'failed';
    await paper.save();
    console.error('performAnalysis error:', err.message || err);
    throw err;
  }
};

/**
 * @route   POST /api/papers/upload
 * @desc    Upload a research paper PDF
 * @access  Private
 */
const uploadPaper = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, message: 'Please upload a PDF file' });
    }

    // Verify the file is actually a PDF (mimetype alone is client-controlled).
    if (!isPdfBuffer(req.file.buffer)) {
      return res
        .status(400)
        .json({ success: false, message: 'Uploaded file is not a valid PDF' });
    }

    const { title, authors } = req.body;

    // Store the bytes in GridFS (MongoDB) — no disk required.
    const fileId = await storePdf(req.file.buffer, req.file.originalname);

    const paper = await Paper.create({
      userId: req.user.id,
      title: (title || req.file.originalname.replace(/\.pdf$/i, '')).slice(0, 300),
      authors: authors
        ? String(authors)
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
      fileName: req.file.originalname,
      fileId,
      fileSize: req.file.size,
      status: 'uploaded',
    });

    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'usageStats.papersAnalyzed': 1 },
    });

    res.status(201).json({ success: true, paper });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/papers
 * @desc    Get all papers for the logged-in user
 * @access  Private
 */
const getPapers = async (req, res, next) => {
  try {
    const papers = await Paper.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');

    res.json({ success: true, count: papers.length, papers });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/papers/:id
 * @desc    Get single paper by ID (with its summary)
 * @access  Private
 */
const getPaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('userId', 'name email');

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    const summary = await Summary.findOne({ paperId: paper._id });

    res.json({
      success: true,
      paper: { ...paper.toObject(), summary: summary || null },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/papers/:id
 * @desc    Delete a paper and its associated data
 * @access  Private
 */
const deletePaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    await Summary.deleteOne({ paperId: paper._id });

    // Remove the stored PDF (GridFS, or a legacy on-disk file).
    if (paper.fileId) {
      await deletePdf(paper.fileId);
    } else if (paper.filePath) {
      await fs.unlink(paper.filePath).catch((fileError) => {
        console.error('Error deleting file:', fileError.message);
      });
    }

    await Paper.deleteOne({ _id: paper._id });

    res.json({ success: true, message: 'Paper deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/papers/:id/analyze
 * @desc    Trigger AI analysis for a paper
 * @access  Private
 */
const analyzePaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    try {
      const summary = await performAnalysis(paper, req.user.id);
      res.json({ success: true, message: 'Paper analyzed successfully', summary });
    } catch (aiError) {
      console.error('AI Service Error:', aiError.message || aiError);
      return res
        .status(502)
        .json({ success: false, message: 'AI analysis failed. Please try again.' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/papers/search
 * @desc    Search the user's own papers by title, author, isbn/doi and year range
 * @access  Private
 */
const searchPapers = async (req, res, next) => {
  try {
    const { title, author, isbn, fromYear, toYear, lastNYears } = req.query;

    const query = { userId: req.user.id };

    if (title) query.title = { $regex: escapeRegex(title), $options: 'i' };
    if (author) query.authors = { $regex: escapeRegex(author), $options: 'i' };

    if (isbn) {
      const safe = escapeRegex(isbn);
      query.$or = [
        { 'metadata.doi': { $regex: safe, $options: 'i' } },
        { 'metadata.isbn': { $regex: safe, $options: 'i' } },
      ];
    }

    if (lastNYears) {
      const n = parseInt(lastNYears, 10);
      if (!isNaN(n)) {
        const since = new Date();
        since.setFullYear(since.getFullYear() - n);
        query['metadata.publicationDate'] = { $gte: since };
      }
    } else if (fromYear || toYear) {
      const range = {};
      if (fromYear) range.$gte = new Date(`${parseInt(fromYear, 10)}-01-01`);
      if (toYear) range.$lte = new Date(`${parseInt(toYear, 10)}-12-31`);
      if (Object.keys(range).length > 0) query['metadata.publicationDate'] = range;
    }

    const papers = await Paper.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');

    res.json({ success: true, count: papers.length, papers });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPaper,
  getPapers,
  getPaper,
  deletePaper,
  analyzePaper,
  searchPapers,
  performAnalysis,
};
