import type { RequestHandler } from 'express';
import { z, type ZodSchema, type ZodError } from 'zod';
import { error, ErrorCodes } from '../lib/responses.js';

/**
 * Schema configuration for request validation
 * Each property corresponds to a part of the Express request
 */
interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Format Zod validation errors into field-level details
 */
function formatZodErrors(zodError: ZodError): Record<string, string> {
  const details: Record<string, string> = {};

  for (const issue of zodError.issues) {
    const path = issue.path.join('.');
    const key = path || 'value';
    details[key] = issue.message;
  }

  return details;
}

/**
 * Create a validation middleware for Express routes
 *
 * Validates request body, query params, and URL params against Zod schemas.
 * On validation failure, returns 400 with field-level error details.
 *
 * @example
 * const createUserSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * router.post('/users',
 *   validateRequest({ body: createUserSchema }),
 *   (req, res) => {
 *     // req.body is typed as { name: string, email: string }
 *   }
 * );
 *
 * @example
 * // Validate multiple parts of the request
 * router.get('/users/:id',
 *   validateRequest({
 *     params: z.object({ id: z.string().uuid() }),
 *     query: z.object({ include: z.string().optional() }),
 *   }),
 *   handler
 * );
 */
export function validateRequest(schemas: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    const errors: Record<string, string> = {};

    // Validate body if schema provided
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        Object.assign(errors, formatZodErrors(result.error));
      } else {
        req.body = result.data;
      }
    }

    // Validate query if schema provided
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        const queryErrors = formatZodErrors(result.error);
        // Prefix query errors to distinguish from body errors
        for (const [key, value] of Object.entries(queryErrors)) {
          errors[`query.${key}`] = value;
        }
      } else {
        req.query = result.data;
      }
    }

    // Validate params if schema provided
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        const paramErrors = formatZodErrors(result.error);
        // Prefix param errors to distinguish from body errors
        for (const [key, value] of Object.entries(paramErrors)) {
          errors[`params.${key}`] = value;
        }
      } else {
        req.params = result.data;
      }
    }

    // If any validation errors, return 400 with details
    if (Object.keys(errors).length > 0) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'Invalid request data', errors));
      return;
    }

    next();
  };
}

// Re-export z for convenience when defining schemas
export { z };
