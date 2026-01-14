/**
 * Project Scanner Service
 *
 * Scans ~/.claude/projects/ to discover all projects with Claude Code sessions.
 * Returns project metadata including path, name, session count, and last activity.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../lib/logger.js';
import {
  decodePath,
  getProjectName,
  getProjectsBasePath,
  isEncodedPath,
} from '../lib/pathEncoder.js';
import {
  parseJsonlFile,
  getSessionMetadata,
  extractProjectPath,
  getFirstUserMessagePreview,
} from '../lib/jsonlParser.js';

// ============================================================
// Types
// ============================================================

/** Project derived from ~/.claude/projects/ structure */
export interface Project {
  /** Full path to project */
  path: string;
  /** Basename of path */
  name: string;
  /** Claude's encoded folder name */
  encodedPath: string;
  /** Number of sessions */
  sessionCount: number;
  /** Most recent session ID */
  lastSessionId?: string;
  /** Last activity timestamp */
  lastActivityAt?: Date;
}

/** Summary of a session for listing */
export interface SessionSummary {
  /** Session UUID (filename without .jsonl) */
  id: string;
  /** Full path to the JSONL file */
  filePath: string;
  /** Session start time */
  startedAt: Date | null;
  /** Last activity time */
  lastActivityAt: Date | null;
  /** Number of messages */
  messageCount: number;
  /** First user message preview (truncated to 100 chars) */
  preview: string | null;
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Get all .jsonl files in a directory
 */
async function getJsonlFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => entry.name);
  } catch (error) {
    logger.warn('Failed to read directory', { path: dirPath, error });
    return [];
  }
}

/**
 * Check if a directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Extract session ID from filename
 * Handles both regular sessions (UUID.jsonl) and agent sessions (agent-XXXX.jsonl)
 */
function extractSessionId(filename: string): string {
  return filename.replace('.jsonl', '');
}

/**
 * Check if a session file is a main session (not an agent sidechain)
 * Agent files are named like: agent-a4cbf22.jsonl
 * Main sessions are UUIDs like: 338848a9-14dd-42bb-b030-4a9d6d873ca9.jsonl
 */
function isMainSession(filename: string): boolean {
  // Agent sidechains start with "agent-"
  return !filename.startsWith('agent-');
}

// ============================================================
// Public API
// ============================================================

/**
 * Scan ~/.claude/projects/ and return all projects with sessions
 *
 * @returns Array of projects sorted by most recently active
 */
export async function scanProjects(): Promise<Project[]> {
  const projectsPath = getProjectsBasePath();

  // Check if projects directory exists
  if (!(await directoryExists(projectsPath))) {
    logger.info('Claude projects directory does not exist', { path: projectsPath });
    return [];
  }

  try {
    const entries = await fs.readdir(projectsPath, { withFileTypes: true });
    const projects: Project[] = [];

    for (const entry of entries) {
      // Skip non-directories and hidden files
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }

      // Skip if not an encoded path
      if (!isEncodedPath(entry.name)) {
        continue;
      }

      const projectDirPath = path.join(projectsPath, entry.name);
      const jsonlFiles = await getJsonlFiles(projectDirPath);

      // Only include main sessions (not agent sidechains)
      const mainSessionFiles = jsonlFiles.filter(isMainSession);

      if (mainSessionFiles.length === 0) {
        // Skip projects with no main sessions
        continue;
      }

      // First, try to extract project path from ANY jsonl file (including agents)
      // Main session files might be empty, but agent files usually have cwd
      let projectPath: string | null = null;
      for (const file of jsonlFiles) {
        if (projectPath) break;
        const filePath = path.join(projectDirPath, file);
        try {
          const jsonlEntries = await parseJsonlFile(filePath);
          projectPath = extractProjectPath(jsonlEntries);
        } catch {
          // Ignore errors, try next file
        }
      }

      // Fall back to decoding folder name if we couldn't extract from JSONL
      const decodedPath = projectPath || decodePath(entry.name);
      const projectName = getProjectName(decodedPath);

      // Find the most recent session from main session files
      let lastActivityAt: Date | null = null;
      let lastSessionId: string | undefined;

      for (const file of mainSessionFiles) {
        const filePath = path.join(projectDirPath, file);
        try {
          const jsonlEntries = await parseJsonlFile(filePath);
          const metadata = getSessionMetadata(jsonlEntries);

          if (metadata.lastActivityAt) {
            if (!lastActivityAt || metadata.lastActivityAt > lastActivityAt) {
              lastActivityAt = metadata.lastActivityAt;
              lastSessionId = extractSessionId(file);
            }
          }
        } catch (error) {
          logger.warn('Failed to parse session file', { file: filePath, error });
        }
      }

      projects.push({
        path: decodedPath,
        name: projectName,
        encodedPath: entry.name,
        sessionCount: mainSessionFiles.length,
        lastSessionId,
        lastActivityAt: lastActivityAt ?? undefined,
      });
    }

    // Sort by most recently active (newest first)
    projects.sort((a, b) => {
      if (!a.lastActivityAt && !b.lastActivityAt) return 0;
      if (!a.lastActivityAt) return 1;
      if (!b.lastActivityAt) return -1;
      return b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
    });

    logger.info('Scanned projects', { count: projects.length });
    return projects;
  } catch (error) {
    logger.error('Failed to scan projects directory', {
      path: projectsPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get a single project by its encoded path
 *
 * @param encodedPath - The encoded folder name (e.g., '-Users-derek-myproject')
 * @returns Project details or null if not found
 */
export async function getProject(encodedPath: string): Promise<Project | null> {
  const projectsPath = getProjectsBasePath();
  const projectDirPath = path.join(projectsPath, encodedPath);

  // Check if project directory exists
  if (!(await directoryExists(projectDirPath))) {
    return null;
  }

  const jsonlFiles = await getJsonlFiles(projectDirPath);
  const mainSessionFiles = jsonlFiles.filter(isMainSession);

  if (mainSessionFiles.length === 0) {
    return null;
  }

  // First, try to extract project path from ANY jsonl file (including agents)
  let projectPath: string | null = null;
  for (const file of jsonlFiles) {
    if (projectPath) break;
    const filePath = path.join(projectDirPath, file);
    try {
      const jsonlEntries = await parseJsonlFile(filePath);
      projectPath = extractProjectPath(jsonlEntries);
    } catch {
      // Ignore errors, try next file
    }
  }

  // Fall back to decoding folder name if we couldn't extract from JSONL
  const decodedPath = projectPath || decodePath(encodedPath);
  const projectName = getProjectName(decodedPath);

  // Find the most recent session from main session files
  let lastActivityAt: Date | null = null;
  let lastSessionId: string | undefined;

  for (const file of mainSessionFiles) {
    const filePath = path.join(projectDirPath, file);
    try {
      const jsonlEntries = await parseJsonlFile(filePath);
      const metadata = getSessionMetadata(jsonlEntries);

      if (metadata.lastActivityAt) {
        if (!lastActivityAt || metadata.lastActivityAt > lastActivityAt) {
          lastActivityAt = metadata.lastActivityAt;
          lastSessionId = extractSessionId(file);
        }
      }
    } catch (error) {
      logger.warn('Failed to parse session file', { file: filePath, error });
    }
  }

  return {
    path: decodedPath,
    name: projectName,
    encodedPath,
    sessionCount: mainSessionFiles.length,
    lastSessionId,
    lastActivityAt: lastActivityAt ?? undefined,
  };
}

/**
 * Get all sessions for a project
 *
 * @param encodedPath - The encoded folder name
 * @returns Array of session summaries sorted by most recent first
 */
export async function getSessionsForProject(encodedPath: string): Promise<SessionSummary[]> {
  const projectsPath = getProjectsBasePath();
  const projectDirPath = path.join(projectsPath, encodedPath);

  // Check if project directory exists
  if (!(await directoryExists(projectDirPath))) {
    return [];
  }

  const jsonlFiles = await getJsonlFiles(projectDirPath);
  const mainSessionFiles = jsonlFiles.filter(isMainSession);

  const sessions: SessionSummary[] = [];

  for (const file of mainSessionFiles) {
    const filePath = path.join(projectDirPath, file);
    const sessionId = extractSessionId(file);

    try {
      const entries = await parseJsonlFile(filePath);
      const metadata = getSessionMetadata(entries);
      const preview = getFirstUserMessagePreview(entries);

      sessions.push({
        id: sessionId,
        filePath,
        startedAt: metadata.startedAt,
        lastActivityAt: metadata.lastActivityAt,
        messageCount: metadata.messageCount,
        preview,
      });
    } catch (error) {
      logger.warn('Failed to parse session file', { file: filePath, error });
      // Include session with null metadata
      sessions.push({
        id: sessionId,
        filePath,
        startedAt: null,
        lastActivityAt: null,
        messageCount: 0,
        preview: null,
      });
    }
  }

  // Sort by most recent activity (newest first)
  sessions.sort((a, b) => {
    if (!a.lastActivityAt && !b.lastActivityAt) return 0;
    if (!a.lastActivityAt) return 1;
    if (!b.lastActivityAt) return -1;
    return b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
  });

  return sessions;
}

/**
 * Find which project a session belongs to
 *
 * @param sessionId - The session UUID
 * @returns Project containing the session, or null if not found
 */
export async function findProjectBySession(sessionId: string): Promise<Project | null> {
  const projectsPath = getProjectsBasePath();

  if (!(await directoryExists(projectsPath))) {
    return null;
  }

  try {
    const entries = await fs.readdir(projectsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || !isEncodedPath(entry.name)) {
        continue;
      }

      const projectDirPath = path.join(projectsPath, entry.name);
      const sessionFile = `${sessionId}.jsonl`;
      const sessionPath = path.join(projectDirPath, sessionFile);

      try {
        await fs.access(sessionPath);
        // Session file exists in this project
        return getProject(entry.name);
      } catch {
        // Session file doesn't exist here, continue searching
      }
    }

    return null;
  } catch (error) {
    logger.error('Failed to search for session', { sessionId, error });
    return null;
  }
}
