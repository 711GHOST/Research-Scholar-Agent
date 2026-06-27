const express = require('express');
const router = express.Router();
const {
  getPlans,
  checkout,
  verifyAndActivate,
  cancel,
  webhook,
} = require('../controllers/billingController');
const { protect } = require('../middleware/auth');
const { heavyLimiter } = require('../middleware/rateLimiters');

// Webhook is called by Razorpay (no user auth) and verified by signature.
router.post('/webhook', webhook);

// All other billing routes require authentication.
router.use(protect);

router.get('/plans', getPlans);
router.post('/checkout', heavyLimiter, checkout);
router.post('/verify', heavyLimiter, verifyAndActivate);
router.post('/cancel', cancel);

module.exports = router;
