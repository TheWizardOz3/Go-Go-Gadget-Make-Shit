/**
 * Process Manager
 *
 * Service for tracking active Claude Code processes.
 * Maintains an in-memory mapping of session IDs to process information,
 * enabling stop functionality for running agents.
 */

import { logger } from '../lib/logger.js';

// ============================================================
// Types
// ============================================================

/** Information about a tracked Claude process */
export interface ProcessInfo {
  /** Process ID */
  pid: number;
  /** Session ID this process belongs to */
  sessionId: string;
  /** When the process was started */
  startedAt: Date;
  /** Project path where the process is running */
  projectPath: string;
}

// ============================================================
// Internal State
// ============================================================

/**
 * In-memory map of session ID to process information.
 * This is reset when the server restarts, which is acceptable
 * since any orphaned processes would need manual cleanup anyway.
 */
const activeProcesses = new Map<string, ProcessInfo>();

// ============================================================
// Public API
// ============================================================

/**
 * Track a new Claude process for a session
 *
 * If there's already a process tracked for this session, it will be
 * replaced (the old process may be orphaned - this is expected if
 * the user starts a new prompt while one is running).
 *
 * @param sessionId - The session ID to track the process for
 * @param pid - The process ID
 * @param projectPath - The project directory path
 */
export function trackProcess(sessionId: string, pid: number, projectPath: string): void {
  const existingProcess = activeProcesses.get(sessionId);

  if (existingProcess) {
    logger.warn('Replacing existing tracked process for session', {
      sessionId,
      oldPid: existingProcess.pid,
      newPid: pid,
    });
  }

  const processInfo: ProcessInfo = {
    pid,
    sessionId,
    startedAt: new Date(),
    projectPath,
  };

  activeProcesses.set(sessionId, processInfo);

  logger.debug('Process tracked', {
    sessionId,
    pid,
    projectPath,
  });
}

/**
 * Remove tracking for a session's process
 *
 * Called when a process exits naturally or is stopped.
 *
 * @param sessionId - The session ID to untrack
 * @returns true if a process was untracked, false if none was tracked
 */
export function untrackProcess(sessionId: string): boolean {
  const existed = activeProcesses.has(sessionId);

  if (existed) {
    const processInfo = activeProcesses.get(sessionId);
    activeProcesses.delete(sessionId);

    logger.debug('Process untracked', {
      sessionId,
      pid: processInfo?.pid,
    });
  }

  return existed;
}

/**
 * Get information about the active process for a session
 *
 * @param sessionId - The session ID to look up
 * @returns ProcessInfo if a process is tracked, null otherwise
 */
export function getActiveProcess(sessionId: string): ProcessInfo | null {
  return activeProcesses.get(sessionId) ?? null;
}

/**
 * Check if a session has an active tracked process
 *
 * @param sessionId - The session ID to check
 * @returns true if a process is tracked for this session
 */
export function hasActiveProcess(sessionId: string): boolean {
  return activeProcesses.has(sessionId);
}

/**
 * Get all currently tracked processes
 *
 * Useful for debugging and status reporting.
 *
 * @returns Array of all tracked process information
 */
export function getAllActiveProcesses(): ProcessInfo[] {
  return Array.from(activeProcesses.values());
}

/**
 * Get count of active processes
 *
 * @returns Number of currently tracked processes
 */
export function getActiveProcessCount(): number {
  return activeProcesses.size;
}

/**
 * Clear all tracked processes
 *
 * Primarily for testing purposes.
 */
export function clearAllProcesses(): void {
  const count = activeProcesses.size;
  activeProcesses.clear();

  if (count > 0) {
    logger.debug('Cleared all tracked processes', { count });
  }
}
