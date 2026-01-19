/**
 * Paper Controller
 * Handles research paper upload, retrieval, and management
 * Integrates with AI service for paper analysis
 * 
 * Automation Context: Automates the complete research paper
 * processing pipeline from upload to AI analysis
 */

const Paper = require('../models/Paper');
const Summary = require('../models/Summary');
const User = require('../models/User');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Helper: perform analysis for a paper record (internal use)
const performAnalysis = async (paper, userId) => {
  // Update status to processing
  paper.status = 'processing';
  await paper.save();

  try {
    const fileBuffer = await fs.readFile(paper.filePath);

    const aiResponse = await axios.post(
      `${process.env.AI_SERVICE_URL}/ai/analyze-paper`,
      {
        fileName: paper.fileName,
        fileContent: fileBuffer.toString('base64'),
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000,
      }
    );

    const analysisData = aiResponse.data;

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

    // Update usage stats safely
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
 * 
 * Automation: File upload triggers automatic metadata extraction
 * and queues paper for AI analysis
 */
const uploadPaper = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file',
      });
    }

    const { title, authors } = req.body;

    // Create paper record
    const paper = await Paper.create({
      userId: req.user.id,
      title: title || req.file.originalname.replace('.pdf', ''),
      authors: authors ? authors.split(',').map((a) => a.trim()) : [],
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'uploaded',
    });

    // Update user statistics
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'usageStats.papersAnalyzed': 1 },
    });

    res.status(201).json({
      success: true,
      paper,
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
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

    res.json({
      success: true,
      count: papers.length,
      papers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/papers/:id
 * @desc    Get single paper by ID
 * @access  Private
 */
const getPaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('userId', 'name email');

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    // Get associated summary if exists
    const summary = await Summary.findOne({ paperId: paper._id });

    res.json({
      success: true,
      paper: {
        ...paper.toObject(),
        summary: summary || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/papers/:id
 * @desc    Delete a paper and its associated data
 * @access  Private
 * 
 * Automation: Cascading delete removes paper, summary, and file
 */
const deletePaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    // Delete associated summary
    await Summary.deleteOne({ paperId: paper._id });

    // Delete file from filesystem
    try {
      await fs.unlink(paper.filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete paper record
    await Paper.deleteOne({ _id: paper._id });

    res.json({
      success: true,
      message: 'Paper deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/papers/:id/analyze
 * @desc    Trigger AI analysis for a paper
 * @access  Private
 * 
 * Automation: This is the core automation endpoint that:
 * 1. Sends paper to AI service
 * 2. Processes response
 * 3. Stores results in database
 * 4. Updates paper status
 * 
 * AI Service Integration Point
 */
const analyzePaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    // Use internal helper to perform the analysis
    try {
      const summary = await performAnalysis(paper, req.user.id);
      res.json({ success: true, message: 'Paper analyzed successfully', summary });
    } catch (aiError) {
      console.error('AI Service Error:', aiError.message || aiError);
      return res.status(500).json({ success: false, message: 'AI analysis failed' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/papers/search
 * @desc    Search papers by title, author, isbn/doi and year range
 * @access  Private
 */
const searchPapers = async (req, res, next) => {
  try {
    const { title, author, isbn, fromYear, toYear, lastNYears } = req.query;

    const query = { userId: req.user.id };

    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    if (author) {
      query.authors = { $regex: author, $options: 'i' };
    }

    if (isbn) {
      // search across metadata.doi or metadata.isbn if present
      query.$or = [
        { 'metadata.doi': { $regex: isbn, $options: 'i' } },
        { 'metadata.isbn': { $regex: isbn, $options: 'i' } },
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
      if (fromYear) {
        range.$gte = new Date(`${fromYear}-01-01`);
      }
      if (toYear) {
        range.$lte = new Date(`${toYear}-12-31`);
      }
      if (Object.keys(range).length > 0) {
        query['metadata.publicationDate'] = range;
      }
    }

    const papers = await Paper.find(query).sort({ createdAt: -1 }).populate('userId', 'name email');

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
