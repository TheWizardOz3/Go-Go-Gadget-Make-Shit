/**
 * Hook for dynamic API endpoint switching
 *
 * Automatically detects laptop availability via Tailscale and switches
 * between local and cloud (Modal) API endpoints.
 *
 * Priority:
 * 1. Local laptop (if available) - Full features
 * 2. Modal cloud API - Async prompts only
 *
 * The hook periodically checks laptop connectivity and switches
 * endpoints as availability changes.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { ApiEndpointMode } from '@shared/types';
import { setApiBaseUrl } from '@/lib/api';

// ============================================================
// Configuration
// ============================================================

/**
 * Get configured endpoint URLs from environment variables
 *
 * In development, falls back to localhost
 * In production (Vercel), uses configured Tailscale/Modal URLs
 */
function getConfiguredUrls(): { laptopUrl: string; modalUrl: string } {
  // Try Vite env vars first (for Vercel deployment)
  const laptopUrl =
    import.meta.env.VITE_LAPTOP_API_URL || (import.meta.env.DEV ? 'http://localhost:3457' : '');

  const modalUrl = import.meta.env.VITE_MODAL_API_URL || '';

  return { laptopUrl, modalUrl };
}

/** How often to check laptop availability (ms) */
const LAPTOP_CHECK_INTERVAL = 30000; // 30 seconds

/** Timeout for laptop connectivity check (ms) */
const LAPTOP_CHECK_TIMEOUT = 5000; // 5 seconds

/** Local storage key for last known mode */
const STORAGE_KEY = 'gogogadget-api-mode';

// ============================================================
// Types
// ============================================================

export interface UseApiEndpointReturn {
  /** Current API base URL to use */
  baseUrl: string;
  /** Current mode (local or cloud) */
  mode: ApiEndpointMode;
  /** Whether a connectivity check is in progress */
  isChecking: boolean;
  /** Whether initial connectivity check has completed (safe to start fetching) */
  isInitialized: boolean;
  /** Last successful check timestamp */
  lastCheckedAt: Date | null;
  /** Whether laptop is available */
  isLaptopAvailable: boolean;
  /** Whether cloud (Modal) is configured */
  isCloudConfigured: boolean;
  /** Error message if last check failed */
  error: string | null;
  /** Force a connectivity check now */
  checkNow: () => Promise<void>;
  /** Force switch to a specific mode (for testing) */
  forceMode: (mode: ApiEndpointMode) => void;
}

// ============================================================
// Connectivity Check
// ============================================================

/**
 * Check if the laptop API is reachable
 *
 * Sends a lightweight request to the /api/status endpoint.
 * Uses AbortController for timeout handling.
 */
async function checkLaptopAvailability(laptopUrl: string): Promise<boolean> {
  if (!laptopUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LAPTOP_CHECK_TIMEOUT);

  try {
    const response = await fetch(`${laptopUrl}/api/status`, {
      method: 'GET',
      signal: controller.signal,
      // Don't send credentials - this is just a connectivity check
      credentials: 'omit',
      // Bypass cache
      cache: 'no-store',
    });

    return response.ok;
  } catch {
    // Network error, timeout, or CORS issue
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Hook for dynamic API endpoint switching
 *
 * @returns Object containing current endpoint state and control functions
 *
 * @example
 * ```tsx
 * const { baseUrl, mode, isLaptopAvailable } = useApiEndpoint();
 *
 * // Use baseUrl for API calls
 * const response = await fetch(`${baseUrl}/api/sessions`);
 *
 * // Show connection status
 * <Badge>{mode === 'local' ? '🟢 Local' : '☁️ Cloud'}</Badge>
 * ```
 */
export function useApiEndpoint(): UseApiEndpointReturn {
  const { laptopUrl, modalUrl } = getConfiguredUrls();
  const isCloudConfigured = Boolean(modalUrl);

  // Initialize mode from localStorage or default to local attempt
  const [mode, setMode] = useState<ApiEndpointMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'local' || stored === 'cloud') {
        return stored;
      }
    }
    return 'local';
  });

  const [isChecking, setIsChecking] = useState(false);
  const [isLaptopAvailable, setIsLaptopAvailable] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track if initial connectivity check has completed
  // This prevents SWR from fetching with wrong URL during startup
  const [isInitialized, setIsInitialized] = useState(false);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);

  // Track forced mode (for testing/debugging)
  const [forcedMode, setForcedMode] = useState<ApiEndpointMode | null>(null);

  /**
   * Perform a connectivity check and update state
   */
  const performCheck = useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsChecking(true);
    setError(null);

    try {
      const available = await checkLaptopAvailability(laptopUrl);

      if (!isMountedRef.current) return;

      setIsLaptopAvailable(available);
      setLastCheckedAt(new Date());

      // Auto-switch mode based on availability (unless forced)
      if (forcedMode === null) {
        const newMode: ApiEndpointMode = available ? 'local' : 'cloud';
        setMode(newMode);

        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, newMode);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Connectivity check failed';
      setError(message);
      setIsLaptopAvailable(false);

      // Fall back to cloud if available
      if (forcedMode === null && isCloudConfigured) {
        setMode('cloud');
      }
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
        setIsInitialized(true);
      }
    }
  }, [laptopUrl, isCloudConfigured, forcedMode]);

  /**
   * Force immediate connectivity check
   */
  const checkNow = useCallback(async () => {
    await performCheck();
  }, [performCheck]);

  /**
   * Force switch to a specific mode (bypasses auto-detection)
   */
  const forceMode = useCallback((newMode: ApiEndpointMode) => {
    setForcedMode(newMode);
    setMode(newMode);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newMode);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    isMountedRef.current = true;
    performCheck();

    return () => {
      isMountedRef.current = false;
    };
  }, [performCheck]);

  // Periodic connectivity checks
  useEffect(() => {
    // Only poll if not forced and cloud is configured
    if (forcedMode !== null) {
      return;
    }

    const intervalId = setInterval(() => {
      performCheck();
    }, LAPTOP_CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [performCheck, forcedMode]);

  // Check when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      // Don't check immediately on focus, wait a bit
      setTimeout(() => {
        if (isMountedRef.current && forcedMode === null) {
          performCheck();
        }
      }, 1000);
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [performCheck, forcedMode]);

  // Determine the actual base URL to use
  const effectiveMode = forcedMode ?? mode;
  let baseUrl: string;

  if (effectiveMode === 'local' && laptopUrl) {
    baseUrl = laptopUrl;
  } else if (effectiveMode === 'cloud' && modalUrl) {
    baseUrl = modalUrl;
  } else if (laptopUrl) {
    // Fallback to laptop URL if cloud not configured
    baseUrl = laptopUrl;
  } else if (modalUrl) {
    // Fallback to cloud if laptop not configured
    baseUrl = modalUrl;
  } else {
    // Last resort: assume same-origin (works in local dev with Vite proxy)
    baseUrl = '';
  }

  // Sync base URL with the api module so all API calls use the correct endpoint
  useEffect(() => {
    setApiBaseUrl(baseUrl, effectiveMode);
  }, [baseUrl, effectiveMode]);

  return {
    baseUrl,
    mode: effectiveMode,
    isChecking,
    isInitialized,
    lastCheckedAt,
    isLaptopAvailable,
    isCloudConfigured,
    error,
    checkNow,
    forceMode,
  };
}

// ============================================================
// Context for Global Access
// ============================================================

/** Context value type */
type ApiEndpointContextValue = UseApiEndpointReturn | null;

/** Context for sharing API endpoint state across the app */
const ApiEndpointContext = createContext<ApiEndpointContextValue>(null);

/**
 * Provider component for API endpoint state
 *
 * Wrap your app with this to share endpoint state across components.
 *
 * @example
 * ```tsx
 * <ApiEndpointProvider>
 *   <App />
 * </ApiEndpointProvider>
 * ```
 */
export function ApiEndpointProvider({ children }: { children: ReactNode }) {
  const endpoint = useApiEndpoint();

  return <ApiEndpointContext.Provider value={endpoint}>{children}</ApiEndpointContext.Provider>;
}

/**
 * Use the shared API endpoint context
 *
 * Must be used within an ApiEndpointProvider.
 *
 * @throws Error if used outside of provider
 *
 * @example
 * ```tsx
 * const { baseUrl, mode } = useApiEndpointContext();
 * ```
 */
export function useApiEndpointContext(): UseApiEndpointReturn {
  const context = useContext(ApiEndpointContext);

  if (context === null) {
    throw new Error('useApiEndpointContext must be used within an ApiEndpointProvider');
  }

  return context;
}

/**
 * Get the current base URL without the full hook state
 *
 * Convenience function for components that only need the URL.
 * Falls back to empty string if context not available.
 */
export function useBaseUrl(): string {
  const context = useContext(ApiEndpointContext);
  return context?.baseUrl ?? '';
}
