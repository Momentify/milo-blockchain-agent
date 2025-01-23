import winston from 'winston';
import { Writable } from 'stream';
import 'dotenv/config'

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    const req = metadata.req;
    const res = metadata.res;
    const routeInfo = req ? `Route Information: ${req.method} ${req.originalUrl}` : '';
    const statusCode = res ? `Status: ${res.statusCode}` : '';
    const error = metadata.error ? `Error: ${metadata.error.stack}` : '';
    return `[${timestamp}] ${level}: ${message} [${routeInfo} ${statusCode}] ${error}`;
});

// Winston Logger
export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        customFormat
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: '../logs/info.log', level: 'info', format: winston.format.json() }),
    ],
    exceptionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: '../logs/exceptions.log', level: 'error', format: winston.format.json() }),
    ],
    rejectionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: '../logs/rejections.log', level: 'error', format: winston.format.json() }),
    ],
})

// Custom writable stream for capturing stderr
const stderrStream = new Writable({
    write(chunk, encoding, callback) {
        logger.error('stderr', { message: chunk.toString() });
        callback();
    }
});

// Redirect stderr to the custom writable stream
process.stderr.write = stderrStream.write.bind(stderrStream);

// Graceful shutdown on uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err });
    // Allow logging to finish before exiting
    setTimeout(() => process.exit(1), 100000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    // Allow logging to finish before exiting
    setTimeout(() => process.exit(1), 100000);
});