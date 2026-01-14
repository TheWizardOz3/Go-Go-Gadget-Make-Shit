import type { RequestHandler } from 'express';
import { logger } from '../lib/logger.js';

/**
 * Request logging middleware
 * Logs all incoming requests with method, path, status, and response time
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  const { method, path } = req;

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    // Choose log level based on status code
    const logFn = statusCode >= 500 ? logger.error : statusCode >= 400 ? logger.warn : logger.debug;

    logFn(`${method} ${path} ${statusCode}`, { duration: `${duration}ms` });
  });

  next();
};
