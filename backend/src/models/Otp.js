/**
 * OTP Model
 * Short-lived one-time passcodes for verifying email / phone changes.
 * Codes are stored hashed, expire automatically (TTL index), and limit attempts.
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channel: { type: String, enum: ['email', 'phone'], required: true },
    // The address/number being verified (may differ from the current one)
    target: { type: String, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete documents once expiresAt passes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// One active OTP per user+channel
otpSchema.index({ userId: 1, channel: 1 });

module.exports = mongoose.model('Otp', otpSchema);
