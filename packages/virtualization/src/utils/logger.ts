import { createLogger } from "@bot/logger";

export default createLogger({
    appName: "VirtualizationUtils",
    env: process.env.NODE_ENV || "development",
    level: process.env.LOG_LEVEL || "info"
});