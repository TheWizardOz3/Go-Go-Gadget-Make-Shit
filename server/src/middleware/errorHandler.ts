import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { error, ErrorCodes } from '../lib/responses.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * 404 Not Found handler for unmatched API routes
 *
 * Place this AFTER all API routes but BEFORE the SPA catch-all.
 * This ensures API requests to non-existent endpoints get a proper JSON error
 * instead of the SPA HTML.
 */
export const apiNotFoundHandler: RequestHandler = (req, res, _next) => {
  res
    .status(404)
    .json(error(ErrorCodes.NOT_FOUND, `API endpoint not found: ${req.method} ${req.path}`));
};

/**
 * Global error handling middleware
 *
 * Converts errors to standardized API response format.
 * Must be registered LAST in the middleware chain.
 *
 * Handles:
 * - AppError and subclasses (operational errors)
 * - ValidationError (with field-level details)
 * - ZodError (validation errors from thrown Zod errors)
 * - Unknown errors (returns generic 500)
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Log error with structured context
  const isOperational = err instanceof AppError && err.isOperational;
  const logFn = isOperational ? logger.warn : logger.error;

  logFn(err.message, {
    name: err.name,
    ...(err instanceof AppError && { code: err.code, statusCode: err.statusCode }),
    ...(err.stack && { stack: err.stack.split('\n').slice(0, 3).join(' → ') }),
  });

  // Handle ValidationError (with details)
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json(error(err.code, err.message, err.details));
    return;
  }

  // Handle AppError and subclasses (operational errors)
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json(error(err.code, err.message));
    return;
  }

  // Handle Zod validation errors (thrown directly, not through middleware)
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'value';
      details[path] = issue.message;
    }
    res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'Invalid request data', details));
    return;
  }

  // Handle syntax errors from JSON parsing
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'Invalid JSON in request body'));
    return;
  }

  // Handle unexpected errors - don't leak details to client
  res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred'));
};
