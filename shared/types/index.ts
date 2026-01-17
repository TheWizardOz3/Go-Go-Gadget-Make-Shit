/**
 * Shared types for GoGoGadgetClaude
 * Used by both client and server packages
 * Data models from architecture.md Section 4.3
 */

// =============================================================================
// Session Types
// =============================================================================

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

/** Session with ISO string dates (for API responses) */
export interface SessionSerialized {
  id: string;
  projectPath: string;
  projectName: string;
  startedAt: string;
  lastActivityAt: string;
  messageCount: number;
  status: SessionStatus;
}

/** Summary of a session for listing (lighter than full Session) */
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

/** SessionSummary with ISO string dates (for API responses) */
export interface SessionSummarySerialized {
  id: string;
  filePath: string;
  startedAt: string | null;
  lastActivityAt: string | null;
  messageCount: number;
  /** First user message preview (truncated to 100 chars) */
  preview: string | null;
}

// =============================================================================
// Message Types
// =============================================================================

/** Message sender type */
export type MessageType = 'user' | 'assistant';

/** Tool use event status */
export type ToolUseStatus = 'pending' | 'complete' | 'error';

/** Tool use event from JSONL tool_use entries */
export interface ToolUseEvent {
  /** Tool name, e.g., 'write_file', 'run_command' */
  tool: string;
  /** Tool input parameters */
  input: Record<string, unknown>;
  /** Tool output (if complete) */
  output?: string;
  /** Execution status */
  status: ToolUseStatus;
}

/** Message parsed from JSONL */
export interface Message {
  /** Generated or from JSONL */
  id: string;
  /** Parent session ID */
  sessionId: string;
  /** Sender type */
  type: MessageType;
  /** Message content (may contain markdown) */
  content: string;
  /** Message timestamp */
  timestamp: Date;
  /** File edits, commands, etc. */
  toolUse?: ToolUseEvent[];
}

/** Message with ISO string date (for API responses) */
export interface MessageSerialized {
  id: string;
  sessionId: string;
  type: MessageType;
  content: string;
  timestamp: string;
  toolUse?: ToolUseEvent[];
}

// =============================================================================
// Project Types
// =============================================================================

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

/** Project with ISO string date (for API responses) */
export interface ProjectSerialized {
  path: string;
  name: string;
  encodedPath: string;
  sessionCount: number;
  lastSessionId?: string;
  lastActivityAt?: string;
}

// =============================================================================
// Template Types
// =============================================================================

/** Prompt template from .claude/templates.yaml */
export interface Template {
  /** Display label */
  label: string;
  /** Icon identifier or emoji */
  icon: string;
  /** The prompt text to send */
  prompt: string;
}

// =============================================================================
// File Change Types
// =============================================================================

/** File change status from git diff */
export type FileChangeStatus = 'added' | 'modified' | 'deleted';

/** File change from git diff */
export interface FileChange {
  /** File path relative to repo root */
  path: string;
  /** Change type */
  status: FileChangeStatus;
  /** Lines added */
  additions: number;
  /** Lines removed */
  deletions: number;
}

// =============================================================================
// File Diff Types (for diff view feature)
// =============================================================================

/** Line type in a diff */
export type DiffLineType = 'context' | 'add' | 'delete';

/** A single line in a diff hunk */
export interface DiffLine {
  /** Type of change for this line */
  type: DiffLineType;
  /** Line content (without +/- prefix) */
  content: string;
  /** Line number in the old file (undefined for added lines) */
  oldLineNumber?: number;
  /** Line number in the new file (undefined for deleted lines) */
  newLineNumber?: number;
}

/** A hunk (section) of changes in a diff */
export interface DiffHunk {
  /** Starting line number in the old file */
  oldStart: number;
  /** Number of lines from the old file in this hunk */
  oldLines: number;
  /** Starting line number in the new file */
  newStart: number;
  /** Number of lines in the new file in this hunk */
  newLines: number;
  /** The actual lines in this hunk */
  lines: DiffLine[];
}

/** Full diff for a single file */
export interface FileDiff {
  /** File path relative to repo root */
  path: string;
  /** Change type */
  status: FileChangeStatus;
  /** Old path (for renamed files) */
  oldPath?: string;
  /** File language for syntax highlighting (e.g., 'typescript', 'python') */
  language?: string;
  /** Whether the file is binary (cannot display diff) */
  isBinary: boolean;
  /** Whether the file is too large to display efficiently (>10,000 lines) */
  isTooBig: boolean;
  /** Diff hunks containing the changes */
  hunks: DiffHunk[];
}

// =============================================================================
// File Tree Types (for file tree view feature)
// =============================================================================

/** Entry type in file tree */
export type FileTreeEntryType = 'file' | 'directory';

/** A single entry (file or folder) in the file tree */
export interface FileTreeEntry {
  /** File or folder name */
  name: string;
  /** Relative path from project root */
  path: string;
  /** Entry type */
  type: FileTreeEntryType;
  /** File extension (null for directories) */
  extension: string | null;
  /** Children entries (only for directories, populated on expand) */
  children?: FileTreeEntry[];
}

/** Response from GET /api/projects/:id/tree */
export interface FileTreeResponse {
  /** Root or subdirectory path */
  path: string;
  /** GitHub repo URL (null if not a GitHub repo) */
  githubUrl: string | null;
  /** Current git branch */
  branch: string;
  /** Tree entries (files and folders) */
  entries: FileTreeEntry[];
}

/** Response from GET /api/projects/:id/content/:filepath */
export interface FileContentResponse {
  /** File path relative to project root */
  path: string;
  /** File name */
  name: string;
  /** File extension (null if no extension) */
  extension: string | null;
  /** Detected language for syntax highlighting */
  language: string;
  /** File content (text) */
  content: string;
  /** Line count */
  lineCount: number;
  /** GitHub URL for this file (null if not GitHub) */
  githubUrl: string | null;
}

// =============================================================================
// Settings Types
// =============================================================================

/** App theme preference */
export type ThemePreference = 'light' | 'dark' | 'system';

/** App settings stored in ~/.gogogadgetclaude/settings.json */
export interface AppSettings {
  /** Whether notifications are enabled */
  notificationsEnabled: boolean;
  /** Phone number for iMessage notifications */
  notificationPhoneNumber?: string;
  /** Server hostname for notification links (e.g., "dereks-macbook-pro" or "my-mac.tailnet.ts.net") */
  serverHostname?: string;
  /** User's custom templates */
  defaultTemplates: Template[];
  /** Theme preference */
  theme: ThemePreference;
  /** Allow Claude to make edits without asking for permission (skips permission prompts) */
  allowEdits?: boolean;
}

// =============================================================================
// API Response Types
// =============================================================================

/** Standard API success response wrapper */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
  };
}

/** Standard API error response */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** Health check response */
export interface StatusResponse {
  healthy: boolean;
  claudeRunning: boolean;
}

// =============================================================================
// Session Messages API Response Types
// =============================================================================

/** Response from GET /api/sessions/:id/messages */
export interface MessagesResponse {
  messages: MessageSerialized[];
  status: SessionStatus;
  sessionId: string;
}

/** Response from GET /api/sessions/:id/status */
export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
}
