module.exports = {
  clearMocks: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@actions/core$': '<rootDir>/__mocks__/@actions/core.ts',
    '^@actions/github$': '<rootDir>/__mocks__/@actions/github.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          types: ['jest', 'node']
        }
      }
    ]
  },
  verbose: true
}
