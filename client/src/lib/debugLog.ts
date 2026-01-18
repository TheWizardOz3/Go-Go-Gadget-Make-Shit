/**
 * Debug Logging System
 *
 * Stores logs in localStorage for debugging cloud mode issues
 * when Safari Web Inspector isn't available.
 */

const STORAGE_KEY = 'ggg_debug_logs';
const MAX_LOGS = 100;

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

/**
 * Get all stored logs
 */
export function getDebugLogs(): LogEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all stored logs
 */
export function clearDebugLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Add a log entry
 */
function addLog(level: LogEntry['level'], message: string, data?: unknown): void {
  try {
    const logs = getDebugLogs();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data !== undefined ? JSON.parse(JSON.stringify(data)) : undefined,
    };

    logs.push(entry);

    // Keep only last MAX_LOGS entries
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    // Also log to console for immediate viewing when connected
    const consoleMethod =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleMethod(`[GGG ${level.toUpperCase()}] ${message}`, data ?? '');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Debug logger with methods for different log levels
 */
export const debugLog = {
  info: (message: string, data?: unknown) => addLog('info', message, data),
  warn: (message: string, data?: unknown) => addLog('warn', message, data),
  error: (message: string, data?: unknown) => addLog('error', message, data),

  /**
   * Format logs for display
   */
  formatLogs(): string {
    const logs = getDebugLogs();
    return logs
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
        return `[${time}] ${log.level.toUpperCase()}: ${log.message}${dataStr}`;
      })
      .join('\n');
  },
};

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).gggDebug = {
    getLogs: getDebugLogs,
    clearLogs: clearDebugLogs,
    formatLogs: debugLog.formatLogs,
    showLogs: () => {
      console.log('=== GoGoGadgetClaude Debug Logs ===\n' + debugLog.formatLogs());
    },
  };
}
