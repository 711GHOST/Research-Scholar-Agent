/**
 * Billing Controller
 * Subscription plans, checkout, payment verification, and cancellation.
 * Uses Razorpay (or a built-in mock mode when keys are not configured).
 */

const User = require('../models/User');
const { PLANS, PUBLIC_PLANS } = require('../config/plans');
const payments = require('../services/payments');

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * @route GET /api/billing/plans
 */
const getPlans = async (req, res) => {
  res.json({
    success: true,
    plans: PUBLIC_PLANS,
    subscription: req.user.subscription,
    // Tells the frontend whether to open the real Razorpay widget or simulate.
    paymentsConfigured: payments.isConfigured(),
  });
};

/**
 * @route POST /api/billing/checkout
 * Body: { plan }
 */
const checkout = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Unknown plan' });
    }
    const order = await payments.createOrder(plan, req.user.id);
    res.json({ success: true, plan, ...order });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * @route POST /api/billing/verify
 * Body: { plan, orderId, paymentId, signature }
 * Verifies payment and activates the subscription.
 */
const verifyAndActivate = async (req, res, next) => {
  try {
    const { plan, orderId, paymentId, signature } = req.body;
    if (!PLANS[plan] || plan === 'free') {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const ok = payments.verifyPayment({ orderId, paymentId, signature });
    if (!ok) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.subscription = {
      plan,
      status: 'active',
      provider: payments.isConfigured() ? 'razorpay' : 'mock',
      providerRef: paymentId || orderId,
      currentPeriodEnd: new Date(Date.now() + PERIOD_MS),
    };
    await user.save();

    res.json({ success: true, message: `Subscribed to ${PLANS[plan].name}`, user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/billing/cancel
 * Downgrades the user to the free plan at once (no proration in this demo).
 */
const cancel = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.subscription = {
      plan: 'free',
      status: 'active',
      provider: '',
      providerRef: '',
      currentPeriodEnd: undefined,
    };
    await user.save();
    res.json({ success: true, message: 'Subscription cancelled', user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/billing/webhook
 * Razorpay webhook receiver (raw body verified). Best-effort sync.
 */
const webhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const raw = req.rawBody;
    if (!payments.verifyWebhook(raw, signature)) {
      return res.status(400).json({ success: false });
    }
    // Real deployments would update subscription state from the event here.
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false });
  }
};

module.exports = { getPlans, checkout, verifyAndActivate, cancel, webhook };
