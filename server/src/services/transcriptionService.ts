/**
 * Transcription Service
 *
 * Service for transcribing audio to text using the Groq Whisper API.
 * Provides voice input capability for the mobile interface.
 */

import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

// ============================================================
// Types
// ============================================================

export interface TranscriptionResult {
  /** The transcribed text */
  text: string;
  /** Duration of the audio in seconds (if available) */
  duration?: number;
  /** Whether the transcription was empty */
  empty: boolean;
}

export interface TranscribeOptions {
  /** Audio buffer to transcribe */
  audioBuffer: Buffer;
  /** MIME type of the audio (e.g., 'audio/webm', 'audio/mp4') */
  mimeType: string;
}

// ============================================================
// Constants
// ============================================================

/** Groq Whisper API endpoint */
const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/** Whisper model to use */
const WHISPER_MODEL = 'whisper-large-v3';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30000;

/** Maximum audio file size in bytes (25MB - Whisper limit) */
export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get file extension from MIME type
 *
 * @param mimeType - The MIME type of the audio
 * @returns The file extension
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/x-m4a': 'm4a',
  };

  return extensionMap[mimeType] || 'webm';
}

/**
 * Validate that the Groq API key is configured
 *
 * @throws Error if API key is not configured
 */
function validateApiKey(): void {
  if (!config.groqApiKey) {
    throw new Error(
      'Groq API key not configured. Set GROQ_API_KEY environment variable. ' +
        'Get your key at: https://console.groq.com/keys'
    );
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Check if the transcription service is configured and available
 *
 * @returns True if the Groq API key is configured
 */
export function isTranscriptionAvailable(): boolean {
  return Boolean(config.groqApiKey);
}

/**
 * Transcribe audio to text using the Groq Whisper API
 *
 * @param options - The transcription options
 * @returns The transcription result
 * @throws Error if transcription fails
 *
 * @example
 * ```typescript
 * const result = await transcribe({
 *   audioBuffer: buffer,
 *   mimeType: 'audio/webm',
 * });
 * console.log(result.text); // "Hello, world!"
 * ```
 */
export async function transcribe(options: TranscribeOptions): Promise<TranscriptionResult> {
  const { audioBuffer, mimeType } = options;

  logger.info('Starting transcription', {
    mimeType,
    sizeBytes: audioBuffer.length,
  });

  // Validate API key is configured
  validateApiKey();

  // Validate audio size
  if (audioBuffer.length > MAX_AUDIO_SIZE_BYTES) {
    throw new Error(
      `Audio file too large. Maximum size is ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024}MB, ` +
        `got ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`
    );
  }

  // Validate audio is not empty
  if (audioBuffer.length === 0) {
    throw new Error('Audio file is empty');
  }

  try {
    // Create FormData with the audio file
    const formData = new FormData();
    const extension = getExtensionFromMimeType(mimeType);
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', WHISPER_MODEL);
    formData.append('response_format', 'json');

    logger.debug('Sending request to Groq API', {
      model: WHISPER_MODEL,
      extension,
    });

    // Make the API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle API errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Groq API error: ${response.status}`;

      // Parse error for better messages
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Use raw error text if not JSON
        if (errorText) {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }

      // Handle specific HTTP status codes
      if (response.status === 401) {
        throw new Error('Invalid Groq API key. Check your GROQ_API_KEY environment variable.');
      } else if (response.status === 429) {
        throw new Error('Groq API rate limit exceeded. Please wait and try again.');
      } else if (response.status === 413) {
        throw new Error('Audio file too large for Groq API.');
      }

      throw new Error(errorMessage);
    }

    // Parse successful response
    const result = (await response.json()) as { text?: string; duration?: number };
    const text = result.text?.trim() || '';

    logger.info('Transcription complete', {
      textLength: text.length,
      duration: result.duration,
      empty: text.length === 0,
    });

    return {
      text,
      duration: result.duration,
      empty: text.length === 0,
    };
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Transcription request timed out', {
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
      throw new Error('Transcription request timed out. Please try again.');
    }

    // Re-throw known errors
    if (error instanceof Error) {
      logger.error('Transcription failed', {
        error: error.message,
      });
      throw error;
    }

    // Handle unknown errors
    logger.error('Unknown transcription error', { error });
    throw new Error('Transcription failed due to an unknown error');
  }
}
