/**
 * Claude Service
 *
 * Service for interacting with Claude Code CLI.
 * Handles spawning claude processes to send prompts.
 * Sends notifications when Claude completes tasks.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';
import { execa } from 'execa';
import { logger } from '../lib/logger.js';
import { trackProcess, untrackProcess, getActiveProcess } from './processManager.js';
import { sendTaskCompleteNotification } from './notificationService.js';
import { getSettings } from './settingsService.js';
import type { ImageAttachment } from '../../../shared/types/index.js';

// ============================================================
// Types
// ============================================================

export interface SendPromptOptions {
  /** Session ID (for logging/tracking) */
  sessionId: string;
  /** Project directory path where claude should run */
  projectPath: string;
  /** The prompt text to send */
  prompt: string;
  /** Optional image attachment */
  imageAttachment?: ImageAttachment;
}

export interface SendPromptResult {
  /** Whether the command was spawned successfully */
  success: boolean;
  /** Process ID of the spawned claude process */
  pid?: number;
  /** Whether the process is being tracked for stop functionality */
  tracked?: boolean;
  /** Error message if spawn failed */
  error?: string;
}

export interface StopAgentOptions {
  /** Session ID to stop */
  sessionId: string;
}

export interface StartNewSessionOptions {
  /** Project directory path where the new session should be created */
  projectPath: string;
  /** Optional initial prompt to send */
  prompt?: string;
}

export interface StartNewSessionResult {
  /** Whether the command was spawned successfully */
  success: boolean;
  /** Process ID of the spawned claude process */
  pid?: number;
  /** Error message if spawn failed */
  error?: string;
}

/** Signal used to stop the process */
export type StopSignal = 'SIGINT' | 'SIGTERM' | 'SIGKILL';

export interface StopAgentResult {
  /** Whether the stop operation completed successfully */
  success: boolean;
  /** Whether a process was actually killed (false if no process was running) */
  processKilled: boolean;
  /** The session ID that was stopped */
  sessionId: string;
  /** The PID of the process that was stopped */
  pid?: number;
  /** The signal that successfully stopped the process */
  signal?: StopSignal;
  /** Message describing the result */
  message?: string;
  /** Error message if stop failed */
  error?: string;
}

// ============================================================
// Public API
// ============================================================

/**
 * Send a prompt to Claude Code using the CLI
 *
 * Uses `claude -p "prompt" --continue` to send to the most recent session.
 * The process runs detached so it continues independently after we return.
 * Claude writes responses to the JSONL file which our watcher will pick up.
 *
 * The process is tracked so it can be stopped via stopAgent().
 *
 * @param options - The prompt options
 * @returns Result indicating success and the process ID
 */
export async function sendPrompt(options: SendPromptOptions): Promise<SendPromptResult> {
  const { sessionId, projectPath, prompt, imageAttachment } = options;

  logger.info('Sending prompt to Claude', {
    sessionId,
    projectPath,
    promptLength: prompt.length,
    hasImage: !!imageAttachment,
  });

  // If there's an image attachment, save it to a temp file
  let tempImagePath: string | null = null;
  if (imageAttachment) {
    try {
      const ext = imageAttachment.mimeType.split('/')[1] || 'png';
      const filename = `gogogadget-${crypto.randomUUID()}.${ext}`;
      tempImagePath = path.join(os.tmpdir(), filename);

      // Decode base64 and write to temp file
      const imageBuffer = Buffer.from(imageAttachment.base64, 'base64');
      await fs.writeFile(tempImagePath, imageBuffer);

      logger.debug('Saved image attachment to temp file', {
        sessionId,
        tempImagePath,
        size: imageBuffer.length,
      });
    } catch (err) {
      logger.error('Failed to save image attachment', {
        sessionId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return {
        success: false,
        error: 'Failed to process image attachment',
      };
    }
  }

  try {
    // Check settings for allowEdits flag
    const settings = await getSettings();
    const allowEdits = settings.allowEdits ?? false;

    // Build the prompt - include image reference if present
    // Claude CLI uses @filepath syntax to include files
    let finalPrompt = prompt;
    if (tempImagePath) {
      finalPrompt = `@${tempImagePath}\n\n${prompt}`;
    }

    // Build args: -p for prompt, --continue for existing session
    // If allowEdits is true, add --dangerously-skip-permissions to auto-approve actions
    const args = ['-p', finalPrompt, '--continue'];
    if (allowEdits) {
      args.push('--dangerously-skip-permissions');
    }

    logger.debug('Spawning Claude with args', {
      sessionId,
      allowEdits,
      argsCount: args.length,
      hasImageRef: !!tempImagePath,
    });

    // Spawn claude command
    // -p: Provide the prompt directly (non-interactive)
    // --continue: Continue the most recent session in this directory
    const subprocess = execa('claude', args, {
      cwd: projectPath,
      detached: true, // Allow process to run independently
      stdio: 'ignore', // Don't capture output (it goes to JSONL)
    });

    // Get the PID
    const pid = subprocess.pid;

    // Track the process for stop functionality
    let tracked = false;
    if (pid !== undefined) {
      trackProcess(sessionId, pid, projectPath);
      tracked = true;

      // Set up exit handler to untrack when process exits naturally
      subprocess.on('exit', (code, signal) => {
        logger.debug('Claude process exited', {
          sessionId,
          pid,
          exitCode: code,
          signal,
        });
        untrackProcess(sessionId);

        // Clean up temp image file if it exists
        if (tempImagePath) {
          fs.unlink(tempImagePath).catch((err) => {
            logger.warn('Failed to clean up temp image file', {
              tempImagePath,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }

        // Send notification when Claude completes successfully
        if (code === 0) {
          const projectName = path.basename(projectPath);
          sendTaskCompleteNotification(projectName).catch((err) => {
            logger.error('Failed to send completion notification', {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      });

      // Handle process errors (e.g., process couldn't be spawned properly)
      subprocess.on('error', (err) => {
        logger.error('Claude process error', {
          sessionId,
          pid,
          error: err.message,
        });
        untrackProcess(sessionId);

        // Clean up temp image file if it exists
        if (tempImagePath) {
          fs.unlink(tempImagePath).catch(() => {
            // Ignore cleanup errors on process error
          });
        }
      });
    }

    // Don't wait for process to complete - it runs in background
    // unref() allows the parent (our server) to exit independently
    // Note: We still keep event handlers attached for tracking
    subprocess.unref();

    logger.info('Claude process spawned', {
      sessionId,
      pid,
      tracked,
    });

    return {
      success: true,
      pid,
      tracked,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to spawn Claude process', {
      sessionId,
      projectPath,
      error: errorMessage,
    });

    // Check for common errors
    if (errorMessage.includes('ENOENT')) {
      return {
        success: false,
        error: 'Claude CLI not found. Make sure Claude Code is installed and in your PATH.',
      };
    }

    return {
      success: false,
      error: `Failed to start Claude: ${errorMessage}`,
    };
  }
}

/**
 * Check if Claude CLI is available on the system
 *
 * @returns True if claude command is available
 */
export async function isClaudeAvailable(): Promise<boolean> {
  try {
    await execa('claude', ['--version'], {
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Start New Session
// ============================================================

/**
 * Start a new Claude Code session in a project
 *
 * Unlike sendPrompt (which uses --continue), this starts a fresh session.
 * The new session will be created as a new JSONL file in ~/.claude/projects/.
 *
 * Note: The session ID is generated by Claude Code. The client should
 * poll for sessions after this call to discover the new session.
 *
 * @param options - The start options
 * @returns Result indicating success and the process ID
 */
export async function startNewSession(
  options: StartNewSessionOptions
): Promise<StartNewSessionResult> {
  const { projectPath, prompt } = options;

  logger.info('Starting new Claude session', {
    projectPath,
    hasPrompt: !!prompt,
    promptLength: prompt?.length ?? 0,
  });

  try {
    // Check settings for allowEdits flag
    const settings = await getSettings();
    const allowEdits = settings.allowEdits ?? false;

    // Build args: -p for prompt (or empty to just start), no --continue
    const args: string[] = [];

    if (prompt && prompt.trim()) {
      args.push('-p', prompt);
    } else {
      // Start with a minimal prompt if none provided
      args.push('-p', 'Hello');
    }

    // If allowEdits is true, add --dangerously-skip-permissions to auto-approve actions
    if (allowEdits) {
      args.push('--dangerously-skip-permissions');
    }

    logger.debug('Spawning new Claude session with args', {
      allowEdits,
      argsCount: args.length,
    });

    // Spawn claude command WITHOUT --continue to start a new session
    const subprocess = execa('claude', args, {
      cwd: projectPath,
      detached: true, // Allow process to run independently
      stdio: 'ignore', // Don't capture output (it goes to JSONL)
    });

    // Get the PID
    const pid = subprocess.pid;

    if (pid !== undefined) {
      // Set up handlers for logging and notifications
      subprocess.on('exit', (code, signal) => {
        logger.debug('New session Claude process exited', {
          pid,
          exitCode: code,
          signal,
        });

        // Send notification when Claude completes successfully
        if (code === 0) {
          const projectName = path.basename(projectPath);
          sendTaskCompleteNotification(projectName).catch((err) => {
            logger.error('Failed to send completion notification', {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      });

      subprocess.on('error', (err) => {
        logger.error('New session Claude process error', {
          pid,
          error: err.message,
        });
      });
    }

    // Don't wait for process to complete - it runs in background
    subprocess.unref();

    logger.info('New Claude session process spawned', {
      projectPath,
      pid,
    });

    return {
      success: true,
      pid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to start new Claude session', {
      projectPath,
      error: errorMessage,
    });

    // Check for common errors
    if (errorMessage.includes('ENOENT')) {
      return {
        success: false,
        error: 'Claude CLI not found. Make sure Claude Code is installed and in your PATH.',
      };
    }

    return {
      success: false,
      error: `Failed to start new session: ${errorMessage}`,
    };
  }
}

// ============================================================
// Stop Agent
// ============================================================

/** How long to wait for each signal before escalating (ms) */
const SIGNAL_TIMEOUT_MS = 2000;

/**
 * Check if a process is still running
 *
 * @param pid - Process ID to check
 * @returns true if process is running
 */
function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch {
    // ESRCH means process doesn't exist
    return false;
  }
}

/**
 * Wait for a process to exit or timeout
 *
 * @param pid - Process ID to wait for
 * @param timeoutMs - How long to wait before timing out
 * @returns true if process exited, false if timeout
 */
async function waitForProcessExit(pid: number, timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 100; // Check every 100ms

  while (Date.now() - startTime < timeoutMs) {
    if (!isProcessRunning(pid)) {
      return true; // Process exited
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return false; // Timeout
}

/**
 * Send a signal to a process
 *
 * @param pid - Process ID to signal
 * @param signal - Signal to send
 * @returns true if signal was sent successfully
 */
function sendSignal(pid: number, signal: StopSignal): boolean {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    // Process might have already exited
    return false;
  }
}

/**
 * Stop a running Claude Code agent
 *
 * Attempts graceful shutdown with escalating signals:
 * 1. SIGINT (Ctrl+C equivalent) - allows Claude to clean up
 * 2. SIGTERM (if SIGINT doesn't work within 2 seconds)
 * 3. SIGKILL (last resort after another 2 seconds)
 *
 * @param options - The stop options
 * @returns Result indicating success and details
 */
export async function stopAgent(options: StopAgentOptions): Promise<StopAgentResult> {
  const { sessionId } = options;

  logger.info('Attempting to stop Claude agent', { sessionId });

  // Check if there's an active process for this session
  const processInfo = getActiveProcess(sessionId);

  if (!processInfo) {
    logger.info('No active process found for session', { sessionId });
    return {
      success: true,
      processKilled: false,
      sessionId,
      message: 'No active Claude process for this session',
    };
  }

  const { pid } = processInfo;

  // Verify process is actually running
  if (!isProcessRunning(pid)) {
    logger.info('Tracked process no longer running, cleaning up', { sessionId, pid });
    untrackProcess(sessionId);
    return {
      success: true,
      processKilled: false,
      sessionId,
      pid,
      message: 'Process was already stopped',
    };
  }

  logger.info('Found active process, sending SIGINT', { sessionId, pid });

  // Try SIGINT first (graceful shutdown)
  if (sendSignal(pid, 'SIGINT')) {
    const exited = await waitForProcessExit(pid, SIGNAL_TIMEOUT_MS);

    if (exited) {
      logger.info('Process stopped with SIGINT', { sessionId, pid });
      untrackProcess(sessionId);
      return {
        success: true,
        processKilled: true,
        sessionId,
        pid,
        signal: 'SIGINT',
        message: 'Agent stopped gracefully',
      };
    }

    logger.warn('Process did not respond to SIGINT, trying SIGTERM', { sessionId, pid });
  }

  // Try SIGTERM (more forceful)
  if (sendSignal(pid, 'SIGTERM')) {
    const exited = await waitForProcessExit(pid, SIGNAL_TIMEOUT_MS);

    if (exited) {
      logger.info('Process stopped with SIGTERM', { sessionId, pid });
      untrackProcess(sessionId);
      return {
        success: true,
        processKilled: true,
        sessionId,
        pid,
        signal: 'SIGTERM',
        message: 'Agent terminated',
      };
    }

    logger.warn('Process did not respond to SIGTERM, trying SIGKILL', { sessionId, pid });
  }

  // Last resort: SIGKILL (cannot be ignored)
  if (sendSignal(pid, 'SIGKILL')) {
    // Give it a moment for SIGKILL to take effect
    const exited = await waitForProcessExit(pid, 500);

    if (exited) {
      logger.info('Process stopped with SIGKILL', { sessionId, pid });
      untrackProcess(sessionId);
      return {
        success: true,
        processKilled: true,
        sessionId,
        pid,
        signal: 'SIGKILL',
        message: 'Agent forcefully killed',
      };
    }
  }

  // If we get here, something is very wrong
  logger.error('Failed to stop process after all signals', { sessionId, pid });

  return {
    success: false,
    processKilled: false,
    sessionId,
    pid,
    error: 'Failed to stop process after trying SIGINT, SIGTERM, and SIGKILL',
  };
}
