/**
 * Simple logging utility for GoGoGadgetClaude
 *
 * Provides structured logging with levels and timestamps.
 * In production, this could be extended to write to files or external services.
 */

// ============================================================
// Types
// ============================================================

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// ============================================================
// Configuration
// ============================================================

// Log level hierarchy (lower = more severe)
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Current log level from environment (default: info in production, debug in development)
const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: COLORS.red,
  warn: COLORS.yellow,
  info: COLORS.blue,
  debug: COLORS.gray,
};

// ============================================================
// Internal Functions
// ============================================================

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatContext(context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return ' [unserializable context]';
  }
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = formatTimestamp();
  const color = LEVEL_COLORS[level];
  const levelLabel = level.toUpperCase().padEnd(5);
  const contextStr = formatContext(context);

  // Format: 2026-01-14T12:00:00.000Z [INFO ] Message {context}
  const output = `${COLORS.gray}${timestamp}${COLORS.reset} ${color}[${levelLabel}]${COLORS.reset} ${message}${COLORS.gray}${contextStr}${COLORS.reset}`;

  // Use appropriate console method
  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

// ============================================================
// Public API
// ============================================================

export const logger = {
  /**
   * Log an error message
   * Use for failures requiring attention: process spawn failed, file read error
   */
  error(message: string, context?: Record<string, unknown>): void {
    log('error', message, context);
  },

  /**
   * Log a warning message
   * Use for recoverable issues: JSONL parse warning, missing template file
   */
  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context);
  },

  /**
   * Log an info message
   * Use for normal operations: server started, session loaded, prompt sent
   */
  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context);
  },

  /**
   * Log a debug message
   * Use for development diagnostics: API request details, file watch events
   */
  debug(message: string, context?: Record<string, unknown>): void {
    log('debug', message, context);
  },
};

// ============================================================
// Utility Exports
// ============================================================

/**
 * Create a child logger with preset context
 * Useful for adding request ID or module name to all logs
 *
 * @example
 * const reqLogger = createChildLogger({ requestId: 'abc123' });
 * reqLogger.info('Processing request'); // Includes requestId in context
 */
export function createChildLogger(baseContext: Record<string, unknown>) {
  return {
    error(message: string, context?: Record<string, unknown>): void {
      logger.error(message, { ...baseContext, ...context });
    },
    warn(message: string, context?: Record<string, unknown>): void {
      logger.warn(message, { ...baseContext, ...context });
    },
    info(message: string, context?: Record<string, unknown>): void {
      logger.info(message, { ...baseContext, ...context });
    },
    debug(message: string, context?: Record<string, unknown>): void {
      logger.debug(message, { ...baseContext, ...context });
    },
  };
}
