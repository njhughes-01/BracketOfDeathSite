/**
 * Global Teardown for Integration Tests
 * Stops Docker test container after tests complete.
 */
import { execSync } from "child_process";

export default async function globalTeardown() {
    console.log("Stopping test MongoDB container...");
    try {
        execSync("docker-compose -f docker-compose.test.yml down", {
            stdio: "inherit",
            cwd: process.cwd(),
        });
        console.log("Test MongoDB container stopped successfully");
    } catch (error) {
        console.error("Failed to stop test MongoDB container:", error);
        // Don't throw - we want tests to still report results even if cleanup fails
    }
}
