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
    
    // Configuración específica para CI
    if (process.env.CI) {
        console.log("🔧 Running in CI environment - applying CI-specific configurations");
        // Timeout más largo para CI
        process.env.TEST_TIMEOUT = "60000";
    }
    
    // Configuración global para tests
    (global as any).testConfig = {
        timeout: process.env.CI ? 60000 : 30000,
        ci: Boolean(process.env.CI),
        verbose: process.env.NODE_ENV === "test"
    };
});

afterAll(() => {
    if (testDb) {
        testDb.close();
    }
});

beforeEach(() => {
    // Reset any global state before each test
});

afterEach(() => {
    // Clean up after each test
});

export { testDb };