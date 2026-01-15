/**
 * MessageList - Renders a list of conversation messages
 *
 * Simple list component that renders MessageTurn components.
 */

import { cn } from '@/lib/cn';
import { MessageTurn } from './MessageTurn';
import type { MessageSerialized } from '@shared/types';

interface MessageListProps {
  /** Array of messages to render */
  messages: MessageSerialized[];
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
 * @example
 * ```tsx
 * <MessageList messages={messages} />
 * ```
 */
export function MessageList({ messages, className }: MessageListProps) {
  // Filter out empty messages
  const displayableMessages = messages.filter(hasDisplayableContent);

  return (
    <div className={cn('flex flex-col', className)}>
      {displayableMessages.map((message) => (
        <MessageTurn key={message.id} message={message} />
      ))}
    </div>
  );
}
