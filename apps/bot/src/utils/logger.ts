import {createLogger} from "@bot/logger";


export const logger = createLogger({
    appName: "bot",
    env: process.env.NODE_ENV || "development",
    level: process.env.LOG_LEVEL || "info"
})

export default logger;