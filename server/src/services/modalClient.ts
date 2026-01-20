/**
 * Modal Client Service
 *
 * Client for interacting with the Modal cloud API for serverless Claude execution.
 * Handles job dispatch, status queries, and session retrieval from the cloud.
 *
 * The Modal app exposes web endpoints that this client communicates with:
 * - POST /api_dispatch_job - Submit a new job
 * - GET /api_list_projects - List all cloud projects
 * - GET /api_get_sessions - List sessions for a project
 * - GET /api_get_messages - Get messages for a session
 * - GET /api_health - Health check
 */

import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { config } from '../lib/config.js';
import type {
  CloudJob,
  CloudJobDispatchRequest,
  CloudJobStatus,
  CloudSession as SharedCloudSession,
} from '../../../shared/types/index.js';
import { getSettings } from './settingsService.js';

// ============================================================
// Types
// ============================================================

/** Modal API configuration */
export interface ModalConfig {
  /** Base URL of the Modal web endpoint */
  baseUrl: string;
  /** Modal API token for authentication */
  apiToken?: string;
}

/** Cloud session from Modal - re-export shared type with optional jobId */
export interface CloudSession extends SharedCloudSession {
  jobId?: string;
}

/** Result from dispatching a job */
export interface DispatchResult {
  success: boolean;
  jobId?: string;
  status?: CloudJobStatus;
  error?: string;
}

/** Result from getting job status */
export interface JobStatusResult {
  success: boolean;
  job?: CloudJob;
  error?: string;
}

/** Result from listing cloud sessions */
export interface ListSessionsResult {
  success: boolean;
  sessions?: CloudSession[];
  error?: string;
}

/** Raw message from JSONL (before parsing) */
export interface RawJsonlMessage {
  type: string;
  message?: unknown;
  timestamp?: string;
  sessionId?: string;
  uuid?: string;
  parentMessageId?: string;
}

/** Result from getting messages */
export interface GetMessagesResult {
  success: boolean;
  messages?: RawJsonlMessage[];
  error?: string;
}

/** Result from listing projects */
export interface ListProjectsResult {
  success: boolean;
  projects?: string[];
  error?: string;
}

/** Result from health check */
export interface HealthCheckResult {
  success: boolean;
  healthy?: boolean;
  error?: string;
}

// ============================================================
// Zod Schemas for Response Validation
// ============================================================

/** Schema for job dispatch response */
const DispatchResponseSchema = z.object({
  job_id: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']),
});

/** Schema for job status response */
const JobStatusResponseSchema = z.object({
  job: z.object({
    id: z.string(),
    status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']),
    project_name: z.string(),
    created_at: z.string(),
    started_at: z.string().optional().nullable(),
    completed_at: z.string().optional().nullable(),
    error: z.string().optional().nullable(),
    session_id: z.string().optional().nullable(),
  }),
});

/** Schema for cloud session from Modal API (more flexible than SharedCloudSession) */
const CloudSessionSchema = z.object({
  id: z.string(),
  filePath: z.string().optional(),
  projectPath: z.string().optional(),
  projectName: z.string().optional(),
  startedAt: z.string(),
  lastActivityAt: z.string(),
  messageCount: z.number(),
  status: z.enum(['working', 'waiting', 'idle']).optional(),
  source: z.literal('cloud').optional(),
  preview: z.string().nullable().optional(),
});

/** Schema for list sessions response (wrapped in data field) */
const ListSessionsResponseSchema = z.object({
  data: z.array(CloudSessionSchema),
});

/** Schema for a cloud project item */
const CloudProjectSchema = z.object({
  path: z.string(),
  name: z.string(),
  encodedPath: z.string(),
  sessionCount: z.number().optional(),
  lastSessionId: z.string().optional(),
  lastActivityAt: z.string().optional(),
});

/** Schema for list projects response (wrapped in data field) */
const ListProjectsResponseSchema = z.object({
  data: z.array(CloudProjectSchema),
});

/** Schema for raw JSONL message from Modal (flexible to accept various formats) */
const RawMessageSchema = z.object({
  type: z.string(),
  message: z.any().optional(),
  timestamp: z.string().optional(),
  sessionId: z.string().optional(),
  uuid: z.string().optional(),
  parentMessageId: z.string().optional(),
});

/** Schema for get messages response */
const GetMessagesResponseSchema = z.object({
  messages: z.array(RawMessageSchema),
});

/** Schema for health check response */
const HealthCheckResponseSchema = z.object({
  status: z.literal('healthy'),
  volume_accessible: z.boolean(),
});

// ============================================================
// Constants
// ============================================================

/** Default timeout for API requests (ms) */
const DEFAULT_TIMEOUT = 30000;

/** Timeout for dispatch requests (longer since it spawns a job) */
const DISPATCH_TIMEOUT = 60000;

// ============================================================
// Internal Functions
// ============================================================

/**
 * Get Modal configuration from settings
 */
async function getModalConfig(): Promise<ModalConfig | null> {
  const settings = await getSettings();

  if (!settings.serverless?.enabled) {
    return null;
  }

  // Modal web endpoint URL - this is set when deploying the Modal app
  // Format: https://<username>--gogogadget-claude-web.modal.run
  const baseUrl = config.modalWebEndpointUrl;

  if (!baseUrl) {
    logger.debug('Modal web endpoint URL not configured');
    return null;
  }

  return {
    baseUrl,
    apiToken: settings.serverless.modalToken,
  };
}

/**
 * Make an authenticated request to the Modal API
 */
async function modalFetch(
  config: ModalConfig,
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    timeout?: number;
  } = {}
): Promise<Response> {
  const { method = 'GET', body, timeout = DEFAULT_TIMEOUT } = options;

  const url = `${config.baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  if (config.apiToken) {
    headers['Authorization'] = `Bearer ${config.apiToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Check if Modal serverless is configured and available
 *
 * @returns true if Modal is configured
 */
export async function isModalConfigured(): Promise<boolean> {
  const config = await getModalConfig();
  return config !== null;
}

/**
 * Check health of the Modal service
 *
 * @returns Health check result
 */
export async function checkModalHealth(): Promise<HealthCheckResult> {
  const config = await getModalConfig();

  if (!config) {
    return {
      success: false,
      error: 'Modal is not configured',
    };
  }

  try {
    const response = await modalFetch(config, '/api/status', {
      timeout: 10000,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Health check failed with status ${response.status}`,
      };
    }

    const data = await response.json();
    const parsed = HealthCheckResponseSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid health check response',
      };
    }

    return {
      success: true,
      healthy: parsed.data.status === 'healthy' && parsed.data.volume_accessible,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('abort')) {
      return { success: false, error: 'Health check timed out' };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Dispatch a new job to Modal cloud
 *
 * @param request - Job dispatch request
 * @returns Dispatch result with job ID
 */
export async function dispatchJob(request: CloudJobDispatchRequest): Promise<DispatchResult> {
  const config = await getModalConfig();

  if (!config) {
    return {
      success: false,
      error: 'Modal is not configured. Enable serverless in settings.',
    };
  }

  logger.info('Dispatching job to Modal', {
    projectName: request.projectName,
    promptLength: request.prompt.length,
    hasImageAttachment: !!request.imageAttachment,
  });

  try {
    const response = await modalFetch(config, '/api/cloud/jobs', {
      method: 'POST',
      body: {
        prompt: request.prompt,
        project_repo: request.repoUrl,
        project_name: request.projectName,
        allowed_tools: request.allowedTools,
        notification_webhook: request.notificationWebhook,
        image_attachment: request.imageAttachment
          ? {
              filename: request.imageAttachment.filename,
              mimeType: request.imageAttachment.mimeType,
              base64: request.imageAttachment.base64,
            }
          : undefined,
      },
      timeout: DISPATCH_TIMEOUT,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Modal dispatch failed', {
        status: response.status,
        error: errorText,
      });

      return {
        success: false,
        error: `Dispatch failed: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const parsed = DispatchResponseSchema.safeParse(data);

    if (!parsed.success) {
      logger.error('Invalid dispatch response', {
        errors: parsed.error.issues,
      });
      return {
        success: false,
        error: 'Invalid response from Modal',
      };
    }

    logger.info('Job dispatched successfully', {
      jobId: parsed.data.job_id,
      status: parsed.data.status,
    });

    return {
      success: true,
      jobId: parsed.data.job_id,
      status: parsed.data.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('abort')) {
      logger.error('Dispatch request timed out');
      return { success: false, error: 'Request timed out' };
    }

    logger.error('Failed to dispatch job', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Get the status of a running job
 *
 * Note: This queries the Modal function directly, not a stored job.
 * For detailed job tracking, we rely on the JSONL session files.
 *
 * @param jobId - The job ID to query
 * @returns Job status result
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResult> {
  const config = await getModalConfig();

  if (!config) {
    return {
      success: false,
      error: 'Modal is not configured',
    };
  }

  try {
    const response = await modalFetch(config, `/api/cloud/jobs/${encodeURIComponent(jobId)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Job not found',
        };
      }

      return {
        success: false,
        error: `Failed to get job status: ${response.status}`,
      };
    }

    const data = await response.json();
    const parsed = JobStatusResponseSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid job status response',
      };
    }

    const jobData = parsed.data.job;

    return {
      success: true,
      job: {
        id: jobData.id,
        status: jobData.status,
        projectName: jobData.project_name,
        createdAt: jobData.created_at,
        startedAt: jobData.started_at ?? undefined,
        completedAt: jobData.completed_at ?? undefined,
        error: jobData.error ?? undefined,
        sessionId: jobData.session_id ?? undefined,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * List all projects with cloud sessions
 *
 * @returns List of project paths
 */
export async function listCloudProjects(): Promise<ListProjectsResult> {
  const config = await getModalConfig();

  if (!config) {
    return {
      success: false,
      error: 'Modal is not configured',
    };
  }

  try {
    const response = await modalFetch(config, '/api/projects');

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to list projects: ${response.status}`,
      };
    }

    const data = await response.json();
    const parsed = ListProjectsResponseSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid list projects response',
      };
    }

    // Extract encoded paths from the project objects
    return {
      success: true,
      projects: parsed.data.data.map((p) => p.encodedPath),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * List sessions for a project from the cloud
 *
 * @param projectPath - Encoded project path
 * @returns List of cloud sessions
 */
export async function listCloudSessions(projectPath: string): Promise<ListSessionsResult> {
  const config = await getModalConfig();

  if (!config) {
    return {
      success: false,
      error: 'Modal is not configured',
    };
  }

  try {
    const response = await modalFetch(
      config,
      `/api/projects/${encodeURIComponent(projectPath)}/sessions`
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to list sessions: ${response.status}`,
      };
    }

    const data = await response.json();
    const parsed = ListSessionsResponseSchema.safeParse(data);

    if (!parsed.success) {
      logger.warn('Invalid sessions response', {
        errors: parsed.error.issues,
      });
      return {
        success: false,
        error: 'Invalid sessions response',
      };
    }

    // Convert to our CloudSession type (data is now in parsed.data.data due to wrapper)
    const sessions: CloudSession[] = parsed.data.data.map((s) => ({
      id: s.id,
      projectPath: s.projectPath || projectPath,
      projectName: s.projectName || projectPath.split('-').pop() || 'Unknown',
      startedAt: s.startedAt,
      lastActivityAt: s.lastActivityAt,
      messageCount: s.messageCount,
      status: s.status || 'idle',
      source: 'cloud' as const,
    }));

    return {
      success: true,
      sessions,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get messages for a session from the cloud
 *
 * @param sessionId - Session ID
 * @param projectPath - Encoded project path
 * @returns Messages for the session
 */
export async function getCloudMessages(
  sessionId: string,
  projectPath: string
): Promise<GetMessagesResult> {
  const config = await getModalConfig();

  if (!config) {
    return {
      success: false,
      error: 'Modal is not configured',
    };
  }

  try {
    const response = await modalFetch(
      config,
      `/api/sessions/${sessionId}/messages?project_path=${encodeURIComponent(projectPath)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      return {
        success: false,
        error: `Failed to get messages: ${response.status}`,
      };
    }

    const data = await response.json();
    const parsed = GetMessagesResponseSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid messages response',
      };
    }

    return {
      success: true,
      messages: parsed.data.messages,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Convert a CloudJobDispatchRequest to Modal API format
 *
 * Maps TypeScript camelCase to Python snake_case
 */
export function toModalDispatchPayload(request: CloudJobDispatchRequest): Record<string, unknown> {
  return {
    prompt: request.prompt,
    project_repo: request.repoUrl,
    project_name: request.projectName,
    allowed_tools: request.allowedTools,
    notification_webhook: request.notificationWebhook,
  };
}

/**
 * Convert Modal job response to our CloudJob type
 */
export function fromModalJobResponse(data: Record<string, unknown>): CloudJob {
  return {
    id: data.id as string,
    status: data.status as CloudJobStatus,
    projectName: data.project_name as string,
    createdAt: data.created_at as string,
    startedAt: (data.started_at as string) ?? undefined,
    completedAt: (data.completed_at as string) ?? undefined,
    error: (data.error as string) ?? undefined,
    sessionId: (data.session_id as string) ?? undefined,
  };
}
