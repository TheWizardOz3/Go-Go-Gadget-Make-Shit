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
 * MessageList component - renders messages in order
 *
 * @example
 * ```tsx
 * <MessageList messages={messages} />
 * ```
 */
export function MessageList({ messages, className }: MessageListProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {messages.map((message) => (
        <MessageTurn key={message.id} message={message} />
      ))}
    </div>
  );
}
