/**
 * Generate JWT Token
 * Utility function to create JSON Web Tokens for authentication.
 * Tokens include user ID and expiration time.
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

module.exports = generateToken;
