/**
 * API Client for GoGoGadgetClaude
 *
 * Typed fetch wrapper with dynamic base URL support for
 * switching between local (laptop) and cloud (Modal) APIs.
 *
 * The base URL can be set dynamically via setApiBaseUrl(),
 * which is called by the ApiEndpointProvider when the
 * connection mode changes.
 */

import type { ApiEndpointMode } from '@shared/types';

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

/** Options for API requests */
export interface ApiRequestOptions {
  /** Override the base URL for this request only */
  baseUrl?: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
}

// ============================================================
// Configuration
// ============================================================

/**
 * Determine default API base URL based on environment
 *
 * - Development: localhost:3457 (HTTP port)
 * - Production: Same origin (served by Express) OR configured URLs
 */
function getDefaultBaseUrl(): string {
  // In development, use HTTP port directly
  if (import.meta.env.DEV) {
    return 'http://localhost:3457';
  }

  // In production on Vercel, try laptop URL first
  const laptopUrl = import.meta.env.VITE_LAPTOP_API_URL;
  if (laptopUrl) {
    return laptopUrl;
  }

  // Fall back to same origin (for local production builds)
  return '';
}

/** Current base URL - can be updated dynamically */
let currentBaseUrl = getDefaultBaseUrl();

/** Current API mode for logging/debugging */
let currentMode: ApiEndpointMode = 'local';

/** Subscribers to base URL changes */
type BaseUrlSubscriber = (baseUrl: string, mode: ApiEndpointMode) => void;
const subscribers: Set<BaseUrlSubscriber> = new Set();

// ============================================================
// Base URL Management
// ============================================================

/**
 * Set the API base URL dynamically
 *
 * Called by ApiEndpointProvider when connection mode changes.
 *
 * @param baseUrl - The new base URL (e.g., "https://macbook.tailnet.ts.net:3456")
 * @param mode - The current API mode ('local' or 'cloud')
 */
export function setApiBaseUrl(baseUrl: string, mode: ApiEndpointMode = 'local'): void {
  const changed = currentBaseUrl !== baseUrl || currentMode !== mode;
  currentBaseUrl = baseUrl;
  currentMode = mode;

  if (changed) {
    // Notify subscribers
    subscribers.forEach((callback) => callback(baseUrl, mode));
  }
}

/**
 * Get the current API base URL
 */
export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

/**
 * Get the current API mode
 */
export function getApiMode(): ApiEndpointMode {
  return currentMode;
}

/**
 * Subscribe to base URL changes
 *
 * @param callback - Function to call when base URL changes
 * @returns Unsubscribe function
 */
export function subscribeToBaseUrl(callback: BaseUrlSubscriber): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

// ============================================================
// Fetch Wrapper
// ============================================================

/**
 * Make an API request and handle the response
 */
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const baseUrl = options?.baseUrl ?? currentBaseUrl;
  const url = `${baseUrl}/api${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  // Add timeout support
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (options?.timeout) {
    const controller = new AbortController();
    fetchOptions.signal = controller.signal;
    timeoutId = setTimeout(() => controller.abort(), options.timeout);
  }

  try {
    const response = await fetch(url, fetchOptions);

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
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// ============================================================
// Public API
// ============================================================

export const api = {
  /**
   * GET request
   * @example const status = await api.get<StatusResponse>('/status');
   */
  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  /**
   * POST request
   * @example await api.post('/sessions/abc/send', { prompt: 'Hello' });
   */
  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },

  /**
   * PUT request
   * @example await api.put('/settings', { theme: 'dark' });
   */
  put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options);
  },

  /**
   * DELETE request
   * @example await api.delete('/sessions/abc');
   */
  delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },

  /**
   * PATCH request
   * @example await api.patch('/scheduled-prompts/abc/toggle');
   */
  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },

  /**
   * Upload file via multipart/form-data
   * @example
   * const formData = new FormData();
   * formData.append('audio', audioBlob);
   * const result = await api.upload<TranscriptionResult>('/transcribe', formData);
   */
  async upload<T>(path: string, formData: FormData, options?: ApiRequestOptions): Promise<T> {
    const baseUrl = options?.baseUrl ?? currentBaseUrl;
    const url = `${baseUrl}/api${path}`;

    const fetchOptions: RequestInit = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    };

    // Add timeout support
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (options?.timeout) {
      const controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), options.timeout);
    }

    try {
      const response = await fetch(url, fetchOptions);

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
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  },

  /**
   * Get the current base URL being used
   */
  getBaseUrl(): string {
    return currentBaseUrl;
  },

  /**
   * Get the current API mode
   */
  getMode(): ApiEndpointMode {
    return currentMode;
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
    // Handle timeout errors
    if (error.name === 'AbortError') {
      return 'Request timed out';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  return false;
}
