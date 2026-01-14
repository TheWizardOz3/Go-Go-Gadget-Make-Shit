/**
 * Standardized API Response Utilities
 *
 * All API responses follow this format:
 * - Success: { data: T, meta?: { timestamp: string } }
 * - Error: { error: { code: string, message: string, details?: Record<string, string> } }
 */

// ============================================================
// Response Types
// ============================================================

export interface SuccessResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
  };
}

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

// ============================================================
// Response Builders
// ============================================================

/**
 * Create a success response with optional metadata
 *
 * @example
 * res.json(success({ users: [...] }));
 * // Returns: { data: { users: [...] }, meta: { timestamp: "..." } }
 */
export function success<T>(data: T): SuccessResponse<T> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a success response without metadata
 * Use when timestamp is not needed (e.g., simple acknowledgments)
 *
 * @example
 * res.json(successRaw({ message: "OK" }));
 * // Returns: { data: { message: "OK" } }
 */
export function successRaw<T>(data: T): { data: T } {
  return { data };
}

/**
 * Create an error response body
 *
 * @example
 * res.status(404).json(error("NOT_FOUND", "User not found"));
 * // Returns: { error: { code: "NOT_FOUND", message: "User not found" } }
 */
export function error(
  code: string,
  message: string,
  details?: Record<string, string>
): ErrorResponseBody {
  const response: ErrorResponseBody = {
    error: {
      code,
      message,
    },
  };

  if (details && Object.keys(details).length > 0) {
    response.error.details = details;
  }

  return response;
}

// ============================================================
// Common Error Codes
// ============================================================

export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
