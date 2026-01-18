/**
 * Local Cache for Offline Access
 *
 * Stores project and session data in localStorage for viewing when
 * the laptop is unavailable (cloud mode). This provides context
 * about what was being worked on.
 */

import type { ProjectSerialized, SessionSummarySerialized } from '@shared/types';

// ============================================================
// Constants
// ============================================================

const CACHE_KEY_PROJECTS = 'ggg_cache_projects';
const CACHE_KEY_SESSIONS_PREFIX = 'ggg_cache_sessions_';
const CACHE_KEY_FILES_PREFIX = 'ggg_cache_files_';
const CACHE_KEY_TREE_PREFIX = 'ggg_cache_tree_';
const CACHE_KEY_CONTENT_PREFIX = 'ggg_cache_content_';
const CACHE_KEY_LAST_SYNC = 'ggg_cache_last_sync';

// ============================================================
// Types
// ============================================================

/** Cached file info (matches FileChange from shared types) */
export interface CachedFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions?: number;
  deletions?: number;
}

/** Cached file tree entry */
export interface CachedFileTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension: string | null;
  children?: CachedFileTreeEntry[];
}

/** Cached file tree response */
export interface CachedFileTree {
  path: string;
  githubUrl: string | null;
  branch: string;
  entries: CachedFileTreeEntry[];
}

// ============================================================
// Types
// ============================================================

interface CachedData<T> {
  data: T;
  timestamp: number;
}

// ============================================================
// Projects Cache
// ============================================================

/**
 * Cache projects data for offline access
 */
export function cacheProjects(projects: ProjectSerialized[]): void {
  try {
    const cached: CachedData<ProjectSerialized[]> = {
      data: projects,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(cached));
    localStorage.setItem(CACHE_KEY_LAST_SYNC, new Date().toISOString());
  } catch (e) {
    // localStorage might be full or unavailable
    console.warn('Failed to cache projects:', e);
  }
}

/**
 * Get cached projects for offline viewing
 */
export function getCachedProjects(): ProjectSerialized[] | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY_PROJECTS);
    if (!stored) return null;

    const cached: CachedData<ProjectSerialized[]> = JSON.parse(stored);
    return cached.data;
  } catch {
    return null;
  }
}

/**
 * Get the timestamp of the last successful sync
 */
export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY_LAST_SYNC);
  } catch {
    return null;
  }
}

// ============================================================
// Sessions Cache
// ============================================================

/**
 * Cache sessions for a specific project
 */
export function cacheSessions(encodedPath: string, sessions: SessionSummarySerialized[]): void {
  try {
    const cached: CachedData<SessionSummarySerialized[]> = {
      data: sessions,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_SESSIONS_PREFIX + encodedPath, JSON.stringify(cached));
  } catch (e) {
    console.warn('Failed to cache sessions:', e);
  }
}

/**
 * Get cached sessions for offline viewing
 */
export function getCachedSessions(encodedPath: string): SessionSummarySerialized[] | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY_SESSIONS_PREFIX + encodedPath);
    if (!stored) return null;

    const cached: CachedData<SessionSummarySerialized[]> = JSON.parse(stored);
    return cached.data;
  } catch {
    return null;
  }
}

// ============================================================
// File Tree Cache
// ============================================================

/**
 * Cache the file tree for a specific project
 */
export function cacheFileTree(encodedPath: string, tree: CachedFileTree): void {
  try {
    const cached: CachedData<CachedFileTree> = {
      data: tree,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_TREE_PREFIX + encodedPath, JSON.stringify(cached));
  } catch (e) {
    console.warn('Failed to cache file tree:', e);
  }
}

/**
 * Get cached file tree for offline viewing
 */
export function getCachedFileTree(encodedPath: string): CachedFileTree | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY_TREE_PREFIX + encodedPath);
    if (!stored) return null;

    const cached: CachedData<CachedFileTree> = JSON.parse(stored);
    return cached.data;
  } catch {
    return null;
  }
}

// ============================================================
// Files Cache
// ============================================================

/**
 * Cache files changed for a specific project
 */
export function cacheFilesChanged(encodedPath: string, files: CachedFileChange[]): void {
  try {
    const cached: CachedData<CachedFileChange[]> = {
      data: files,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_FILES_PREFIX + encodedPath, JSON.stringify(cached));
  } catch (e) {
    console.warn('Failed to cache files:', e);
  }
}

/**
 * Get cached files changed for offline viewing
 */
export function getCachedFilesChanged(encodedPath: string): CachedFileChange[] | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY_FILES_PREFIX + encodedPath);
    if (!stored) return null;

    const cached: CachedData<CachedFileChange[]> = JSON.parse(stored);
    return cached.data;
  } catch {
    return null;
  }
}

// ============================================================
// File Content Cache
// ============================================================

/** Cached file content */
export interface CachedFileContent {
  path: string;
  content: string;
  language: string;
  githubUrl: string | null;
}

/**
 * Cache file content for a specific file
 * Key is encodedPath + filePath to ensure uniqueness
 */
export function cacheFileContent(
  encodedPath: string,
  filePath: string,
  content: CachedFileContent
): void {
  try {
    const key = `${CACHE_KEY_CONTENT_PREFIX}${encodedPath}:${filePath}`;
    const cached: CachedData<CachedFileContent> = {
      data: content,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (e) {
    console.warn('Failed to cache file content:', e);
  }
}

/**
 * Get cached file content for offline viewing
 */
export function getCachedFileContent(
  encodedPath: string,
  filePath: string
): CachedFileContent | null {
  try {
    const key = `${CACHE_KEY_CONTENT_PREFIX}${encodedPath}:${filePath}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedData<CachedFileContent> = JSON.parse(stored);
    return cached.data;
  } catch {
    return null;
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Clear all cached data (useful for debugging or user-triggered refresh)
 */
export function clearCache(): void {
  try {
    // Get all localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ggg_cache_')) {
        keysToRemove.push(key);
      }
    }
    // Remove them
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

/**
 * Get a human-readable "time ago" string for the last sync
 */
export function getLastSyncRelative(): string | null {
  const lastSync = getLastSyncTime();
  if (!lastSync) return null;

  const syncDate = new Date(lastSync);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
