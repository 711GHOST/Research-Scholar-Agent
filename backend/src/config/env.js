/**
 * Environment validation
 * Fails fast at startup if required configuration is missing or insecure.
 * Centralizes all environment access so the rest of the app never reads
 * process.env directly for security-critical values.
 */

const REQUIRED_IN_PRODUCTION = ['MONGODB_URI', 'JWT_SECRET'];

const isProduction = process.env.NODE_ENV === 'production';

function validateEnv() {
  const problems = [];

  // JWT secret must exist and be reasonably strong
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    problems.push('JWT_SECRET is not set');
  } else if (jwtSecret.length < 16) {
    problems.push('JWT_SECRET is too short (use at least 16 characters)');
  } else if (
    ['change', 'secret', 'your-production-jwt-secret-change-this'].some((w) =>
      jwtSecret.toLowerCase().includes(w)
    )
  ) {
    problems.push('JWT_SECRET looks like a placeholder — set a unique random value');
  }

  if (isProduction) {
    REQUIRED_IN_PRODUCTION.forEach((key) => {
      if (!process.env[key]) problems.push(`${key} is required in production`);
    });
  }

  if (problems.length > 0) {
    const message =
      'Invalid environment configuration:\n  - ' + problems.join('\n  - ');
    if (isProduction) {
      // Hard fail in production — never boot with insecure config
      throw new Error(message);
    }
    // In development, warn loudly but allow the dev server to run
    console.warn('\n⚠️  ' + message + '\n');
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiServiceSecret: process.env.AI_SERVICE_SECRET || '',
  semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
  // Comma-separated list of allowed CORS origins
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 25 * 1024 * 1024, // 25MB
};

module.exports = { config, validateEnv };
