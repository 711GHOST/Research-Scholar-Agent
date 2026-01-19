/**
 * ChatHistory Model
 * Stores conversation history for the research chatbot
 * Enables context-aware responses based on user's papers and research domain
 * Part of the AI-powered conversational interface
 */

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    // Additional context for AI responses
    paperIds: [mongoose.Schema.Types.ObjectId], // Referenced papers
    topics: [String],
  },
});

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String, // User-defined or auto-generated session title
      default: 'New Chat',
    },
    messages: [chatMessageSchema],
    context: {
      // Context information for AI
      researchDomain: String,
      activePapers: [mongoose.Schema.Types.ObjectId], // Papers being discussed
      previousTopics: [String],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update updatedAt on message additions
chatHistorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for efficient queries
chatHistorySchema.index({ userId: 1, updatedAt: -1 });
chatHistorySchema.index({ sessionId: 1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
