import pino from "pino";
import fs from "fs";

interface LoggerOptions {
    appName: string
    level?: string;
    env: string;
}

export function createLogger(options: LoggerOptions) {
    if (!fs.existsSync(`../../logs/${options.appName}`)){
        fs.mkdirSync(`../../logs/${options.appName}`, { recursive: true });
    }

    return pino({
        level: options.level || "debug",
        transport: {
            targets: [
                {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard'
                    },
                    level: options.level || 'debug'
                },
                {
                    target: 'pino/file',
                    options: { destination: `../../logs/${options.appName}/all-logs.log` },
                    level: options.level || 'debug'
                },
                {
                    target: 'pino/file',
                    options: { destination: `../../logs/${options.appName}/error-logs.log` },
                    level: 'error'
                }
            ]
        },
    })
}