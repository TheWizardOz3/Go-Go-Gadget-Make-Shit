import { ErrorCodes, type ErrorCode } from './responses.js';

/**
 * Base application error class
 *
 * Use this for operational errors that should be returned to the client.
 * Set isOperational=false for programming errors that shouldn't be exposed.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode | string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    // Maintain proper stack trace in V8 environments
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Validation error with field-level details
 *
 * @example
 * throw new ValidationError('Invalid input', {
 *   email: 'Invalid email format',
 *   age: 'Must be a positive number',
 * });
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Invalid request data',
    public details: Record<string, string> = {}
  ) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Resource not found error
 *
 * @example
 * throw new NotFoundError('session', sessionId);
 * // Results in: "Session not found: abc123"
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${capitalize(resource)} not found: ${identifier}`
      : `${capitalize(resource)} not found`;
    super(message, ErrorCodes.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Bad request error for invalid client requests
 *
 * @example
 * throw new BadRequestError('Invalid file format');
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.BAD_REQUEST, 400);
    this.name = 'BadRequestError';
  }
}

/**
 * Not implemented error for stub endpoints
 *
 * @example
 * throw new NotImplementedError('Get session messages');
 */
export class NotImplementedError extends AppError {
  constructor(feature: string) {
    super(`Not implemented: ${feature}`, ErrorCodes.NOT_IMPLEMENTED, 501);
    this.name = 'NotImplementedError';
  }
}

/**
 * Service unavailable error
 *
 * @example
 * throw new ServiceUnavailableError('Claude Code is not running');
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.SERVICE_UNAVAILABLE, 503);
    this.name = 'ServiceUnavailableError';
  }
}

// Helper function
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
