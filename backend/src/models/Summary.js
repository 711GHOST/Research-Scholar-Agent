/**
 * Summary Model
 * Stores AI-generated analysis results for research papers
 * Includes summaries, keywords, research gaps, and related work suggestions
 * This model demonstrates the AI automation pipeline integration
 */

const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      unique: true, // One summary per paper
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // AI-Generated Content (Automation Output)
    sections: {
      abstract: {
        type: String,
        default: '',
      },
      introduction: {
        type: String,
        default: '',
      },
      methodology: {
        type: String,
        default: '',
      },
      results: {
        type: String,
        default: '',
      },
      discussion: {
        type: String,
        default: '',
      },
      conclusion: {
        type: String,
        default: '',
      },
    },
    // NLP Extraction Results
    keywords: [
      {
        word: String,
        frequency: Number,
        importance: Number, // 0-1 score
      },
    ],
    topics: [
      {
        topic: String,
        confidence: Number,
      },
    ],
    // AI Research Analysis
    researchGaps: [
      {
        gap: String,
        reasoning: String,
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
        },
      },
    ],
    researchQuestions: [
      {
        question: String,
        category: String,
      },
    ],
    relatedWorkSuggestions: [
      {
        title: String,
        authors: [String],
        reason: String, // Why this paper is relevant
      },
    ],
    // Processing metadata
    processingTime: {
      type: Number, // in seconds
      default: 0,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    aiModel: {
      type: String,
      default: 'default', // Track which AI model was used
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
summarySchema.index({ userId: 1, processedAt: -1 });
summarySchema.index({ paperId: 1 });

module.exports = mongoose.model('Summary', summarySchema);
