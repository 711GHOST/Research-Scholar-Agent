/**
 * OTP service
 * Generates, stores (hashed), and verifies short-lived one-time codes used to
 * verify a user's email or phone. Includes resend throttling and attempt caps.
 */

const crypto = require('crypto');
const Otp = require('../models/Otp');
const { config } = require('../config/env');
const { sendEmailOtp, sendSmsOtp } = require('./notifications');

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 45 * 1000; // 45 seconds between sends
const MAX_ATTEMPTS = 5;

const hashCode = (code) =>
  crypto.createHmac('sha256', config.jwtSecret || 'pepper').update(code).digest('hex');

const generateCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

/**
 * Create and deliver an OTP. Returns metadata describing delivery; in dev mode
 * (no provider configured) the code itself is returned so it can be tested.
 */
async function requestOtp(userId, channel, target) {
  // Throttle resends
  const existing = await Otp.findOne({ userId, channel }).sort({ createdAt: -1 });
  if (existing && Date.now() - new Date(existing.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - new Date(existing.createdAt).getTime())) / 1000
    );
    const err = new Error(`Please wait ${wait}s before requesting another code`);
    err.statusCode = 429;
    throw err;
  }

  const code = generateCode();
  await Otp.deleteMany({ userId, channel });
  await Otp.create({
    userId,
    channel,
    target,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  // Try to deliver via a real provider
  const result =
    channel === 'email' ? await sendEmailOtp(target, code) : await sendSmsOtp(target, code);

  if (result.sent) {
    return { delivery: channel, devCode: undefined };
  }

  // No provider configured — dev mode returns the code for local testing.
  if (config.otpDevMode) {
    console.log(`[OTP dev] ${channel} code for ${target}: ${code}`);
    return { delivery: 'dev', devCode: code };
  }

  const err = new Error(
    channel === 'email'
      ? 'Email delivery is not configured on the server'
      : 'SMS delivery is not configured on the server'
  );
  err.statusCode = 503;
  throw err;
}

/**
 * Verify a submitted code. On success returns the target that was verified and
 * consumes the OTP. Throws with statusCode on failure.
 */
async function verifyOtp(userId, channel, code) {
  const otp = await Otp.findOne({ userId, channel });
  if (!otp || new Date(otp.expiresAt).getTime() < Date.now()) {
    const err = new Error('Code expired or not found. Request a new one.');
    err.statusCode = 400;
    throw err;
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otp._id });
    const err = new Error('Too many attempts. Request a new code.');
    err.statusCode = 429;
    throw err;
  }

  if (otp.codeHash !== hashCode(String(code || ''))) {
    otp.attempts += 1;
    await otp.save();
    const err = new Error('Invalid code');
    err.statusCode = 400;
    throw err;
  }

  const target = otp.target;
  await Otp.deleteOne({ _id: otp._id });
  return target;
}

module.exports = { requestOtp, verifyOtp };
