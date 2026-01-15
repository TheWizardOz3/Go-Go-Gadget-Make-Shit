/**
 * Transcribe API Routes
 *
 * Handles audio transcription requests using Groq Whisper API.
 * Accepts multipart/form-data with audio file uploads.
 */

import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import {
  transcribe,
  isTranscriptionAvailable,
  MAX_AUDIO_SIZE_BYTES,
} from '../services/transcriptionService.js';

const router: RouterType = Router();

// ============================================================
// Multer Configuration
// ============================================================

/**
 * Configure multer for memory storage
 * - No disk writes (audio stays in memory)
 * - File size limit matches Whisper API limit (25MB)
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are accepted.`));
    }
  },
});

// ============================================================
// Routes
// ============================================================

/**
 * Transcribe audio to text
 * POST /api/transcribe
 *
 * Accepts multipart/form-data with:
 *   - audio: Audio file (webm, mp4, mp3, wav, ogg, flac)
 *
 * Returns:
 *   - text: Transcribed text
 *   - empty: Boolean indicating if transcription was empty
 *
 * Uses Groq Whisper API for transcription.
 */
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    // Check if transcription service is available
    if (!isTranscriptionAvailable()) {
      logger.warn('Transcription requested but Groq API key not configured');
      res
        .status(503)
        .json(
          error(
            ErrorCodes.SERVICE_UNAVAILABLE,
            'Transcription service not configured. Set GROQ_API_KEY environment variable.'
          )
        );
      return;
    }

    // Validate file was uploaded
    if (!req.file) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'No audio file provided'));
      return;
    }

    logger.info('Processing transcription request', {
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      originalName: req.file.originalname,
    });

    // Perform transcription
    const result = await transcribe({
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    // Return result
    res.json(
      success({
        text: result.text,
        empty: result.empty,
        duration: result.duration,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';

    logger.error('Transcription request failed', {
      error: message,
      mimeType: req.file?.mimetype,
      sizeBytes: req.file?.size,
    });

    // Determine appropriate status code based on error
    let statusCode = 500;
    let errorCode: string = ErrorCodes.INTERNAL_ERROR;

    if (message.includes('Invalid Groq API key')) {
      statusCode = 503;
      errorCode = ErrorCodes.SERVICE_UNAVAILABLE;
    } else if (message.includes('rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMITED';
    } else if (message.includes('too large')) {
      statusCode = 413;
      errorCode = ErrorCodes.VALIDATION_ERROR;
    } else if (message.includes('timed out')) {
      statusCode = 504;
      errorCode = 'TIMEOUT';
    }

    res.status(statusCode).json(error(errorCode, message));
  }
});

/**
 * Check transcription service availability
 * GET /api/transcribe/status
 *
 * Returns whether the transcription service is configured and available.
 * Useful for the client to know if voice input can be used.
 */
router.get('/status', (_req, res) => {
  const available = isTranscriptionAvailable();

  res.json(
    success({
      available,
      message: available
        ? 'Transcription service is available'
        : 'Transcription service not configured. Set GROQ_API_KEY.',
    })
  );
});

export default router;
