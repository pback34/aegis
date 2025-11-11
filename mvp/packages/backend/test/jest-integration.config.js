module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage-integration',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration.ts'],
  testTimeout: 30000, // 30 seconds for integration tests
};
