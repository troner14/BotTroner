import { Database } from "bun:sqlite";
import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

// Setup global test database
let testDb: Database;

beforeAll(() => {
    // Create in-memory test database
    testDb = new Database(":memory:");
    
    // Set environment variables for testing
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "silent";
    process.env.DATABASE_URL = "file::memory:?cache=shared";
    
});

afterAll(async () => {
    try {
        if (testDb) {
            testDb.close();
        }
        
    } catch (error) {
        console.error("Error during cleanup:", error);
        if (process.env.CI) {
            process.exit(1);
        }
    }
});

beforeEach(() => {
    // Reset any global state before each test
});

afterEach(() => {
    // Clean up after each test
});

export { testDb };