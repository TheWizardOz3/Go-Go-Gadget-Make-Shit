/**
 * Scheduled Prompts Sync Service
 *
 * Syncs scheduled prompts from local storage to Modal cloud.
 * This enables cloud-based scheduling when the laptop is offline.
 */

import { logger } from '../lib/logger.js';
import { getAllPrompts, type ScheduledPrompt } from './scheduledPromptsStorage.js';
import { getGitHubRepoUrl } from './gitService.js';
import { getSettings } from './settingsService.js';
import path from 'path';

// ============================================================
// Configuration
// ============================================================

/** Modal cloud API endpoint */
const MODAL_API_URL =
  process.env.MODAL_API_URL || 'https://derekgood--gogogadget-claude-fastapi-app.modal.run';

// ============================================================
// Types
// ============================================================

/** Enriched prompt with git info for cloud execution */
interface EnrichedPrompt extends ScheduledPrompt {
  gitRemoteUrl?: string;
  projectName?: string;
}

/** Sync request payload */
interface SyncPayload {
  prompts: EnrichedPrompt[];
  settings?: {
    ntfyTopic?: string;
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get project name from path
 */
function getProjectName(projectPath: string): string {
  return path.basename(projectPath);
}

/**
 * Enrich prompts with git remote URLs and project names
 * Required for cloud execution which needs to clone repos
 */
async function enrichPromptsWithGitInfo(prompts: ScheduledPrompt[]): Promise<EnrichedPrompt[]> {
  const enriched: EnrichedPrompt[] = [];

  for (const prompt of prompts) {
    const enrichedPrompt: EnrichedPrompt = { ...prompt };

    if (prompt.projectPath) {
      try {
        // Get git remote URL for the project
        const gitRemoteUrl = await getGitHubRepoUrl(prompt.projectPath);
        if (gitRemoteUrl) {
          enrichedPrompt.gitRemoteUrl = gitRemoteUrl;
        }
        enrichedPrompt.projectName = getProjectName(prompt.projectPath);
      } catch (err) {
        logger.warn('Failed to get git info for scheduled prompt project', {
          promptId: prompt.id,
          projectPath: prompt.projectPath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    enriched.push(enrichedPrompt);
  }

  return enriched;
}

// ============================================================
// Public API
// ============================================================

/**
 * Sync all scheduled prompts to Modal cloud
 *
 * This should be called after any change to scheduled prompts
 * (create, update, delete, toggle).
 *
 * @returns True if sync succeeded, false otherwise
 */
export async function syncPromptsToModal(): Promise<boolean> {
  try {
    logger.info('Syncing scheduled prompts to Modal cloud');

    // Get all prompts
    const prompts = await getAllPrompts();

    // Enrich with git info
    const enrichedPrompts = await enrichPromptsWithGitInfo(prompts);

    // Get settings for ntfy topic
    const settings = await getSettings();
    const ntfyTopic = settings.channels?.ntfy?.topic;

    // Build sync payload
    const payload: SyncPayload = {
      prompts: enrichedPrompts,
      settings: ntfyTopic ? { ntfyTopic } : undefined,
    };

    // Send to Modal
    const response = await fetch(`${MODAL_API_URL}/api/scheduled-prompts/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to sync prompts to Modal', {
        status: response.status,
        error: errorText,
      });
      return false;
    }

    const result = (await response.json()) as {
      data?: { synced?: number; timestamp?: string };
    };
    logger.info('Successfully synced prompts to Modal', {
      synced: result.data?.synced ?? prompts.length,
      timestamp: result.data?.timestamp,
    });

    return true;
  } catch (err) {
    logger.error('Error syncing prompts to Modal', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Check if Modal sync is available
 *
 * @returns True if Modal endpoint is reachable
 */
export async function isModalSyncAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${MODAL_API_URL}/api/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
