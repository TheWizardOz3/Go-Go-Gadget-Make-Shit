import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

/**
 * Transcribe audio to text
 * POST /api/transcribe
 *
 * Accepts multipart/form-data with audio file
 * Uses Groq Whisper API for transcription
 */
router.post('/', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Transcribe audio' },
  });
});

export default router;
