/**
 * Rate limiters
 * Protects against brute-force (auth), abuse of expensive AI endpoints,
 * and runaway external imports.
 */

const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

// During tests we don't want limiters interfering with assertions.
const factor = isTest ? 1000 : 1;

const standardOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
};

// Global limiter applied to every API route
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300 * factor,
  ...standardOptions,
});

// Strict limiter for authentication (login/register) to stop credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20 * factor,
  ...standardOptions,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
  },
});

// Limiter for expensive AI / external-network operations
const heavyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40 * factor,
  ...standardOptions,
});

module.exports = { apiLimiter, authLimiter, heavyLimiter };
