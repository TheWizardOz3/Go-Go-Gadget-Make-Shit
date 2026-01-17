/**
 * GitHub API utilities for fetching repo data
 *
 * Used in cloud mode to fetch file trees directly from GitHub
 * when the laptop is unavailable.
 */

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
