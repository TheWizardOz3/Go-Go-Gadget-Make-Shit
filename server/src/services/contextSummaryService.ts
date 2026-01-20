/**
 * Context Summary Service
 *
 * Generates compact context summaries of sessions for cross-environment continuation.
 * The summary is designed to be injected as a preamble when starting a new session
 * in a different environment (local → cloud or cloud → local).
 */

import { logger } from '../lib/logger.js';
import { getMessages, getSession } from './sessionManager.js';
import type { Message } from '../lib/jsonlParser.js';

// ============================================================
// Types
// ============================================================

export interface ContextSummary {
  /** Original session ID */
  sessionId: string;
  /** Source environment */
  source: 'local' | 'cloud';
  /** Project path for context */
  projectPath: string;
  /** Project name */
  projectName: string;
  /** When the summary was generated */
  generatedAt: string;
  /** Compact summary text to inject as preamble */
  summaryText: string;
  /** Number of messages summarized */
  messageCount: number;
  /** First message timestamp */
  startedAt: string | null;
  /** Last message timestamp */
  lastActivityAt: string | null;
}

// ============================================================
// Configuration
// ============================================================

/** Maximum messages to include in detailed summary */
const MAX_DETAILED_MESSAGES = 10;

/** Maximum characters for the entire summary */
const MAX_SUMMARY_LENGTH = 4000;

/** Maximum length for individual message content in summary */
const MAX_MESSAGE_CONTENT_LENGTH = 500;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Clean and normalize message content for summary
 */
function cleanContent(content: string): string {
  return content
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .replace(/```[\s\S]*?```/g, '[code block]') // Replace code blocks
    .trim();
}

/**
 * Format a message for the summary
 */
function formatMessage(message: Message, index: number): string {
  const role = message.type === 'user' ? 'User' : 'Assistant';
  const content = truncate(cleanContent(message.content), MAX_MESSAGE_CONTENT_LENGTH);

  // Include tool use summary if present
  let toolSummary = '';
  if (message.toolUse && message.toolUse.length > 0) {
    const tools = message.toolUse.map((t) => t.tool).join(', ');
    toolSummary = ` [Tools: ${tools}]`;
  }

  return `[${index + 1}] ${role}:${toolSummary}\n${content}`;
}

/**
 * Generate a high-level summary of the conversation
 */
function generateHighLevelSummary(messages: Message[]): string {
  if (messages.length === 0) {
    return 'No messages in this session.';
  }

  const userMessages = messages.filter((m) => m.type === 'user');
  const assistantMessages = messages.filter((m) => m.type === 'assistant');

  // Get the first user message as the "topic"
  const firstUserMessage = userMessages[0]?.content || 'Unknown topic';
  const topic = truncate(cleanContent(firstUserMessage), 200);

  // Count tool uses
  const allToolUses = assistantMessages.flatMap((m) => m.toolUse || []);
  const toolCounts: Record<string, number> = {};
  allToolUses.forEach((t) => {
    toolCounts[t.tool] = (toolCounts[t.tool] || 0) + 1;
  });
  const toolSummary =
    Object.keys(toolCounts).length > 0
      ? Object.entries(toolCounts)
          .map(([tool, count]) => `${tool}(${count})`)
          .join(', ')
      : 'None';

  return `Topic: ${topic}\n\nMessage counts: ${userMessages.length} user, ${assistantMessages.length} assistant\nTools used: ${toolSummary}`;
}

// ============================================================
// Public API
// ============================================================

/**
 * Generate a context summary for a session
 *
 * Creates a compact text summary that can be injected as a preamble
 * when continuing the conversation in a different environment.
 *
 * @param sessionId - The session UUID
 * @param source - The source environment ('local' or 'cloud')
 * @returns Context summary or null if session not found
 */
export async function generateContextSummary(
  sessionId: string,
  source: 'local' | 'cloud'
): Promise<ContextSummary | null> {
  try {
    // Get session metadata
    const session = await getSession(sessionId);
    if (!session) {
      logger.warn('Session not found for context summary', { sessionId });
      return null;
    }

    // Get all messages
    const messages = await getMessages(sessionId);
    if (messages.length === 0) {
      logger.warn('No messages found for context summary', { sessionId });
      return null;
    }

    // Build the summary text
    const parts: string[] = [];

    // Header
    parts.push('=== CONTEXT FROM PREVIOUS SESSION ===');
    parts.push(`Project: ${session.projectName}`);
    parts.push(`Source: ${source === 'local' ? 'Local laptop' : 'Cloud (Modal)'}`);
    parts.push(`Session: ${sessionId.slice(0, 8)}...`);
    parts.push(`Messages: ${messages.length}`);
    parts.push('');

    // High-level summary
    parts.push('--- Summary ---');
    parts.push(generateHighLevelSummary(messages));
    parts.push('');

    // Recent messages (most relevant for continuation)
    parts.push('--- Recent Messages ---');
    const recentMessages = messages.slice(-MAX_DETAILED_MESSAGES);
    recentMessages.forEach((msg, index) => {
      const globalIndex = messages.length - MAX_DETAILED_MESSAGES + index;
      parts.push(formatMessage(msg, globalIndex >= 0 ? globalIndex : index));
      parts.push('');
    });

    // Footer
    parts.push('=== END PREVIOUS CONTEXT ===');
    parts.push('');
    parts.push('Please continue from where this session left off.');

    // Combine and truncate if needed
    let summaryText = parts.join('\n');
    if (summaryText.length > MAX_SUMMARY_LENGTH) {
      // If too long, reduce to just high-level + last 3 messages
      const reducedParts: string[] = [];
      reducedParts.push('=== CONTEXT FROM PREVIOUS SESSION ===');
      reducedParts.push(`Project: ${session.projectName}`);
      reducedParts.push(`Source: ${source === 'local' ? 'Local laptop' : 'Cloud (Modal)'}`);
      reducedParts.push(`Session: ${sessionId.slice(0, 8)}... (${messages.length} messages)`);
      reducedParts.push('');
      reducedParts.push('--- Summary ---');
      reducedParts.push(generateHighLevelSummary(messages));
      reducedParts.push('');
      reducedParts.push('--- Last 3 Messages ---');
      const lastThree = messages.slice(-3);
      lastThree.forEach((msg, index) => {
        reducedParts.push(formatMessage(msg, messages.length - 3 + index));
        reducedParts.push('');
      });
      reducedParts.push('=== END PREVIOUS CONTEXT ===');
      reducedParts.push('');
      reducedParts.push('Please continue from where this session left off.');

      summaryText = truncate(reducedParts.join('\n'), MAX_SUMMARY_LENGTH);
    }

    const summary: ContextSummary = {
      sessionId,
      source,
      projectPath: session.projectPath,
      projectName: session.projectName,
      generatedAt: new Date().toISOString(),
      summaryText,
      messageCount: messages.length,
      startedAt: session.startedAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
    };

    logger.info('Generated context summary', {
      sessionId,
      source,
      messageCount: messages.length,
      summaryLength: summaryText.length,
    });

    return summary;
  } catch (error) {
    logger.error('Failed to generate context summary', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Format a context summary as a preamble for a new session
 *
 * This wraps the prompt with the context summary so Claude understands
 * it's continuing from a previous session.
 *
 * @param summary - The context summary
 * @param newPrompt - The user's new prompt to add after the context
 * @returns Combined prompt with context preamble
 */
export function formatContextPreamble(summary: ContextSummary, newPrompt: string): string {
  return `${summary.summaryText}\n\n---\n\nUser's new request:\n${newPrompt}`;
}
