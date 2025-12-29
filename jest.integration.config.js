/**
 * Jest Configuration for Integration Tests
 *
 * This configuration runs integration tests against a real MongoDB instance.
 * Use: npm run test:integration
 */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests/integration"],
    testMatch: ["**/*.integration.test.ts"],
    setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.ts"],
    globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
    globalTeardown: "<rootDir>/tests/integration/globalTeardown.ts",
    testTimeout: 60000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    restoreMocks: true,
    moduleNameMapper: {
        "^mongoose$": "<rootDir>/src/backend/node_modules/mongoose",
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@/models/(.*)$": "<rootDir>/src/models/$1",
        "^@/routes/(.*)$": "<rootDir>/src/routes/$1",
        "^@/middleware/(.*)$": "<rootDir>/src/middleware/$1",
        "^@/utils/(.*)$": "<rootDir>/src/utils/$1",
        "^@/types/(.*)$": "<rootDir>/src/types/$1",
        "^@/config/(.*)$": "<rootDir>/src/config/$1",
        "^@/services/(.*)$": "<rootDir>/src/services/$1",
    },
};
