/**
 * Payments service (Razorpay)
 * Creates orders and verifies payment signatures. When Razorpay keys are not
 * configured the service runs in MOCK mode so the subscription flow is fully
 * demoable locally without real credentials or charges.
 */

const crypto = require('crypto');
const { config } = require('../config/env');
const { PLANS } = require('../config/plans');

const isConfigured = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);

let client = null;
function getClient() {
  if (client) return client;
  const Razorpay = require('razorpay');
  client = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
  return client;
}

/**
 * Create a payment order for a paid plan.
 * Returns { mock, orderId, amount, currency, keyId }.
 */
async function createOrder(planId, userId) {
  const plan = PLANS[planId];
  if (!plan) {
    const err = new Error('Unknown plan');
    err.statusCode = 400;
    throw err;
  }
  if (plan.price <= 0) {
    const err = new Error('This plan is free — no payment required');
    err.statusCode = 400;
    throw err;
  }

  if (!isConfigured()) {
    // Mock order — the frontend detects mock:true and simulates checkout.
    return {
      mock: true,
      orderId: `mock_order_${crypto.randomBytes(8).toString('hex')}`,
      amount: plan.price,
      currency: plan.currency,
      keyId: 'mock',
    };
  }

  const order = await getClient().orders.create({
    amount: plan.price,
    currency: plan.currency,
    receipt: `rcpt_${userId}_${Date.now()}`,
    notes: { userId: String(userId), plan: planId },
  });

  return {
    mock: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config.razorpay.keyId,
  };
}

/**
 * Verify a Razorpay payment signature (orderId|paymentId HMAC-SHA256).
 * In mock mode, any order id starting with "mock_order_" is accepted.
 */
function verifyPayment({ orderId, paymentId, signature }) {
  if (!isConfigured()) {
    return typeof orderId === 'string' && orderId.startsWith('mock_order_');
  }
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify a Razorpay webhook signature against the raw request body.
 */
function verifyWebhook(rawBody, signature) {
  if (!config.razorpay.webhookSecret || !rawBody || !signature) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { isConfigured, createOrder, verifyPayment, verifyWebhook };
