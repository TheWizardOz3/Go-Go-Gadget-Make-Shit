/**
 * Session Manager Service
 *
 * Main service for loading sessions, getting messages, and tracking status.
 * Provides caching for parsed sessions to improve polling performance.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../lib/logger.js';
import { getProjectsBasePath, decodePath, getProjectName } from '../lib/pathEncoder.js';
import {
  parseJsonlFile,
  transformToMessages,
  getSessionMetadata,
  filterMessagesSince,
  extractProjectPath,
  type Message,
} from '../lib/jsonlParser.js';

// ============================================================
// Types
// ============================================================

/** Session status indicator */
export type SessionStatus = 'working' | 'waiting' | 'idle';

/** Session derived from JSONL files */
export interface Session {
  /** UUID from JSONL filename */
  id: string;
  /** Decoded from folder path */
  projectPath: string;
  /** Derived from projectPath (basename) */
  projectName: string;
  /** First message timestamp */
  startedAt: Date;
  /** Last message timestamp */
  lastActivityAt: Date;
  /** Total messages in session */
  messageCount: number;
  /** Current session status */
  status: SessionStatus;
}

/** Cached session data */
interface CachedSession {
  session: Session;
  messages: Message[];
  lastParsed: Date;
  filePath: string;
}

// ============================================================
// Cache
// ============================================================

/** In-memory cache for parsed sessions */
const sessionCache = new Map<string, CachedSession>();

/** Cache TTL in milliseconds (30 seconds) */
const CACHE_TTL = 30 * 1000;

/**
 * Invalidate cache for a session
 */
export function invalidateSessionCache(sessionId: string): void {
  sessionCache.delete(sessionId);
  logger.debug('Session cache invalidated', { sessionId });
}

/**
 * Invalidate all cached sessions
 */
export function invalidateAllCache(): void {
  sessionCache.clear();
  logger.debug('All session cache invalidated');
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cached: CachedSession): boolean {
  const age = Date.now() - cached.lastParsed.getTime();
  return age < CACHE_TTL;
}

// ============================================================
// Status Detection
// ============================================================

/**
 * Check if Claude Code process is currently running
 *
 * This is a simplified check - in production, we'd use process management
 * to track actual Claude Code processes. For MVP, we infer from the
 * message timing and types.
 */
async function isClaudeRunning(): Promise<boolean> {
  // For MVP, we can't reliably detect if Claude is running without
  // additional infrastructure. We'll use a heuristic based on timestamps.
  // This can be improved in future with proper process monitoring.
  return false; // Default to idle for now
}

/**
 * Detect session status based on messages and Claude state
 *
 * Status logic:
 * - 'idle': No Claude process running
 * - 'waiting': Claude finished and awaits input
 * - 'working': Claude is actively generating
 */
export function detectStatus(messages: Message[], claudeRunning: boolean): SessionStatus {
  if (!claudeRunning) {
    return 'idle';
  }

  if (messages.length === 0) {
    return 'idle';
  }

  const lastMessage = messages[messages.length - 1];

  // If last message is from assistant with no pending tool use, Claude is waiting
  if (lastMessage.type === 'assistant') {
    // Check if there are any pending tool uses
    const hasPendingTools = lastMessage.toolUse?.some((t) => t.status === 'pending') ?? false;
    if (!hasPendingTools) {
      return 'waiting';
    }
  }

  return 'working';
}

/**
 * Infer status from message timing (when we can't detect Claude process)
 *
 * Heuristic: If last activity was > 5 seconds ago, assume waiting/idle
 */
function inferStatusFromTiming(messages: Message[]): SessionStatus {
  if (messages.length === 0) {
    return 'idle';
  }

  const lastMessage = messages[messages.length - 1];
  const timeSinceLastActivity = Date.now() - lastMessage.timestamp.getTime();

  // If last activity was recent (< 5 seconds), might still be working
  if (timeSinceLastActivity < 5000) {
    // If last message is from user, Claude should be working
    if (lastMessage.type === 'user') {
      return 'working';
    }
    // If last message is assistant with pending tools, working
    if (lastMessage.toolUse?.some((t) => t.status === 'pending')) {
      return 'working';
    }
  }

  // If last message is from assistant, waiting for user input
  if (lastMessage.type === 'assistant') {
    return 'waiting';
  }

  // Default to idle
  return 'idle';
}

// ============================================================
// Session Loading
// ============================================================

/**
 * Find the JSONL file path for a session
 */
async function findSessionFile(sessionId: string): Promise<string | null> {
  const projectsPath = getProjectsBasePath();

  try {
    const entries = await fs.readdir(projectsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sessionPath = path.join(projectsPath, entry.name, `${sessionId}.jsonl`);
      try {
        await fs.access(sessionPath);
        return sessionPath;
      } catch {
        // File doesn't exist in this project, continue
      }
    }

    return null;
  } catch (error) {
    logger.error('Failed to find session file', { sessionId, error });
    return null;
  }
}

/**
 * Load and parse a session from disk
 */
async function loadSession(sessionId: string): Promise<CachedSession | null> {
  // Find the session file
  const filePath = await findSessionFile(sessionId);
  if (!filePath) {
    logger.debug('Session file not found', { sessionId });
    return null;
  }

  try {
    // Parse the JSONL file
    const entries = await parseJsonlFile(filePath);
    const messages = transformToMessages(entries, sessionId);
    const metadata = getSessionMetadata(entries);

    // Get project info - prefer extracting from JSONL cwd field (more reliable)
    const projectsPath = getProjectsBasePath();
    const relativePath = path.relative(projectsPath, filePath);
    const encodedProjectPath = relativePath.split(path.sep)[0];

    // Try to get actual path from JSONL entries, fall back to decoding folder name
    const extractedPath = extractProjectPath(entries);
    const projectPath = extractedPath || decodePath(encodedProjectPath);
    const projectName = getProjectName(projectPath);

    // Determine status
    const claudeRunning = await isClaudeRunning();
    const status = claudeRunning
      ? detectStatus(messages, claudeRunning)
      : inferStatusFromTiming(messages);

    const session: Session = {
      id: sessionId,
      projectPath,
      projectName,
      startedAt: metadata.startedAt || new Date(),
      lastActivityAt: metadata.lastActivityAt || new Date(),
      messageCount: metadata.messageCount,
      status,
    };

    return {
      session,
      messages,
      lastParsed: new Date(),
      filePath,
    };
  } catch (error) {
    logger.error('Failed to load session', {
      sessionId,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Get a session by ID
 *
 * Uses cache if available and valid, otherwise loads from disk.
 *
 * @param sessionId - The session UUID
 * @returns Session details or null if not found
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && isCacheValid(cached)) {
    logger.debug('Session cache hit', { sessionId });
    return cached.session;
  }

  // Load from disk
  const loaded = await loadSession(sessionId);
  if (!loaded) {
    return null;
  }

  // Update cache
  sessionCache.set(sessionId, loaded);
  logger.debug('Session loaded and cached', { sessionId });

  return loaded.session;
}

/**
 * Get messages for a session
 *
 * Supports optional `since` parameter for efficient polling.
 *
 * @param sessionId - The session UUID
 * @param since - Only return messages after this timestamp
 * @returns Array of messages or empty array if session not found
 */
export async function getMessages(sessionId: string, since?: Date): Promise<Message[]> {
  // Check cache first
  let cached = sessionCache.get(sessionId);

  if (!cached || !isCacheValid(cached)) {
    // Load from disk
    const loaded = await loadSession(sessionId);
    if (!loaded) {
      return [];
    }

    // Update cache
    sessionCache.set(sessionId, loaded);
    cached = loaded;
    logger.debug('Messages loaded and cached', { sessionId, count: loaded.messages.length });
  } else {
    logger.debug('Messages cache hit', { sessionId });
  }

  // Filter by since if provided
  if (since) {
    return filterMessagesSince(cached.messages, since);
  }

  return cached.messages;
}

/**
 * Get the current status of a session
 *
 * @param sessionId - The session UUID
 * @returns Session status or 'idle' if session not found
 */
export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  const session = await getSession(sessionId);
  return session?.status ?? 'idle';
}

/**
 * Get all recent sessions across all projects
 *
 * @param limit - Maximum number of sessions to return (default: 20)
 * @returns Array of sessions sorted by most recent activity
 */
export async function getRecentSessions(limit: number = 20): Promise<Session[]> {
  const projectsPath = getProjectsBasePath();
  const sessions: Session[] = [];

  try {
    const entries = await fs.readdir(projectsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const projectDir = path.join(projectsPath, entry.name);
      const files = await fs.readdir(projectDir);

      for (const file of files) {
        // Only include main sessions (not agent sidechains)
        if (!file.endsWith('.jsonl') || file.startsWith('agent-')) continue;

        const sessionId = file.replace('.jsonl', '');
        const session = await getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
    }

    // Sort by most recent activity
    sessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

    return sessions.slice(0, limit);
  } catch (error) {
    logger.error('Failed to get recent sessions', { error });
    return [];
  }
}

// Re-export Message type for convenience
export type { Message };
