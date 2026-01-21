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
  /** Unified project identifier (git remote URL or project name) for cross-environment matching */
  projectIdentifier?: string;
  /** Source environment where the session was created */
  source?: 'local' | 'cloud';
  /** If this session was continued from another environment (Phase 2) */
  continuedFrom?: {
    /** Original session ID */
    sessionId: string;
    /** Source environment of the original session */
    source: 'local' | 'cloud';
    /** When the continuation happened */
    timestamp: Date;
  };
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
  /** Unified project identifier (git remote URL or project name) for cross-environment matching */
  projectIdentifier?: string;
  /** Source environment where the session was created */
  source?: 'local' | 'cloud';
  /** If this session was continued from another environment (Phase 2) */
  continuedFrom?: {
    /** Original session ID */
    sessionId: string;
    /** Source environment of the original session */
    source: 'local' | 'cloud';
    /** When the continuation happened */
    timestamp: string;
  };
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
  /** Git remote URL (for cloud execution) */
  gitRemoteUrl?: string;
}

/** Project with ISO string date (for API responses) */
export interface ProjectSerialized {
  path: string;
  name: string;
  encodedPath: string;
  sessionCount: number;
  lastSessionId?: string;
  lastActivityAt?: string;
  /** Git remote URL (for cloud execution) */
  gitRemoteUrl?: string;
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
// Scheduled Prompts Types
// =============================================================================

/** Schedule recurrence type */
export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Execution status for last run */
export type ExecutionStatus = 'success' | 'failed';

/** Last execution result */
export interface LastExecution {
  /** When the execution occurred */
  timestamp: string;
  /** Whether it succeeded or failed */
  status: ExecutionStatus;
  /** Error message if failed */
  error?: string;
}

/** Scheduled prompt configuration */
export interface ScheduledPrompt {
  /** Unique identifier (UUID) */
  id: string;
  /** The prompt text to send */
  prompt: string;
  /** Recurrence pattern */
  scheduleType: ScheduleType;
  /** Time of day in "HH:MM" 24h format (e.g., "09:00") */
  timeOfDay: string;
  /** Day of week 0-6 (Sun-Sat), required for 'weekly' */
  dayOfWeek?: number;
  /** Day of month 1-28, required for 'monthly' */
  dayOfMonth?: number;
  /** Specific project path, or null for global (uses last active) */
  projectPath: string | null;
  /** Whether actively scheduled */
  enabled: boolean;
  /** When the prompt was created */
  createdAt: string;
  /** Most recent execution result */
  lastExecution?: LastExecution;
  /** Next scheduled run time */
  nextRunAt?: string;
}

/** Input for creating/updating a scheduled prompt */
export interface ScheduledPromptInput {
  /** The prompt text to send */
  prompt: string;
  /** Recurrence pattern */
  scheduleType: ScheduleType;
  /** Time of day in "HH:MM" 24h format */
  timeOfDay: string;
  /** Day of week 0-6, required if weekly */
  dayOfWeek?: number;
  /** Day of month 1-28, required if monthly */
  dayOfMonth?: number;
  /** Project path or null for global */
  projectPath: string | null;
}

/** Storage format for scheduled prompts file */
export interface ScheduledPromptsFile {
  prompts: ScheduledPrompt[];
}

// =============================================================================
// Serverless Execution Types (V1 Feature)
// =============================================================================

/** API endpoint mode - where the app is connecting to */
export type ApiEndpointMode = 'local' | 'cloud';

/** Cloud job execution status */
export type CloudJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Serverless execution settings */
export interface ServerlessSettings {
  /** Whether serverless mode is enabled */
  enabled: boolean;
  /** Modal API token (stored encrypted) */
  modalToken?: string;
  /** Claude API key for cloud execution (stored encrypted) */
  claudeApiKey?: string;
  /** Default git repository URL for cloud execution */
  defaultRepoUrl?: string;
  /** User's Tailscale/local laptop URL for connectivity checks */
  laptopUrl?: string;
}

/** Cloud job dispatch request */
export interface CloudJobDispatchRequest {
  /** The prompt to execute */
  prompt: string;
  /** Git repository URL to clone */
  repoUrl: string;
  /** Project name (used for JSONL organization) */
  projectName: string;
  /** Allowed tools for Claude (e.g., ["Task", "Bash", "Read", "Write"]) */
  allowedTools?: string[];
  /** Webhook URL for completion notification */
  notificationWebhook?: string;
  /** Optional image attachment */
  imageAttachment?: ImageAttachment;
}

/** Cloud job information */
export interface CloudJob {
  /** Unique job identifier */
  id: string;
  /** Current job status */
  status: CloudJobStatus;
  /** When the job was created */
  createdAt: string;
  /** When the job started executing (null if still queued) */
  startedAt?: string;
  /** When the job completed (null if not complete) */
  completedAt?: string;
  /** Project name for this job */
  projectName: string;
  /** Error message if job failed */
  error?: string;
  /** Session ID created by this job (available after completion) */
  sessionId?: string;
}

/** Cloud job dispatch response */
export interface CloudJobDispatchResponse {
  /** The created job ID */
  jobId: string;
  /** Initial status (typically 'queued') */
  status: CloudJobStatus;
  /** Estimated wait time in seconds */
  estimatedWaitSeconds?: number;
}

/** Cloud job status response */
export interface CloudJobStatusResponse {
  /** Job information */
  job: CloudJob;
}

/** Cloud session - extends Session with source indicator */
export interface CloudSession {
  /** Session UUID */
  id: string;
  /** Project path (encoded for cloud storage) */
  projectPath: string;
  /** Project name */
  projectName: string;
  /** First message timestamp (ISO string) */
  startedAt: string;
  /** Last activity timestamp (ISO string) */
  lastActivityAt: string;
  /** Total messages in session */
  messageCount: number;
  /** Current session status */
  status: SessionStatus;
  /** Source indicator - 'cloud' for cloud-executed sessions */
  source: 'cloud';
  /** Unified project identifier (git remote URL or project name) for cross-environment matching */
  projectIdentifier?: string;
  /** First user message preview (truncated) */
  preview?: string | null;
}

// ============================================================
// Context Continuation Types
// ============================================================

/** Context summary for cross-environment session continuation */
export interface ContextSummary {
  /** Original session ID */
  sessionId: string;
  /** Source environment */
  source: 'local' | 'cloud';
  /** Project path for context */
  projectPath: string;
  /** Project name */
  projectName: string;
  /** When the summary was generated (ISO string) */
  generatedAt: string;
  /** Compact summary text to inject as preamble */
  summaryText: string;
  /** Number of messages summarized */
  messageCount: number;
  /** First message timestamp (ISO string) */
  startedAt: string | null;
  /** Last message timestamp (ISO string) */
  lastActivityAt: string | null;
}

/** Local session with source indicator (for merged lists) */
export interface LocalSession extends SessionSerialized {
  /** Source indicator - 'local' for laptop-executed sessions */
  source: 'local';
}

/** Combined session type for UI (can be local or cloud) */
export type MergedSession = LocalSession | CloudSession;

/** API endpoint state for the client */
export interface ApiEndpointState {
  /** Current API base URL */
  baseUrl: string;
  /** Current mode (local or cloud) */
  mode: ApiEndpointMode;
  /** Whether connectivity check is in progress */
  isChecking: boolean;
  /** Last successful check timestamp */
  lastCheckedAt?: string;
}

/** Cloud execution cost estimate */
export interface CloudCostEstimate {
  /** Estimated compute cost in USD */
  computeCost: number;
  /** Estimated API cost in USD (if using BYOK) */
  apiCost?: number;
  /** Total estimated cost */
  totalCost: number;
  /** Cost per minute of execution */
  costPerMinute: number;
  /** Warning message if applicable */
  warning?: string;
}

// =============================================================================
// Image Attachment Types (for prompt attachments)
// =============================================================================

/** Image attachment for prompts (MVP: single image only) */
export interface ImageAttachment {
  /** Original filename */
  filename: string;
  /** MIME type (image/png, image/jpeg, image/webp) */
  mimeType: string;
  /** Base64-encoded image content (without data URL prefix) */
  base64: string;
}

/** Max image size: 5MB */
export const IMAGE_ATTACHMENT_MAX_SIZE = 5 * 1024 * 1024;

// =============================================================================
// Settings Types
// =============================================================================

/** App theme preference */
export type ThemePreference = 'light' | 'dark' | 'system';

// -----------------------------------------------------------------------------
// Notification Channel Settings
// -----------------------------------------------------------------------------

/** Settings for iMessage channel */
export interface IMessageChannelSettings {
  enabled: boolean;
  phoneNumber?: string;
}

/** Settings for ntfy channel (V1 Order 3) */
export interface NtfyChannelSettings {
  enabled: boolean;
  /** Server URL, e.g., "https://ntfy.sh" or self-hosted */
  serverUrl?: string;
  /** The topic name to publish to */
  topic?: string;
  /** Optional auth token for private servers */
  authToken?: string;
}

/** Settings for Slack channel (V1.2) */
export interface SlackChannelSettings {
  enabled: boolean;
  /** Slack webhook URL */
  webhookUrl?: string;
}

/** Settings for Telegram channel (V1.2) */
export interface TelegramChannelSettings {
  enabled: boolean;
  /** Telegram bot token */
  botToken?: string;
  /** Chat ID to send messages to */
  chatId?: string;
}

/** Settings for Email channel (V2) */
export interface EmailChannelSettings {
  enabled: boolean;
  /** SMTP host */
  smtpHost?: string;
  /** SMTP port */
  smtpPort?: number;
  /** SMTP username */
  smtpUser?: string;
  /** SMTP password */
  smtpPass?: string;
  /** Email recipient */
  recipient?: string;
}

/** All notification channel settings */
export interface NotificationChannelSettings {
  imessage?: IMessageChannelSettings;
  ntfy?: NtfyChannelSettings;
  slack?: SlackChannelSettings;
  telegram?: TelegramChannelSettings;
  email?: EmailChannelSettings;
}

// -----------------------------------------------------------------------------
// App Settings
// -----------------------------------------------------------------------------

/** App settings stored in ~/.gogogadgetclaude/settings.json */
export interface AppSettings {
  // === LEGACY (deprecated, migrated to channels) ===
  /**
   * @deprecated Use channels.imessage.enabled instead
   * Whether notifications are enabled (legacy field)
   */
  notificationsEnabled?: boolean;
  /**
   * @deprecated Use channels.imessage.phoneNumber instead
   * Phone number for iMessage notifications (legacy field)
   */
  notificationPhoneNumber?: string;

  // === NEW: Channel-based notifications ===
  /** Notification channel configurations */
  channels?: NotificationChannelSettings;

  // === SERVERLESS EXECUTION (V1) ===
  /** Serverless execution settings for cloud compute */
  serverless?: ServerlessSettings;

  // === UNCHANGED ===
  /** Server hostname for notification links (e.g., "dereks-macbook-pro" or "my-mac.tailnet.ts.net") */
  serverHostname?: string;
  /** User's custom templates */
  defaultTemplates: Template[];
  /** Theme preference */
  theme: ThemePreference;
  /** Allow Claude to make edits without asking for permission (skips permission prompts) */
  allowEdits?: boolean;
  /** Last active project path (used for global scheduled prompts) */
  lastActiveProjectPath?: string;
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
