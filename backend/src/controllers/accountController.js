/**
 * Account Controller
 * Profile editing and email/phone verification via OTP.
 */

const { validationResult } = require('express-validator');
const User = require('../models/User');
const { requestOtp, verifyOtp } = require('../services/otpService');

const EMAIL_RE = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const PHONE_RE = /^\+?[1-9]\d{7,14}$/; // E.164-ish

/**
 * @route PUT /api/auth/profile
 * Update editable profile fields. Changing the phone number clears its
 * verified flag (it must be re-verified). Email changes go through OTP only.
 */
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, phone, role, profile } = req.body;

    if (typeof name === 'string' && name.trim()) user.name = name.trim().slice(0, 120);
    if (role && ['Student', 'Research Scholar', 'Faculty'].includes(role)) user.role = role;

    if (phone !== undefined) {
      const trimmed = String(phone).trim();
      if (trimmed && !PHONE_RE.test(trimmed)) {
        return res
          .status(400)
          .json({ success: false, message: 'Enter a valid phone number in international format' });
      }
      if (trimmed !== user.phone) {
        user.phone = trimmed;
        user.phoneVerified = false; // must re-verify after change
      }
    }

    if (profile && typeof profile === 'object') {
      user.profile = {
        ...user.profile.toObject?.() ?? user.profile,
        institution: profile.institution ?? user.profile.institution,
        department: profile.department ?? user.profile.department,
        researchDomain: profile.researchDomain ?? user.profile.researchDomain,
        bio: (profile.bio ?? user.profile.bio ?? '').toString().slice(0, 500),
      };
    }

    await user.save();
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/auth/otp/request
 * Body: { channel: 'email'|'phone', target }
 * Sends a one-time code to verify a new/current email or phone.
 */
const requestVerification = async (req, res, next) => {
  try {
    const { channel } = req.body;
    let { target } = req.body;

    if (!['email', 'phone'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    }

    target = String(target || '').trim();
    if (channel === 'email') {
      target = target.toLowerCase();
      if (!EMAIL_RE.test(target)) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address' });
      }
      const taken = await User.findOne({ email: target, _id: { $ne: req.user.id } });
      if (taken) {
        return res.status(409).json({ success: false, message: 'That email is already in use' });
      }
    } else {
      if (!PHONE_RE.test(target)) {
        return res
          .status(400)
          .json({ success: false, message: 'Enter a valid phone number in international format' });
      }
    }

    const result = await requestOtp(req.user.id, channel, target);
    res.json({
      success: true,
      message: `Verification code sent`,
      delivery: result.delivery,
      // devCode is only present when no provider is configured (dev/testing)
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * @route POST /api/auth/otp/verify
 * Body: { channel, code }
 * Confirms the code and applies the verified email/phone to the account.
 */
const confirmVerification = async (req, res, next) => {
  try {
    const { channel, code } = req.body;
    if (!['email', 'phone'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    }
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    const target = await verifyOtp(req.user.id, channel, code);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (channel === 'email') {
      // Final uniqueness guard against a race during the OTP window
      const taken = await User.findOne({ email: target, _id: { $ne: user._id } });
      if (taken) {
        return res.status(409).json({ success: false, message: 'That email is already in use' });
      }
      user.email = target;
      user.emailVerified = true;
    } else {
      user.phone = target;
      user.phoneVerified = true;
    }

    await user.save();
    res.json({ success: true, message: 'Verified successfully', user: user.toPublicJSON() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { updateProfile, requestVerification, confirmVerification };
