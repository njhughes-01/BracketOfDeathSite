/**
 * Jest Configuration for Integration Tests in CI
 *
 * This configuration runs integration tests against a MongoDB service
 * provided by GitHub Actions (no Docker management).
 * Use: npm run test:integration:ci
 */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests/integration"],
    testMatch: ["**/*.integration.test.ts"],
    setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.ts"],
    // No globalSetup/globalTeardown - CI handles MongoDB service
    testTimeout: 60000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    restoreMocks: true,
    // Ensure Jest can find packages installed at root node_modules
    modulePaths: ["<rootDir>/node_modules"],
    moduleNameMapper: {
        // Force mongoose to the version in the root node_modules to avoid multiple instances
        "^mongoose$": "<rootDir>/node_modules/mongoose",
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
