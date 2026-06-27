/**
 * Notifications service
 * Sends OTP codes by email (nodemailer/SMTP) and SMS (Twilio, optional).
 * If a provider is not configured, returns { sent: false } so callers can fall
 * back to dev mode (returning the code in the response for local testing).
 */

const { config } = require('../config/env');

let mailer = null;
function getMailer() {
  if (mailer) return mailer;
  if (!config.smtp.host || !config.smtp.user) return null;
  // Lazy require so the dependency is only loaded when actually configured.
  const nodemailer = require('nodemailer');
  mailer = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return mailer;
}

const isEmailConfigured = () => Boolean(config.smtp.host && config.smtp.user);
const isSmsConfigured = () =>
  Boolean(config.twilio.accountSid && config.twilio.authToken && config.twilio.fromNumber);

async function sendEmailOtp(to, code) {
  const transport = getMailer();
  if (!transport) return { sent: false };
  await transport.sendMail({
    from: config.smtp.from,
    to,
    subject: `${config.appName} verification code`,
    text: `Your ${config.appName} verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your <strong>${config.appName}</strong> verification code is:</p>
           <p style="font-size:24px;letter-spacing:4px;font-weight:700">${code}</p>
           <p>It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
  });
  return { sent: true };
}

async function sendSmsOtp(to, code) {
  if (!isSmsConfigured()) return { sent: false };
  try {
    const twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
    await twilio.messages.create({
      body: `${config.appName} code: ${code} (expires in 10 min)`,
      from: config.twilio.fromNumber,
      to,
    });
    return { sent: true };
  } catch (e) {
    console.error('SMS send failed:', e.message);
    return { sent: false };
  }
}

module.exports = { sendEmailOtp, sendSmsOtp, isEmailConfigured, isSmsConfigured };
