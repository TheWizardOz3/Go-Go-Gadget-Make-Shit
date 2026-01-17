/**
 * Hook to monitor scheduled prompt executions and show toast notifications
 *
 * Compares the lastExecution timestamp on each poll and shows a toast
 * when a prompt has been executed since the last check.
 */

import { useEffect, useRef } from 'react';
import { useScheduledPrompts, type ScheduledPrompt } from './useScheduledPrompts';
import { useToast } from '@/components/ui/Toast';

/**
 * Truncate prompt text for display
 */
function truncatePrompt(prompt: string, maxLength: number = 40): string {
  if (prompt.length <= maxLength) return prompt;
  return prompt.substring(0, maxLength - 1).trim() + '…';
}

/**
 * Hook that monitors scheduled prompt executions and shows toast notifications
 *
 * Call this once at the app level to enable execution notifications.
 */
export function useScheduledPromptNotifications(): void {
  const { prompts } = useScheduledPrompts();
  const { showToast } = useToast();

  // Track last known execution timestamps
  const lastExecutionsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!prompts) return;

    // Check each prompt for new executions
    for (const prompt of prompts) {
      if (!prompt.lastExecution) continue;

      const currentTimestamp = prompt.lastExecution.timestamp;
      const previousTimestamp = lastExecutionsRef.current.get(prompt.id);

      // If this is a new execution (timestamp changed)
      if (previousTimestamp && currentTimestamp !== previousTimestamp) {
        const truncatedPrompt = truncatePrompt(prompt.prompt);

        if (prompt.lastExecution.status === 'success') {
          showToast(`✓ Scheduled: "${truncatedPrompt}"`, 'success');
        } else {
          showToast(
            `✗ Failed: "${truncatedPrompt}"${prompt.lastExecution.error ? ` - ${prompt.lastExecution.error}` : ''}`,
            'error',
            6000 // Show errors longer
          );
        }
      }

      // Update the tracked timestamp
      lastExecutionsRef.current.set(prompt.id, currentTimestamp);
    }

    // Clean up removed prompts from tracking
    const currentIds = new Set(prompts.map((p: ScheduledPrompt) => p.id));
    for (const id of lastExecutionsRef.current.keys()) {
      if (!currentIds.has(id)) {
        lastExecutionsRef.current.delete(id);
      }
    }
  }, [prompts, showToast]);
}
