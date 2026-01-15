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
 * Check if a message has meaningful content to display
 * Filters out empty user messages that have no text content
 */
function hasDisplayableContent(message: MessageSerialized): boolean {
  // Assistant messages always display (they have tool_use or content)
  if (message.type === 'assistant') return true;

  // For user messages, check if there's actual text content
  const content = message.content;
  if (typeof content === 'string') {
    return content.trim().length > 0;
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
