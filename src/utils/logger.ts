import {pino} from "pino";


export const logger = pino({
    level: process.env.LOG_LEVEL || "debug",
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard'
                },
                level: 'debug'
            },
            {
                target: 'pino/file',
                options: { destination: './logs/all-logs.log' },
                level: 'info'
            },
            {
                target: 'pino/file',
                options: { destination: './logs/error-logs.log' },
                level: 'error'
            }
        ]      
    },
});



export default logger;