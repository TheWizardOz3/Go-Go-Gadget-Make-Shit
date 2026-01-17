/**
 * API Client for GoGoGadgetClaude
 *
 * Typed fetch wrapper with automatic base URL detection
 * and standardized error handling.
 */

// ============================================================
// Types
// ============================================================

/** Standard success response from API */
interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
  };
}

/** Standard error response from API */
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

/** Custom error class for API errors */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================
// Configuration
// ============================================================

/**
 * Determine API base URL based on environment
 *
 * - Development: Vite dev server proxies to localhost:3456
 * - Production: Same origin (served by Express)
 */
function getBaseUrl(): string {
  // In development, Vite runs on a different port
  // We need to call the Express server directly
  // Server runs HTTPS on 3456 (primary) and HTTP on 3457 (secondary)
  // Use HTTP for dev browser testing (voice input won't work but API calls will)
  if (import.meta.env.DEV) {
    return 'http://localhost:3457';
  }
  // In production, API is served from same origin
  return '';
}

const BASE_URL = getBaseUrl();

// ============================================================
// Fetch Wrapper
// ============================================================

/**
 * Make an API request and handle the response
 */
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}/api${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  // Parse JSON response
  const json = await response.json();

  // Handle error responses
  if (!response.ok) {
    const errorResponse = json as ApiErrorResponse;
    throw new ApiError(
      errorResponse.error?.message || 'An error occurred',
      errorResponse.error?.code || 'UNKNOWN_ERROR',
      response.status,
      errorResponse.error?.details
    );
  }

  // Return the data from success response
  const successResponse = json as ApiSuccessResponse<T>;
  return successResponse.data;
}

// ============================================================
// Public API
// ============================================================

export const api = {
  /**
   * GET request
   * @example const status = await api.get<StatusResponse>('/status');
   */
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },

  /**
   * POST request
   * @example await api.post('/sessions/abc/send', { prompt: 'Hello' });
   */
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  /**
   * PUT request
   * @example await api.put('/settings', { theme: 'dark' });
   */
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, body);
  },

  /**
   * DELETE request
   * @example await api.delete('/sessions/abc');
   */
  delete<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },

  /**
   * PATCH request
   * @example await api.patch('/scheduled-prompts/abc/toggle');
   */
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  /**
   * Upload file via multipart/form-data
   * @example
   * const formData = new FormData();
   * formData.append('audio', audioBlob);
   * const result = await api.upload<TranscriptionResult>('/transcribe', formData);
   */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    const url = `${BASE_URL}/api${path}`;

    // Don't set Content-Type header - browser will set it with boundary
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    // Parse JSON response
    const json = await response.json();

    // Handle error responses
    if (!response.ok) {
      const errorResponse = json as ApiErrorResponse;
      throw new ApiError(
        errorResponse.error?.message || 'Upload failed',
        errorResponse.error?.code || 'UPLOAD_ERROR',
        response.status,
        errorResponse.error?.details
      );
    }

    // Return the data from success response
    const successResponse = json as ApiSuccessResponse<T>;
    return successResponse.data;
  },
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Get a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
