/**
 * Claude Service
 *
 * Service for interacting with Claude Code CLI.
 * Handles spawning claude processes to send prompts.
 */

import { execa } from 'execa';
import { logger } from '../lib/logger.js';

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
}

export interface SendPromptResult {
  /** Whether the command was spawned successfully */
  success: boolean;
  /** Process ID of the spawned claude process */
  pid?: number;
  /** Error message if spawn failed */
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
 * @param options - The prompt options
 * @returns Result indicating success and the process ID
 */
export async function sendPrompt(options: SendPromptOptions): Promise<SendPromptResult> {
  const { sessionId, projectPath, prompt } = options;

  logger.info('Sending prompt to Claude', {
    sessionId,
    projectPath,
    promptLength: prompt.length,
  });

  try {
    // Spawn claude command
    // -p: Provide the prompt directly (non-interactive)
    // --continue: Continue the most recent session in this directory
    const subprocess = execa('claude', ['-p', prompt, '--continue'], {
      cwd: projectPath,
      detached: true, // Allow process to run independently
      stdio: 'ignore', // Don't capture output (it goes to JSONL)
    });

    // Get the PID before unreferencing
    const pid = subprocess.pid;

    // Don't wait for process to complete - it runs in background
    // unref() allows the parent (our server) to exit independently
    subprocess.unref();

    logger.info('Claude process spawned', {
      sessionId,
      pid,
    });

    return {
      success: true,
      pid,
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
