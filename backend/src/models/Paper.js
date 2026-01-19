/**
 * Paper Model
 * Stores research paper metadata and file information
 * Links papers to users and their analysis results
 */

const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Index for faster queries by user
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authors: [
      {
        type: String,
        trim: true,
      },
    ],
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'analyzed', 'failed'],
      default: 'uploaded',
    },
    metadata: {
      // Extracted metadata from PDF
      abstract: String,
      keywords: [String],
      publicationDate: Date,
      journal: String,
      doi: String,
    },
    // Topic label for grouping imported/search results (e.g., "generative ai")
    topic: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
paperSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Paper', paperSchema);
