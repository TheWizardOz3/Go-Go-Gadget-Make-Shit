/**
 * Cloud Session Manager Service
 *
 * Manages cloud-executed sessions stored on Modal's persistent volume.
 * Provides caching, session listing, and message retrieval from the cloud.
 * Works alongside the local sessionManager to provide unified session access.
 */

import { logger } from '../lib/logger.js';
import {
  isModalConfigured,
  listCloudProjects,
  listCloudSessions,
  getCloudMessages,
  type CloudSession,
  type RawJsonlMessage,
} from './modalClient.js';
import type {
  SessionStatus,
  CloudSession as SharedCloudSession,
  LocalSession,
  MergedSession,
  MessageSerialized,
} from '../../../shared/types/index.js';

// ============================================================
// Types
// ============================================================

/** Cached cloud session data */
interface CachedCloudSession {
  session: CloudSession;
  lastFetched: Date;
}

/** Cached cloud messages */
interface CachedMessages {
  messages: RawJsonlMessage[];
  lastFetched: Date;
}

/** Result from fetching cloud sessions */
export interface CloudSessionsResult {
  success: boolean;
  sessions?: CloudSession[];
  error?: string;
  /** Whether this came from cache */
  cached?: boolean;
}

/** Result from fetching cloud messages */
export interface CloudMessagesResult {
  success: boolean;
  messages?: MessageSerialized[];
  status?: SessionStatus;
  error?: string;
  cached?: boolean;
}

// ============================================================
// Cache Configuration
// ============================================================

/** Cache TTL for session list (60 seconds) */
const SESSIONS_CACHE_TTL = 60 * 1000;

/** Cache TTL for messages (30 seconds - more aggressive refresh for active sessions) */
const MESSAGES_CACHE_TTL = 30 * 1000;

/** In-memory cache for cloud sessions by project */
const sessionsCache = new Map<string, { sessions: CloudSession[]; lastFetched: Date }>();

/** In-memory cache for individual session details */
const sessionCache = new Map<string, CachedCloudSession>();

/** In-memory cache for messages by session */
const messagesCache = new Map<string, CachedMessages>();

// ============================================================
// Cache Management
// ============================================================

/**
 * Invalidate all cloud session caches
 */
export function invalidateCloudCache(): void {
  sessionsCache.clear();
  sessionCache.clear();
  messagesCache.clear();
  logger.debug('Cloud session cache invalidated');
}

/**
 * Invalidate cache for a specific session
 */
export function invalidateCloudSession(sessionId: string): void {
  sessionCache.delete(sessionId);
  messagesCache.delete(sessionId);
  logger.debug('Cloud session cache invalidated', { sessionId });
}

/**
 * Invalidate cache for a specific project
 */
export function invalidateCloudProject(projectPath: string): void {
  sessionsCache.delete(projectPath);
  logger.debug('Cloud project cache invalidated', { projectPath });
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(lastFetched: Date, ttl: number): boolean {
  return Date.now() - lastFetched.getTime() < ttl;
}

// ============================================================
// Message Parsing
// ============================================================

/**
 * Parse raw JSONL messages into our MessageSerialized format
 *
 * This mirrors the logic in jsonlParser.ts but works with the raw
 * format returned from the Modal API.
 */
function parseRawMessages(rawMessages: RawJsonlMessage[], sessionId: string): MessageSerialized[] {
  const messages: MessageSerialized[] = [];
  let messageIndex = 0;

  for (const raw of rawMessages) {
    // Only process user and assistant messages
    if (raw.type !== 'user' && raw.type !== 'assistant') {
      continue;
    }

    // Extract content from the message field
    let content = '';
    if (raw.message && typeof raw.message === 'object') {
      // Handle structured message format
      const msg = raw.message as { content?: unknown };
      if (Array.isArray(msg.content)) {
        // Content is an array of text blocks
        content = msg.content
          .filter((block: unknown) => {
            const b = block as { type?: string };
            return b.type === 'text';
          })
          .map((block: unknown) => {
            const b = block as { text?: string };
            return b.text || '';
          })
          .join('\n');
      } else if (typeof msg.content === 'string') {
        content = msg.content;
      }
    } else if (typeof raw.message === 'string') {
      content = raw.message;
    }

    // Skip empty messages
    if (!content.trim()) {
      continue;
    }

    messages.push({
      id: raw.uuid || `${sessionId}-${messageIndex}`,
      sessionId,
      type: raw.type as 'user' | 'assistant',
      content,
      timestamp: raw.timestamp || new Date().toISOString(),
      // Tool use would require more complex parsing, omit for now
    });

    messageIndex++;
  }

  return messages;
}

/**
 * Infer session status from messages
 */
function inferStatusFromMessages(messages: MessageSerialized[]): SessionStatus {
  if (messages.length === 0) {
    return 'idle';
  }

  const lastMessage = messages[messages.length - 1];
  const lastTimestamp = new Date(lastMessage.timestamp).getTime();
  const timeSinceLastActivity = Date.now() - lastTimestamp;

  // If last activity was recent (< 10 seconds for cloud), might still be working
  if (timeSinceLastActivity < 10000) {
    if (lastMessage.type === 'user') {
      return 'working';
    }
  }

  // If last message is from assistant, waiting for user input
  if (lastMessage.type === 'assistant') {
    return 'waiting';
  }

  return 'idle';
}

// ============================================================
// Public API
// ============================================================

/**
 * Check if cloud sessions are available
 *
 * @returns true if Modal is configured and accessible
 */
export async function isCloudAvailable(): Promise<boolean> {
  return isModalConfigured();
}

/**
 * List all cloud projects
 *
 * @returns Array of project paths stored in the cloud
 */
export async function listCloudProjectPaths(): Promise<string[]> {
  const result = await listCloudProjects();

  if (!result.success) {
    logger.warn('Failed to list cloud projects', { error: result.error });
    return [];
  }

  return result.projects || [];
}

/**
 * Get cloud sessions for a specific project
 *
 * @param projectPath - Encoded project path
 * @returns Cloud sessions result
 */
export async function getCloudSessionsForProject(
  projectPath: string
): Promise<CloudSessionsResult> {
  // Check cache first
  const cached = sessionsCache.get(projectPath);
  if (cached && isCacheValid(cached.lastFetched, SESSIONS_CACHE_TTL)) {
    logger.debug('Cloud sessions cache hit', { projectPath });
    return {
      success: true,
      sessions: cached.sessions,
      cached: true,
    };
  }

  // Fetch from Modal
  const result = await listCloudSessions(projectPath);

  if (!result.success) {
    logger.warn('Failed to get cloud sessions', { projectPath, error: result.error });
    return {
      success: false,
      error: result.error,
    };
  }

  // Update cache
  const sessions = result.sessions || [];
  sessionsCache.set(projectPath, {
    sessions,
    lastFetched: new Date(),
  });

  // Also cache individual sessions
  for (const session of sessions) {
    sessionCache.set(session.id, {
      session,
      lastFetched: new Date(),
    });
  }

  logger.debug('Cloud sessions fetched and cached', {
    projectPath,
    count: sessions.length,
  });

  return {
    success: true,
    sessions,
    cached: false,
  };
}

/**
 * Get all recent cloud sessions across all projects
 *
 * @param limit - Maximum number of sessions to return (default: 20)
 * @returns Array of cloud sessions sorted by most recent activity
 */
export async function getRecentCloudSessions(limit: number = 20): Promise<CloudSession[]> {
  const projectPaths = await listCloudProjectPaths();

  if (projectPaths.length === 0) {
    return [];
  }

  const allSessions: CloudSession[] = [];

  // Fetch sessions from all projects
  for (const projectPath of projectPaths) {
    const result = await getCloudSessionsForProject(projectPath);
    if (result.success && result.sessions) {
      allSessions.push(...result.sessions);
    }
  }

  // Sort by most recent activity
  allSessions.sort((a, b) => {
    const aTime = new Date(a.lastActivityAt).getTime();
    const bTime = new Date(b.lastActivityAt).getTime();
    return bTime - aTime;
  });

  return allSessions.slice(0, limit);
}

/**
 * Get a specific cloud session by ID
 *
 * @param sessionId - The session UUID
 * @param projectPath - The encoded project path (optional, will search if not provided)
 * @returns Cloud session or null if not found
 */
export async function getCloudSession(
  sessionId: string,
  projectPath?: string
): Promise<CloudSession | null> {
  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && isCacheValid(cached.lastFetched, SESSIONS_CACHE_TTL)) {
    logger.debug('Cloud session cache hit', { sessionId });
    return cached.session;
  }

  // If we have a project path, fetch directly
  if (projectPath) {
    const result = await getCloudSessionsForProject(projectPath);
    if (result.success && result.sessions) {
      const session = result.sessions.find((s) => s.id === sessionId);
      if (session) {
        return session;
      }
    }
    return null;
  }

  // Otherwise, search all projects
  const projectPaths = await listCloudProjectPaths();

  for (const path of projectPaths) {
    const result = await getCloudSessionsForProject(path);
    if (result.success && result.sessions) {
      const session = result.sessions.find((s) => s.id === sessionId);
      if (session) {
        return session;
      }
    }
  }

  return null;
}

/**
 * Get messages for a cloud session
 *
 * @param sessionId - The session UUID
 * @param projectPath - The encoded project path
 * @returns Cloud messages result
 */
export async function getCloudSessionMessages(
  sessionId: string,
  projectPath: string
): Promise<CloudMessagesResult> {
  // Check cache first
  const cacheKey = `${projectPath}:${sessionId}`;
  const cached = messagesCache.get(cacheKey);

  if (cached && isCacheValid(cached.lastFetched, MESSAGES_CACHE_TTL)) {
    logger.debug('Cloud messages cache hit', { sessionId });
    const parsedMessages = parseRawMessages(cached.messages, sessionId);
    return {
      success: true,
      messages: parsedMessages,
      status: inferStatusFromMessages(parsedMessages),
      cached: true,
    };
  }

  // Fetch from Modal
  const result = await getCloudMessages(sessionId, projectPath);

  if (!result.success) {
    logger.warn('Failed to get cloud messages', { sessionId, error: result.error });
    return {
      success: false,
      error: result.error,
    };
  }

  const rawMessages = result.messages || [];

  // Update cache
  messagesCache.set(cacheKey, {
    messages: rawMessages,
    lastFetched: new Date(),
  });

  // Parse messages
  const parsedMessages = parseRawMessages(rawMessages, sessionId);

  logger.debug('Cloud messages fetched and cached', {
    sessionId,
    rawCount: rawMessages.length,
    parsedCount: parsedMessages.length,
  });

  return {
    success: true,
    messages: parsedMessages,
    status: inferStatusFromMessages(parsedMessages),
    cached: false,
  };
}

// ============================================================
// Merged Session Utilities
// ============================================================

/**
 * Convert a local session to MergedSession format
 */
export function toLocalMergedSession(session: {
  id: string;
  projectPath: string;
  projectName: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  status: SessionStatus;
}): LocalSession {
  return {
    id: session.id,
    projectPath: session.projectPath,
    projectName: session.projectName,
    startedAt: session.startedAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    messageCount: session.messageCount,
    status: session.status,
    source: 'local',
  };
}

/**
 * Convert a CloudSession to MergedSession format
 */
export function toCloudMergedSession(session: CloudSession): SharedCloudSession {
  return {
    id: session.id,
    projectPath: session.projectPath,
    projectName: session.projectName,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    messageCount: session.messageCount,
    status: session.status,
    source: 'cloud',
  };
}

/**
 * Merge local and cloud sessions into a unified list
 *
 * @param localSessions - Sessions from the local laptop
 * @param cloudSessions - Sessions from Modal cloud
 * @param sortBy - Sort order ('recent' for most recent first)
 * @returns Merged array of sessions with source indicators
 */
export function mergeSessions(
  localSessions: Array<{
    id: string;
    projectPath: string;
    projectName: string;
    startedAt: Date;
    lastActivityAt: Date;
    messageCount: number;
    status: SessionStatus;
  }>,
  cloudSessions: CloudSession[],
  sortBy: 'recent' = 'recent'
): MergedSession[] {
  const merged: MergedSession[] = [];

  // Add local sessions
  for (const session of localSessions) {
    merged.push(toLocalMergedSession(session));
  }

  // Add cloud sessions (exclude duplicates by ID)
  const localIds = new Set(localSessions.map((s) => s.id));
  for (const session of cloudSessions) {
    if (!localIds.has(session.id)) {
      merged.push(toCloudMergedSession(session));
    }
  }

  // Sort by most recent activity
  if (sortBy === 'recent') {
    merged.sort((a, b) => {
      const aTime = new Date(a.lastActivityAt).getTime();
      const bTime = new Date(b.lastActivityAt).getTime();
      return bTime - aTime;
    });
  }

  return merged;
}

/**
 * Check if a session is from the cloud
 */
export function isCloudSession(session: MergedSession): session is SharedCloudSession {
  return session.source === 'cloud';
}

/**
 * Check if a session is from the local laptop
 */
export function isLocalSession(session: MergedSession): session is LocalSession {
  return session.source === 'local';
}
