/**
 * Path Encoder/Decoder for Claude Code project paths
 *
 * Claude Code encodes project paths for storage in ~/.claude/projects/
 * The encoding scheme replaces `/` with `-`, resulting in folder names like:
 *   /Users/derek/myproject → -Users-derek-myproject
 *
 * This module provides utilities to encode and decode these paths.
 */

import path from 'path';

// ============================================================
// Core Encoding/Decoding Functions
// ============================================================

/**
 * Encode an absolute file path to Claude's folder name format
 *
 * @param absolutePath - Absolute path to a project directory
 * @returns Encoded path suitable for ~/.claude/projects/ folder name
 *
 * @example
 * encodePath('/Users/derek/myproject')
 * // Returns: '-Users-derek-myproject'
 */
export function encodePath(absolutePath: string): string {
  // Normalize the path to handle trailing slashes, etc.
  const normalized = path.normalize(absolutePath);

  // Replace all forward slashes with dashes
  // This naturally handles the leading `/` becoming a leading `-`
  return normalized.replace(/\//g, '-');
}

/**
 * Decode a Claude folder name back to an absolute file path
 *
 * @param encodedPath - Encoded folder name from ~/.claude/projects/
 * @returns Decoded absolute file path
 *
 * @example
 * decodePath('-Users-derek-myproject')
 * // Returns: '/Users/derek/myproject'
 */
export function decodePath(encodedPath: string): string {
  // Replace all dashes with forward slashes
  // This naturally handles the leading `-` becoming a leading `/`
  return encodedPath.replace(/-/g, '/');
}

/**
 * Extract the project name (basename) from an absolute path
 *
 * @param absolutePath - Absolute path to a project directory
 * @returns The basename of the path (last directory name)
 *
 * @example
 * getProjectName('/Users/derek/myproject')
 * // Returns: 'myproject'
 */
export function getProjectName(absolutePath: string): string {
  return path.basename(absolutePath);
}

/**
 * Extract the project name from an encoded path
 *
 * @param encodedPath - Encoded folder name from ~/.claude/projects/
 * @returns The basename of the decoded path
 *
 * @example
 * getProjectNameFromEncoded('-Users-derek-myproject')
 * // Returns: 'myproject'
 */
export function getProjectNameFromEncoded(encodedPath: string): string {
  const decoded = decodePath(encodedPath);
  return getProjectName(decoded);
}

// ============================================================
// Validation Functions
// ============================================================

/**
 * Check if a string looks like an encoded Claude path
 *
 * Encoded paths start with a dash (from the leading /)
 *
 * @param str - String to check
 * @returns True if the string appears to be an encoded path
 */
export function isEncodedPath(str: string): boolean {
  // Encoded paths start with `-` (from the leading `/`)
  // and should contain at least one more `-` for a meaningful path
  return str.startsWith('-') && str.length > 1;
}

/**
 * Check if a string is a valid absolute path
 *
 * @param str - String to check
 * @returns True if the string is an absolute path
 */
export function isAbsolutePath(str: string): boolean {
  return path.isAbsolute(str);
}

// ============================================================
// Path Construction Helpers
// ============================================================

/**
 * Get the full path to a project's session folder in ~/.claude/projects/
 *
 * @param projectPath - Absolute path to the project
 * @param claudeBasePath - Base path to Claude's data directory (default: ~/.claude)
 * @returns Full path to the project's session folder
 *
 * @example
 * getProjectSessionsPath('/Users/derek/myproject')
 * // Returns: '/Users/derek/.claude/projects/-Users-derek-myproject'
 */
export function getProjectSessionsPath(projectPath: string, claudeBasePath?: string): string {
  const basePath = claudeBasePath || path.join(process.env.HOME || '', '.claude');
  const encodedPath = encodePath(projectPath);
  return path.join(basePath, 'projects', encodedPath);
}

/**
 * Get the default Claude base path (~/.claude)
 *
 * @returns Path to ~/.claude directory
 */
export function getClaudeBasePath(): string {
  return path.join(process.env.HOME || '', '.claude');
}

/**
 * Get the projects directory path (~/.claude/projects)
 *
 * @returns Path to ~/.claude/projects directory
 */
export function getProjectsBasePath(): string {
  return path.join(getClaudeBasePath(), 'projects');
}
