/**
 * File Watcher Service
 *
 * Watches ~/.claude/projects/ for JSONL file changes and emits events
 * for session cache invalidation. Uses chokidar for cross-platform
 * file watching with debouncing for rapid changes.
 */

import chokidar, { type FSWatcher } from 'chokidar';
import path from 'path';
import { logger } from './logger.js';
import { getProjectsBasePath } from './pathEncoder.js';

// ============================================================
// Types
// ============================================================

/** Callback for session change events */
type SessionChangeCallback = (sessionId: string, eventType: 'add' | 'change') => void;

// ============================================================
// State
// ============================================================

/** The active file watcher instance */
let watcher: FSWatcher | null = null;

/** Registered callbacks for session changes */
const callbacks: Set<SessionChangeCallback> = new Set();

/** Debounce timers for rapid changes */
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

/** Debounce delay in milliseconds */
const DEBOUNCE_MS = 500;

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Extract session ID from a JSONL file path
 * Returns null if not a valid session file
 */
function extractSessionId(filePath: string): string | null {
  const basename = path.basename(filePath);

  // Only process .jsonl files
  if (!basename.endsWith('.jsonl')) {
    return null;
  }

  // Skip agent sidechain files (agent-XXXX.jsonl)
  if (basename.startsWith('agent-')) {
    return null;
  }

  // Extract session ID (filename without extension)
  return basename.replace('.jsonl', '');
}

/**
 * Emit a session change event with debouncing
 * Rapid changes to the same session are collapsed into one event
 */
function emitChange(sessionId: string, eventType: 'add' | 'change'): void {
  // Clear any existing debounce timer for this session
  const existingTimer = debounceTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set a new debounce timer
  const timer = setTimeout(() => {
    debounceTimers.delete(sessionId);

    logger.debug('Session file changed', { sessionId, eventType });

    // Notify all registered callbacks
    for (const callback of callbacks) {
      try {
        callback(sessionId, eventType);
      } catch (error) {
        logger.error('Error in session change callback', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(sessionId, timer);
}

/**
 * Handle a file system event
 */
function handleFileEvent(eventType: 'add' | 'change', filePath: string): void {
  const sessionId = extractSessionId(filePath);
  if (sessionId) {
    emitChange(sessionId, eventType);
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Start watching the Claude projects directory for changes
 *
 * Watches ~/.claude/projects/ for:
 * - New JSONL files (new sessions)
 * - Changes to existing JSONL files (new messages)
 *
 * Changes are debounced to avoid excessive cache invalidation
 * during rapid writes.
 */
export function startWatching(): void {
  if (watcher) {
    logger.warn('File watcher already running');
    return;
  }

  const projectsPath = getProjectsBasePath();
  const watchPattern = path.join(projectsPath, '**', '*.jsonl');

  logger.info('Starting file watcher', { path: projectsPath });

  watcher = chokidar.watch(watchPattern, {
    // Don't fire events for existing files on startup
    ignoreInitial: true,
    // Use polling as a fallback for network drives
    usePolling: false,
    // Ignore permission errors
    ignorePermissionErrors: true,
    // Depth limit (projects/[encoded-path]/session.jsonl = 2 levels)
    depth: 2,
    // Wait for file writes to complete
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  // Handle file events
  watcher.on('add', (filePath) => handleFileEvent('add', filePath));
  watcher.on('change', (filePath) => handleFileEvent('change', filePath));

  // Handle errors
  watcher.on('error', (error) => {
    logger.error('File watcher error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  // Log when ready
  watcher.on('ready', () => {
    logger.info('File watcher ready');
  });
}

/**
 * Stop watching for file changes
 *
 * Cleans up the watcher and clears all pending debounce timers.
 */
export async function stopWatching(): Promise<void> {
  if (!watcher) {
    logger.debug('File watcher not running');
    return;
  }

  logger.info('Stopping file watcher');

  // Clear all debounce timers
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();

  // Close the watcher
  await watcher.close();
  watcher = null;

  logger.info('File watcher stopped');
}

/**
 * Register a callback for session change events
 *
 * The callback will be called when a session JSONL file is added or modified.
 * Changes are debounced to avoid excessive calls during rapid writes.
 *
 * @param callback - Function to call when a session changes
 * @returns Unsubscribe function
 *
 * @example
 * const unsubscribe = onSessionChange((sessionId, eventType) => {
 *   console.log(`Session ${sessionId} ${eventType}`);
 *   invalidateSessionCache(sessionId);
 * });
 *
 * // Later, to stop receiving events:
 * unsubscribe();
 */
export function onSessionChange(callback: SessionChangeCallback): () => void {
  callbacks.add(callback);
  logger.debug('Session change callback registered', { callbackCount: callbacks.size });

  // Return unsubscribe function
  return () => {
    callbacks.delete(callback);
    logger.debug('Session change callback unregistered', { callbackCount: callbacks.size });
  };
}

/**
 * Check if the file watcher is currently running
 */
export function isWatching(): boolean {
  return watcher !== null;
}

/**
 * Get the number of registered callbacks
 * Useful for debugging
 */
export function getCallbackCount(): number {
  return callbacks.size;
}
