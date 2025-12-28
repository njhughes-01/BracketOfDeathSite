/**
 * Integration Test Setup
 * Connects to a real MongoDB instance for testing.
 */
import mongoose from "mongoose";

const MONGO_TEST_URI =
    process.env.MONGO_TEST_URI ||
    "mongodb://testadmin:testpassword@localhost:27018/bracket_of_death_test?authSource=admin";

beforeAll(async () => {
    // Connect to test MongoDB
    await mongoose.connect(MONGO_TEST_URI);
    console.log("Connected to test MongoDB");
});

// afterEach has been removed to allow sequential tests in a single file to share state.
// Each test file should handle its own cleanup in beforeAll if needed.

afterAll(async () => {
    // Disconnect after all tests
    await mongoose.disconnect();
    console.log("Disconnected from test MongoDB");
});
