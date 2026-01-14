/**
 * JSONL Parser for Claude Code session files
 *
 * Parses the JSONL format used by Claude Code to store conversation sessions.
 * Located in ~/.claude/projects/[encoded-path]/[session-id].jsonl
 */

import { promises as fs } from 'fs';
import { logger } from './logger.js';

// ============================================================
// Message Types (matches shared/types/index.ts)
// ============================================================

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

// ============================================================
// Raw JSONL Types (as stored by Claude Code)
// ============================================================

/** Content block in assistant messages */
interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ContentBlock[];
}

/** Raw user message from JSONL */
interface RawUserMessage {
  role: 'user';
  content: string | ContentBlock[];
}

/** Raw assistant message from JSONL */
interface RawAssistantMessage {
  role: 'assistant';
  content: string | ContentBlock[];
  model?: string;
  id?: string;
  stop_reason?: string | null;
}

/** Base fields present in all JSONL entries */
interface BaseJsonlEntry {
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  type: string;
  cwd?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  agentId?: string;
}

/** User entry from JSONL */
export interface UserJsonlEntry extends BaseJsonlEntry {
  type: 'user';
  message: RawUserMessage;
}

/** Assistant entry from JSONL */
export interface AssistantJsonlEntry extends BaseJsonlEntry {
  type: 'assistant';
  message: RawAssistantMessage;
  error?: string;
  isApiErrorMessage?: boolean;
}

/** File history snapshot entry (skip these) */
interface FileHistoryEntry extends BaseJsonlEntry {
  type: 'file-history-snapshot';
  messageId: string;
  snapshot: unknown;
}

/** Union of all entry types */
export type RawJsonlEntry =
  | UserJsonlEntry
  | AssistantJsonlEntry
  | FileHistoryEntry
  | BaseJsonlEntry;

// ============================================================
// Parsing Functions
// ============================================================

/**
 * Parse a JSONL file into raw entries
 *
 * Reads the file line by line and parses each line as JSON.
 * Malformed lines are logged and skipped (no crash).
 *
 * @param filePath - Absolute path to the JSONL file
 * @returns Array of parsed entries
 */
export async function parseJsonlFile(filePath: string): Promise<RawJsonlEntry[]> {
  const entries: RawJsonlEntry[] = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      try {
        const entry = JSON.parse(line) as RawJsonlEntry;
        entries.push(entry);
      } catch {
        logger.warn('Malformed JSONL line, skipping', {
          file: filePath,
          lineNumber: i + 1,
          preview: line.substring(0, 100),
        });
      }
    }
  } catch (error) {
    logger.error('Failed to read JSONL file', {
      file: filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }

  return entries;
}

/**
 * Check if an entry should be included in the conversation
 *
 * Filters out:
 * - file-history-snapshot entries
 * - Meta messages (isMeta: true)
 * - API error messages (isApiErrorMessage: true)
 */
function shouldIncludeEntry(entry: RawJsonlEntry): boolean {
  // Skip file history snapshots
  if (entry.type === 'file-history-snapshot') {
    return false;
  }

  // Skip meta messages (system-level, not user-visible)
  if ('isMeta' in entry && entry.isMeta === true) {
    return false;
  }

  // Skip API error messages
  if ('isApiErrorMessage' in entry && entry.isApiErrorMessage === true) {
    return false;
  }

  // Only include user and assistant messages
  return entry.type === 'user' || entry.type === 'assistant';
}

/**
 * Extract text content from assistant message content blocks
 */
function extractTextFromContent(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter(
      (block): block is ContentBlock & { type: 'text'; text: string } =>
        block.type === 'text' && typeof block.text === 'string'
    )
    .map((block) => block.text)
    .join('\n\n');
}

/**
 * Extract tool use events from assistant message content blocks
 */
function extractToolUse(content: string | ContentBlock[]): ToolUseEvent[] {
  if (typeof content === 'string') {
    return [];
  }

  const toolUseBlocks = content.filter(
    (block): block is ContentBlock & { type: 'tool_use' } => block.type === 'tool_use'
  );

  return toolUseBlocks.map((block) => ({
    tool: block.name || 'unknown',
    input: block.input || {},
    status: 'complete' as ToolUseStatus, // In JSONL, tool_use blocks are completed
  }));
}

/**
 * Transform raw JSONL entries into Message objects
 *
 * @param entries - Raw entries from parseJsonlFile
 * @param sessionId - Session ID to associate with messages
 * @returns Array of Message objects sorted by timestamp
 */
export function transformToMessages(entries: RawJsonlEntry[], sessionId: string): Message[] {
  const messages: Message[] = [];

  for (const entry of entries) {
    // Filter out entries that shouldn't be shown
    if (!shouldIncludeEntry(entry)) {
      continue;
    }

    if (entry.type === 'user' && 'message' in entry) {
      const userEntry = entry as UserJsonlEntry;
      const content = extractTextFromContent(userEntry.message.content);

      messages.push({
        id: userEntry.uuid,
        sessionId,
        type: 'user',
        content,
        timestamp: new Date(userEntry.timestamp),
      });
    } else if (entry.type === 'assistant' && 'message' in entry) {
      const assistantEntry = entry as AssistantJsonlEntry;
      const content = extractTextFromContent(assistantEntry.message.content);
      const toolUse = extractToolUse(assistantEntry.message.content);

      messages.push({
        id: assistantEntry.uuid,
        sessionId,
        type: 'assistant',
        content,
        timestamp: new Date(assistantEntry.timestamp),
        toolUse: toolUse.length > 0 ? toolUse : undefined,
      });
    }
  }

  // Sort by timestamp (chronological order)
  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return messages;
}

/**
 * Get session metadata from parsed entries
 *
 * Extracts metadata like start time, last activity, and message count.
 */
export function getSessionMetadata(entries: RawJsonlEntry[]): {
  startedAt: Date | null;
  lastActivityAt: Date | null;
  messageCount: number;
} {
  const messages = entries.filter(shouldIncludeEntry);

  if (messages.length === 0) {
    return {
      startedAt: null,
      lastActivityAt: null,
      messageCount: 0,
    };
  }

  // Sort by timestamp to get first and last
  const timestamps = messages.map((m) => new Date(m.timestamp).getTime()).sort((a, b) => a - b);

  return {
    startedAt: new Date(timestamps[0]),
    lastActivityAt: new Date(timestamps[timestamps.length - 1]),
    messageCount: messages.length,
  };
}

/**
 * Filter messages by timestamp (for polling with `since` parameter)
 *
 * @param messages - Array of messages
 * @param since - Only return messages after this timestamp
 * @returns Filtered messages
 */
export function filterMessagesSince(messages: Message[], since: Date): Message[] {
  return messages.filter((m) => m.timestamp > since);
}

/**
 * Extract the project path (cwd) from JSONL entries
 *
 * Claude stores the actual working directory in each message's `cwd` field.
 * This is more reliable than trying to decode the folder name.
 *
 * @param entries - Parsed JSONL entries
 * @returns The project path or null if not found
 */
export function extractProjectPath(entries: RawJsonlEntry[]): string | null {
  for (const entry of entries) {
    if ('cwd' in entry && entry.cwd) {
      return entry.cwd;
    }
  }
  return null;
}

/**
 * Extract the first user message as a preview string
 *
 * Used for session list display. Returns the first user message
 * content truncated to maxLength characters.
 *
 * @param entries - Parsed JSONL entries
 * @param maxLength - Maximum length of preview (default: 100)
 * @returns Preview string or null if no user messages found
 */
export function getFirstUserMessagePreview(
  entries: RawJsonlEntry[],
  maxLength: number = 100
): string | null {
  // Sort by timestamp to ensure we get the actual first message
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const entry of sortedEntries) {
    // Only include valid user messages (not meta, not errors)
    if (!shouldIncludeEntry(entry)) {
      continue;
    }

    if (entry.type === 'user' && 'message' in entry) {
      const userEntry = entry as UserJsonlEntry;
      const content = extractTextFromContent(userEntry.message.content);

      // Clean up whitespace and truncate
      const cleaned = content.replace(/\s+/g, ' ').trim();

      if (cleaned.length === 0) {
        continue; // Skip empty messages
      }

      if (cleaned.length <= maxLength) {
        return cleaned;
      }

      // Truncate with ellipsis
      return cleaned.substring(0, maxLength - 1).trim() + '…';
    }
  }

  return null;
}
