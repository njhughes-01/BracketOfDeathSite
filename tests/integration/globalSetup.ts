/**
 * Global Setup for Integration Tests
 * Ensures Docker test container is running before tests start.
 */
import { execSync } from "child_process";

export default async function globalSetup() {
    console.log("Starting test MongoDB container...");
    try {
        execSync("docker-compose -f docker-compose.test.yml up -d --wait", {
            stdio: "inherit",
            cwd: process.cwd(),
        });
        console.log("Test MongoDB container started successfully");

        // Give MongoDB a moment to fully initialize
        await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
        console.error("Failed to start test MongoDB container:", error);
        throw error;
    }
}
