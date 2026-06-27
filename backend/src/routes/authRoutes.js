/**
 * Authentication Routes
 * Defines endpoints for user authentication.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const {
  updateProfile,
  requestVerification,
  confirmVerification,
} = require('../controllers/accountController');
const { protect } = require('../middleware/auth');
const { authLimiter, heavyLimiter } = require('../middleware/rateLimiters');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password')
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),
  body('role')
    .optional()
    .isIn(['Student', 'Research Scholar', 'Faculty'])
    .withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const profileValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('role').optional().isIn(['Student', 'Research Scholar', 'Faculty']),
];

// Routes (auth endpoints are rate limited against brute-force attacks)
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/me', protect, getMe);

// Account management
router.put('/profile', protect, profileValidation, updateProfile);
router.post('/otp/request', protect, heavyLimiter, requestVerification);
router.post('/otp/verify', protect, heavyLimiter, confirmVerification);

module.exports = router;

