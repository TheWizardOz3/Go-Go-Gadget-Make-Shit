import type { ErrorRequestHandler } from 'express';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error response format matching architecture spec
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Global error handling middleware
 * Converts errors to standardized API response format
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Log error for debugging (in production, use proper logging)
  console.error('[Error]', err);

  // Handle known application errors
  if (err instanceof AppError && err.isOperational) {
    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const response: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle unexpected errors - don't leak details
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
};
