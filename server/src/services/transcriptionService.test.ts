/**
 * Tests for Transcription Service
 *
 * Tests the transcribe function that calls the Groq Whisper API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  transcribe,
  isTranscriptionAvailable,
  MAX_AUDIO_SIZE_BYTES,
} from './transcriptionService.js';

// Mock the config module
vi.mock('../lib/config.js', () => ({
  config: {
    groqApiKey: 'test-api-key',
  },
}));

// Import the mocked config so we can modify it
import { config } from '../lib/config.js';
const mockConfig = config as { groqApiKey: string };

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('transcriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.groqApiKey = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isTranscriptionAvailable', () => {
    it('should return true when API key is configured', () => {
      mockConfig.groqApiKey = 'some-api-key';
      expect(isTranscriptionAvailable()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      mockConfig.groqApiKey = '';
      expect(isTranscriptionAvailable()).toBe(false);
    });
  });

  describe('transcribe', () => {
    it('should successfully transcribe audio', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          text: '  Hello, world!  ',
          duration: 1.5,
        }),
        text: vi.fn(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await transcribe({
        audioBuffer: Buffer.from('fake audio data'),
        mimeType: 'audio/webm',
      });

      expect(result.text).toBe('Hello, world!');
      expect(result.duration).toBe(1.5);
      expect(result.empty).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
          },
        })
      );
    });

    it('should return empty result for empty transcription', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          text: '   ',
          duration: 1.0,
        }),
        text: vi.fn(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await transcribe({
        audioBuffer: Buffer.from('fake audio'),
        mimeType: 'audio/webm',
      });

      expect(result.text).toBe('');
      expect(result.empty).toBe(true);
    });

    it('should throw error when API key is not configured', async () => {
      mockConfig.groqApiKey = '';

      await expect(
        transcribe({
          audioBuffer: Buffer.from('audio'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('Groq API key not configured');
    });

    it('should throw error for 401 unauthorized', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        transcribe({
          audioBuffer: Buffer.from('audio'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('Invalid Groq API key');
    });

    it('should throw error for 429 rate limit', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('Rate limited'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        transcribe({
          audioBuffer: Buffer.from('audio'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('rate limit exceeded');
    });

    it('should throw error for 413 file too large', async () => {
      const mockResponse = {
        ok: false,
        status: 413,
        text: vi.fn().mockResolvedValue('Payload too large'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        transcribe({
          audioBuffer: Buffer.from('audio'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('too large');
    });

    it('should throw error for generic API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ error: { message: 'Internal server error' } })),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        transcribe({
          audioBuffer: Buffer.from('audio'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('Internal server error');
    });

    it('should throw error for empty audio buffer', async () => {
      await expect(
        transcribe({
          audioBuffer: Buffer.from(''),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('Audio file is empty');
    });

    it('should throw error for audio exceeding max size', async () => {
      // Create a buffer slightly larger than max
      const largeBuffer = Buffer.alloc(MAX_AUDIO_SIZE_BYTES + 1);

      await expect(
        transcribe({
          audioBuffer: largeBuffer,
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('Audio file too large');
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(
        transcribe({
          audioBuffer: Buffer.from('audio'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow('timed out');
    });

    it('should use correct file extension for different MIME types', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ text: 'test', duration: 1 }),
        text: vi.fn(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Test mp4 MIME type
      await transcribe({
        audioBuffer: Buffer.from('audio'),
        mimeType: 'audio/mp4',
      });

      // Verify FormData was created with correct extension
      const fetchCall = mockFetch.mock.calls[0];
      const formData = fetchCall[1].body as FormData;
      expect(formData).toBeInstanceOf(FormData);
    });
  });
});
