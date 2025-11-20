import type { ExtendedClient } from "@class/extendClient";
import logger from "@utils/logger";

export class GracefulShutdown {
    private static isShuttingDown = false;
    private static client: ExtendedClient | null = null;
    private static logger = logger.child({ module: "GracefulShutdown" });

    static setup(client: ExtendedClient) {
        this.client = client;
        this.setupSignalHandlers();
        this.setupProcessHandlers();
        
        // Windows specific handling
        if (process.platform === "win32") {
            this.setupWindowsHandling();
        }
    }

    private static async shutdown(signal: string) {
        if (this.isShuttingDown) {
            this.logger.warn(`Received ${signal} during shutdown, forcing exit...`);
            process.exit(1);
            return;
        }
        
        this.isShuttingDown = true;
        this.logger.info(`Received ${signal}, starting graceful shutdown...`);
        
        try {
            if (this.client) {
                await this.client.shutdown();
            } else {
                this.logger.warn("No client instance found, exiting immediately");
                process.exit(0);
            }
        } catch (error) {
            this.logger.error({ error }, "Error during shutdown");
            process.exit(1);
        }
    }

    private static setupSignalHandlers() {
        // Standard POSIX signals
        process.on("SIGINT", () => this.shutdown("SIGINT"));
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));
        process.on("SIGQUIT", () => this.shutdown("SIGQUIT"));
    }

    private static setupProcessHandlers() {
        // Handle uncaught exceptions and rejections
        process.on("uncaughtException", async (error) => {
            this.logger.fatal(error, "Uncaught Exception");
            await this.shutdown("UNCAUGHT_EXCEPTION");
        });

        process.on("unhandledRejection", async (reason) => {
            this.logger.fatal(reason, "Unhandled Rejection");
            await this.shutdown("UNHANDLED_REJECTION");
        });

        // Handle before exit
        process.on("beforeExit", (code) => {
            this.logger.info(`Process about to exit with code: ${code}`);
        });

        process.on("exit", (code) => {
            this.logger.info(`Process exited with code: ${code}`);
        });
    }

    private static setupWindowsHandling() {
        // Windows Ctrl+C handling
        let isRawMode = false;
        
        try {
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
                isRawMode = true;
                process.stdin.resume();
                process.stdin.setEncoding("utf8");
                
                process.stdin.on("data", (key) => {
                    const keyStr = key.toString();
                    
                    // Ctrl+C detection
                    if (keyStr === "\u0003") {
                        this.logger.debug("Ctrl+C detected on Windows");
                        this.shutdown("CTRL+C");
                        return;
                    }
                    
                    // Ctrl+Z detection (optional)
                    if (keyStr === "\u001a") {
                        this.logger.debug("Ctrl+Z detected, ignoring...");
                        return;
                    }
                });
            }
        } catch (error) {
            this.logger.warn(error, "Could not set up Windows-specific handlers");
        }

        // Windows specific signals (if available)
        try {
            process.on("SIGBREAK" as any, () => this.shutdown("SIGBREAK"));
        } catch (error) {
            // SIGBREAK might not be available
        }
    }

    // Force shutdown method for emergency cases
    static forceShutdown(reason = "FORCE_SHUTDOWN") {
        this.logger.warn(`Force shutdown requested: ${reason}`);
        process.exit(1);
    }
}