/**
 * MessageList - Renders a list of conversation messages
 *
 * Simple list component that renders MessageTurn components.
 * Shows a thinking indicator when Claude is actively processing.
 */

import { cn } from '@/lib/cn';
import { MessageTurn } from './MessageTurn';
import { ThinkingIndicator } from './ThinkingIndicator';
import type { MessageSerialized, SessionStatus } from '@shared/types';

interface MessageListProps {
  /** Array of messages to render */
  messages: MessageSerialized[];
  /** Current session status - shows thinking indicator when 'working' */
  status?: SessionStatus;
  /** Optimistic message to show at the end (before server confirms) */
  optimisticMessage?: {
    content: string;
    timestamp: string;
  } | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pattern to match IDE opened file messages
 * These are system-generated and not interesting to display
 */
const IDE_TAG_PATTERN = /^<ide_opened_file[^>]*>[\s\S]*<\/ide_opened_file>$/;

/**
 * Clean content by removing XML-like tags (e.g., <ide_opened_file>)
 */
function cleanXmlTags(text: string): string {
  return (
    text
      // Remove XML-like tags and their content (e.g., <ide_opened_file>...</ide_opened_file>)
      .replace(/<ide_opened_file[^>]*>[\s\S]*?<\/ide_opened_file>/g, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Check if a message has meaningful content to display
 * Filters out empty user messages and ide_opened_file system messages
 */
function hasDisplayableContent(message: MessageSerialized): boolean {
  // Assistant messages always display (they have tool_use or content)
  if (message.type === 'assistant') return true;

  // For user messages, check if there's actual text content
  const content = message.content;
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.length === 0) return false;

    // Filter out messages that are ONLY ide_opened_file tags
    if (IDE_TAG_PATTERN.test(trimmed)) return false;

    // Check if after removing ide tags there's still content
    const cleaned = cleanXmlTags(trimmed);
    return cleaned.length > 0;
  }

  // Content might be an array or object
  return Boolean(content);
}

/**
 * MessageList component - renders messages in order
 *
 * Shows a thinking indicator at the bottom when status is 'working',
 * providing immediate visual feedback that Claude is processing.
 * Also supports optimistic message display for instant user feedback.
 *
 * @example
 * ```tsx
 * <MessageList
 *   messages={messages}
 *   status="working"
 *   optimisticMessage={{ content: "Fix the bug", timestamp: "2024-01-01T00:00:00Z" }}
 * />
 * ```
 */
export function MessageList({ messages, status, optimisticMessage, className }: MessageListProps) {
  // Filter out empty messages
  const displayableMessages = messages.filter(hasDisplayableContent);

  // Show thinking indicator when Claude is actively working
  // OR when we have an optimistic message (user just sent, waiting for server)
  const isThinking = status === 'working' || !!optimisticMessage;

  return (
    <div className={cn('flex flex-col', className)}>
      {displayableMessages.map((message) => (
        <MessageTurn key={message.id} message={message} />
      ))}

      {/* Optimistic user message - shown immediately before server confirms */}
      {optimisticMessage && (
        <MessageTurn
          message={{
            id: 'optimistic-pending',
            sessionId: '',
            type: 'user',
            content: optimisticMessage.content,
            timestamp: optimisticMessage.timestamp,
          }}
          className="opacity-70" // Slightly faded to indicate pending state
        />
      )}

      {/* Thinking indicator - shows when Claude is processing */}
      {isThinking && <ThinkingIndicator />}
    </div>
  );
}
