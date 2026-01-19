/**
 * Chat Controller
 * Handles research chatbot interactions
 * Integrates with AI service for context-aware responses
 * 
 * Automation Context: Automates conversational AI responses
 * using user's research context (papers, domain, history)
 */

const ChatHistory = require('../models/ChatHistory');
const Paper = require('../models/Paper');
const User = require('../models/User');
const axios = require('axios');

// Simple UUID generator (alternative to uuid package)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * @route   POST /api/chat
 * @desc    Send a message to the research chatbot
 * @access  Private
 * 
 * Automation: Processes user queries with context from uploaded papers
 * and provides AI-generated research assistance
 */
const sendMessage = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Get or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await ChatHistory.findOne({
        sessionId,
        userId: req.user.id,
      });
    }

    if (!chatSession) {
      // Create new session
      const newSessionId = generateUUID();
      chatSession = await ChatHistory.create({
        userId: req.user.id,
        sessionId: newSessionId,
        messages: [],
        context: {
          researchDomain: req.user.profile?.researchDomain || '',
          activePapers: [],
          previousTopics: [],
        },
      });
    }

    // Get user's papers for context (include metadata)
    const userPapers = await Paper.find({ userId: req.user.id })
      .select('title authors metadata')
      .limit(10);

    // Attach any available AI-generated summaries for richer context
    const Summary = require('../models/Summary');
    const paperDetails = await Promise.all(
      userPapers.map(async (p) => {
        const summary = await Summary.findOne({ paperId: p._id }).lean();
        // build a short textual summary from sections if available
        let summaryText = '';
        if (summary && summary.sections) {
          summaryText = Object.values(summary.sections)
            .filter(Boolean)
            .join('\n\n')
            .slice(0, 8000); // limit length
        } else if (p.metadata && p.metadata.abstract) {
          summaryText = p.metadata.abstract.slice(0, 8000);
        }

        return {
          id: p._id.toString(),
          title: p.title,
          authors: p.authors,
          metadata: p.metadata || {},
          summary: summary || null,
          summaryText,
        };
      })
    );

    // Add user message to session
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    try {
      // Call AI service for chat response
      // This integrates with the Python AI service for conversational AI
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL}/ai/chat`,
        {
          message: message,
          context: {
            userId: req.user.id.toString(),
            researchDomain: req.user.profile?.researchDomain || '',
            papers: paperDetails.map((p) => ({
              id: p.id,
              title: p.title,
              authors: p.authors,
              keywords: p.summary?.keywords || p.metadata?.keywords || [],
              summaryText: p.summaryText,
            })),
            chatHistory: chatSession.messages.slice(-10), // Last 10 messages for context
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 1 minute timeout
        }
      );

      const assistantMessage = aiResponse.data.response || 'I apologize, but I could not generate a response.';

      // Add assistant response to session
      chatSession.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date(),
      });

      // Update context if provided by AI
      if (aiResponse.data.context) {
        chatSession.context = {
          ...chatSession.context,
          ...aiResponse.data.context,
        };
      }

      await chatSession.save();

      res.json({
        success: true,
        sessionId: chatSession.sessionId,
        message: assistantMessage,
        messages: chatSession.messages,
      });
    } catch (aiError) {
      console.error('AI Chat Service Error:', aiError.message);

      // Fallback response
      const fallbackMessage =
        'I apologize, but the AI service is currently unavailable. Please try again later.';

      chatSession.messages.push({
        role: 'assistant',
        content: fallbackMessage,
        timestamp: new Date(),
      });

      await chatSession.save();

      res.status(500).json({
        success: false,
        message: fallbackMessage,
        sessionId: chatSession.sessionId,
        messages: chatSession.messages,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/chat/sessions
 * @desc    Get all chat sessions for the user
 * @access  Private
 */
const getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatHistory.find({ userId: req.user.id })
      .select('sessionId title createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .limit(50);

    // Format sessions to include message count and preview
    const formattedSessions = sessions.map((session) => ({
      sessionId: session.sessionId,
      title: session.title,
      messageCount: session.messages.length,
      lastMessage: session.messages[session.messages.length - 1]?.content || '',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));

    res.json({
      success: true,
      sessions: formattedSessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/chat/sessions/:sessionId
 * @desc    Get a specific chat session with all messages
 * @access  Private
 */
const getSession = async (req, res, next) => {
  try {
    const session = await ChatHistory.findOne({
      sessionId: req.params.sessionId,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/chat/sessions/:sessionId
 * @desc    Delete a chat session
 * @access  Private
 */
const deleteSession = async (req, res, next) => {
  try {
    const session = await ChatHistory.findOne({
      sessionId: req.params.sessionId,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    await ChatHistory.deleteOne({ _id: session._id });

    res.json({
      success: true,
      message: 'Chat session deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getSessions,
  getSession,
  deleteSession,
};
