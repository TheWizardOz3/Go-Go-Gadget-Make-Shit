/**
 * GitHub/Git utilities for fetching repo data
 *
 * Used in cloud mode to fetch file trees directly from GitHub
 * when the laptop is unavailable.
 *
 * Two fetch strategies:
 * 1. Modal endpoint (for private repos) - clones using stored GitHub token
 * 2. GitHub API (for public repos) - direct API call, no auth needed
 */

import { getApiMode, getCloudApiUrl } from './api';

// ============================================================
// Types
// ============================================================

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}

// ============================================================
// URL Parsing
// ============================================================

/**
 * Parse a GitHub URL to extract owner and repo
 * Supports various formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  // HTTPS format: https://github.com/owner/repo or https://github.com/owner/repo.git
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

// ============================================================
// API Functions
// ============================================================

/**
 * Fetch the file tree from GitHub
 * Uses the Git Trees API with recursive flag to get all files
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Branch name (default: main)
 * @returns Tree entries or null if failed
 */
export async function fetchGitHubTree(
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<GitHubTreeEntry[] | null> {
  try {
    // Try common default branches first
    const branches = ['main', 'master'];

    for (const b of branches) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${b}?recursive=1`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              // Note: For public repos, no auth needed
              // For private repos, would need: Authorization: `token ${token}`
            },
          }
        );

        if (response.ok) {
          const data: GitHubTreeResponse = await response.json();
          return data.tree;
        }
      } catch {
        // Try next branch
      }
    }

    // If specific branch was provided, try that
    if (branch !== 'main' && branch !== 'master') {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.ok) {
        const data: GitHubTreeResponse = await response.json();
        return data.tree;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch GitHub tree:', error);
    return null;
  }
}

/**
 * Convert flat GitHub tree entries to nested structure
 * Matches the CachedFileTreeEntry format
 */
export interface NestedTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension: string | null;
  children?: NestedTreeEntry[];
}

export function buildNestedTree(entries: GitHubTreeEntry[]): NestedTreeEntry[] {
  const root: NestedTreeEntry[] = [];
  const pathMap = new Map<string, NestedTreeEntry>();

  // Sort entries so directories come before their contents
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sorted) {
    const parts = entry.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const node: NestedTreeEntry = {
      name,
      path: entry.path,
      type: entry.type === 'tree' ? 'directory' : 'file',
      extension: entry.type === 'blob' ? getExtension(name) : null,
      children: entry.type === 'tree' ? [] : undefined,
    };

    pathMap.set(entry.path, node);

    if (parentPath === '') {
      // Root level
      root.push(node);
    } else {
      // Find parent and add as child
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  return root;
}

function getExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return null;
  return filename.slice(lastDot + 1);
}

// ============================================================
// Modal Cloud Fetch (works with private repos)
// ============================================================

interface ModalTreeResponse {
  data: {
    entries: Array<{
      name: string;
      path: string;
      type: 'file' | 'directory';
      extension: string | null;
    }>;
    branch: string;
    githubUrl: string | null;
    error?: string;
  };
}

/**
 * Fetch file tree via Modal cloud endpoint
 * This works with private repos if GITHUB_TOKEN is configured in Modal
 */
export async function fetchTreeViaModal(repoUrl: string): Promise<{
  entries: NestedTreeEntry[];
  branch: string;
  error?: string;
} | null> {
  const cloudUrl = getCloudApiUrl();
  if (!cloudUrl) return null;

  try {
    const response = await fetch(`${cloudUrl}/api/cloud/tree`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repoUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        entries: [],
        branch: 'main',
        error: errorData?.detail?.error?.message || 'Failed to fetch from Modal',
      };
    }

    const data: ModalTreeResponse = await response.json();

    if (data.data.error) {
      return {
        entries: [],
        branch: 'main',
        error: data.data.error,
      };
    }

    // Convert flat entries to nested tree
    const nested = buildNestedTreeFromFlat(data.data.entries);

    return {
      entries: nested,
      branch: data.data.branch,
    };
  } catch (error) {
    console.error('Modal tree fetch failed:', error);
    return null;
  }
}

/**
 * Build nested tree from flat entries (Modal returns flat list)
 */
function buildNestedTreeFromFlat(
  entries: Array<{
    name: string;
    path: string;
    type: 'file' | 'directory';
    extension: string | null;
  }>
): NestedTreeEntry[] {
  const root: NestedTreeEntry[] = [];
  const pathMap = new Map<string, NestedTreeEntry>();

  // Sort by path to ensure parents come before children
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sorted) {
    const parts = entry.path.split('/');
    const parentPath = parts.slice(0, -1).join('/');

    const node: NestedTreeEntry = {
      name: entry.name,
      path: entry.path,
      type: entry.type,
      extension: entry.extension,
      children: entry.type === 'directory' ? [] : undefined,
    };

    pathMap.set(entry.path, node);

    if (parentPath === '') {
      root.push(node);
    } else {
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  return root;
}

/**
 * Smart fetch that tries Modal first (for private repos), then GitHub API
 */
export async function fetchRepoTree(repoUrl: string): Promise<{
  entries: NestedTreeEntry[];
  branch: string;
  source: 'modal' | 'github';
  error?: string;
}> {
  // In cloud mode, try Modal first (works with private repos)
  if (getApiMode() === 'cloud') {
    const modalResult = await fetchTreeViaModal(repoUrl);
    if (modalResult && !modalResult.error && modalResult.entries.length > 0) {
      return {
        entries: modalResult.entries,
        branch: modalResult.branch,
        source: 'modal',
      };
    }
    // If Modal returned an error (like auth failure for private repo), include it
    if (modalResult?.error) {
      return {
        entries: [],
        branch: 'main',
        source: 'modal',
        error: modalResult.error,
      };
    }
  }

  // Fall back to GitHub API (public repos only)
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return {
      entries: [],
      branch: 'main',
      source: 'github',
      error: 'Invalid GitHub URL',
    };
  }

  const entries = await fetchGitHubTree(parsed.owner, parsed.repo);
  if (!entries) {
    return {
      entries: [],
      branch: 'main',
      source: 'github',
      error: 'Could not fetch from GitHub (may be private repo)',
    };
  }

  return {
    entries: buildNestedTree(entries),
    branch: 'main', // GitHub API doesn't easily tell us the branch
    source: 'github',
  };
}
