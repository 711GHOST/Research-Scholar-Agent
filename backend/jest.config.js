module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // mongodb-memory-server can be slow to download the first time
  globalSetup: undefined,
};
