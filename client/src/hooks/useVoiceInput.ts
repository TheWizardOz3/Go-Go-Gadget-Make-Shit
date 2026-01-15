/**
 * Hook for voice input with transcription
 *
 * Handles audio recording via MediaRecorder, transcription via Groq Whisper API,
 * and state management for the voice input UI.
 */

import React, { useState, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api';

// ============================================================
// Web Speech API Type Declarations
// ============================================================

/**
 * Web Speech API types (not included in TypeScript lib by default)
 * These are simplified declarations for the parts we use
 */
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ============================================================
// Types
// ============================================================

/** Voice input states */
export type VoiceState = 'idle' | 'recording' | 'processing' | 'error';

/** Response from transcription API */
interface TranscriptionResponse {
  text: string;
  empty: boolean;
  duration?: number;
}

/** Options for useVoiceInput hook */
export interface UseVoiceInputOptions {
  /** Called when transcription is complete with the transcribed text */
  onTranscription: (text: string) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/** Return type for useVoiceInput hook */
export interface UseVoiceInputReturn {
  /** Current state of voice input */
  state: VoiceState;
  /** Current error (if any) */
  error: Error | null;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether currently processing/transcribing */
  isProcessing: boolean;
  /** Start recording audio */
  startRecording: () => Promise<void>;
  /** Stop recording and begin transcription */
  stopRecording: () => void;
  /** Reset state to idle and clear errors */
  reset: () => void;
  /** Recording duration in seconds (updates while recording) */
  duration: number;
}

// ============================================================
// Constants
// ============================================================

/** Maximum recording duration in milliseconds (2 minutes) */
const MAX_RECORDING_DURATION_MS = 2 * 60 * 1000;

/** Minimum recording duration to be valid (0.5 seconds) */
const MIN_RECORDING_DURATION_MS = 500;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the best supported audio MIME type for MediaRecorder
 * Prioritizes webm (best Whisper support), falls back to mp4/ogg
 */
function getSupportedMimeType(): string {
  const types = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'];

  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Default fallback
  return 'audio/webm';
}

/**
 * Check if we're in a secure context (HTTPS or localhost)
 * MediaRecorder requires secure context on iOS Safari
 */
function isSecureContext(): boolean {
  return (
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost'
  );
}

/**
 * Check if MediaRecorder API is available
 */
function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof navigator.mediaDevices !== 'undefined';
}

/**
 * Check if Web Speech API is available
 */
function isWebSpeechSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Get the SpeechRecognition constructor (handles webkit prefix)
 */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (window.SpeechRecognition) {
    return window.SpeechRecognition;
  }
  if (window.webkitSpeechRecognition) {
    return window.webkitSpeechRecognition;
  }
  return null;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Hook for recording audio and transcribing to text
 *
 * @param options - Configuration options
 * @returns Object containing state, controls, and handlers
 *
 * @example
 * ```tsx
 * const {
 *   isRecording,
 *   isProcessing,
 *   startRecording,
 *   stopRecording,
 *   error,
 * } = useVoiceInput({
 *   onTranscription: (text) => setInputValue(text),
 *   onError: (error) => showToast(error.message),
 * });
 *
 * return (
 *   <VoiceButton
 *     isRecording={isRecording}
 *     isProcessing={isProcessing}
 *     onStart={startRecording}
 *     onStop={stopRecording}
 *   />
 * );
 * ```
 */
export function useVoiceInput({
  onTranscription,
  onError,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  // State
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [duration, setDuration] = useState(0);

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for Web Speech API fallback
  const speechRecognitionRef = useRef<SpeechRecognition | null>(
    null
  ) as React.MutableRefObject<SpeechRecognition | null>;
  const webSpeechResultRef = useRef<string>('');

  /**
   * Clean up recording resources
   */
  const cleanupRecording = useCallback(() => {
    // Stop duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Clear max duration timeout
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear media recorder reference
    mediaRecorderRef.current = null;

    // Stop Web Speech API recognition if running
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      speechRecognitionRef.current = null;
    }
  }, []);

  /**
   * Start Web Speech API recognition as a fallback
   * Runs in parallel with MediaRecorder to capture backup transcription
   */
  const startWebSpeechFallback = useCallback(() => {
    const SpeechRecognitionConstructor = getSpeechRecognition();
    if (!SpeechRecognitionConstructor) {
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      // Reset the fallback result
      webSpeechResultRef.current = '';

      // Collect results
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            transcript += result[0].transcript + ' ';
          }
        }
        transcript = transcript.trim();

        if (transcript) {
          webSpeechResultRef.current = transcript;
        }
      };

      // Handle errors silently (this is just a fallback)
      recognition.onerror = () => {
        // Don't propagate errors from fallback
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch {
      // Web Speech API failed to start - continue without fallback
    }
  }, []);

  /**
   * Process recorded audio and send for transcription
   * Uses Groq API as primary, Web Speech API result as fallback
   */
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setState('processing');

      // Capture Web Speech result before it gets cleared
      const webSpeechBackup = webSpeechResultRef.current;

      try {
        // Create form data with the audio file
        const formData = new FormData();
        formData.append('audio', audioBlob);

        // Send to transcription API (Groq Whisper)
        const response = await api.upload<TranscriptionResponse>('/transcribe', formData);

        // Check for empty transcription
        if (response.empty || !response.text) {
          throw new Error("Couldn't understand audio. Please try again.");
        }

        // Success - call the callback with transcribed text
        onTranscription(response.text);
        setState('idle');
        setError(null);
      } catch (err) {
        // Groq API failed - try Web Speech API fallback
        if (webSpeechBackup && webSpeechBackup.trim()) {
          // Use the Web Speech API result as fallback
          onTranscription(webSpeechBackup);
          setState('idle');
          setError(null);
          return;
        }

        // Both failed - show error
        let errorMessage = 'Transcription failed. Please try again.';

        if (err instanceof ApiError) {
          // Add context about fallback not available
          if (!isWebSpeechSupported()) {
            errorMessage = `${err.message} (Backup transcription not available in this browser)`;
          } else {
            errorMessage = err.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        const transcriptionError = new Error(errorMessage);
        setError(transcriptionError);
        setState('error');
        onError?.(transcriptionError);

        // Reset to idle after brief error display
        setTimeout(() => {
          setState('idle');
        }, 100);
      }
    },
    [onTranscription, onError]
  );

  /**
   * Start recording using Web Speech API only (fallback mode)
   * Used when MediaRecorder is not available (e.g., iOS Safari over HTTP)
   */
  const startWebSpeechOnly = useCallback(() => {
    const SpeechRecognitionConstructor = getSpeechRecognition();
    if (!SpeechRecognitionConstructor) {
      const unsupportedError = new Error(
        'Voice input requires HTTPS on iOS Safari. Try accessing via https:// or use Chrome.'
      );
      setError(unsupportedError);
      setState('error');
      onError?.(unsupportedError);
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      webSpeechResultRef.current = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            transcript += result[0].transcript + ' ';
          }
        }
        webSpeechResultRef.current = transcript.trim();
      };

      recognition.onerror = (event: Event) => {
        cleanupRecording();
        const errorEvent = event as Event & { error?: string };
        let errorMessage = 'Voice recognition failed. Please try again.';

        if (errorEvent.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please enable microphone permission.';
        } else if (errorEvent.error === 'no-speech') {
          errorMessage = "Couldn't hear anything. Please try again.";
        }

        const recognitionError = new Error(errorMessage);
        setError(recognitionError);
        setState('error');
        onError?.(recognitionError);
        setTimeout(() => setState('idle'), 100);
      };

      recognition.onend = () => {
        // Only process if we were recording (not if stopped due to error)
        if (state === 'recording' && webSpeechResultRef.current) {
          onTranscription(webSpeechResultRef.current);
          setState('idle');
          setError(null);
        } else if (state === 'recording' && !webSpeechResultRef.current) {
          const emptyError = new Error("Couldn't understand audio. Please try again.");
          setError(emptyError);
          setState('error');
          onError?.(emptyError);
          setTimeout(() => setState('idle'), 100);
        }
        cleanupRecording();
      };

      recognition.start();
      speechRecognitionRef.current = recognition;

      // Start duration counter
      recordingStartTimeRef.current = Date.now();
      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);

      // Set up max duration timeout
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
        }
      }, MAX_RECORDING_DURATION_MS);

      setState('recording');
      setError(null);
    } catch {
      cleanupRecording();
      const startError = new Error('Failed to start voice recognition. Please try again.');
      setError(startError);
      setState('error');
      onError?.(startError);
    }
  }, [state, onTranscription, onError, cleanupRecording]);

  /**
   * Start recording audio from the microphone
   */
  const startRecording = useCallback(async () => {
    // Don't start if already recording or processing
    if (state === 'recording' || state === 'processing') {
      return;
    }

    // Check if MediaRecorder is supported AND we're in a secure context
    // iOS Safari requires HTTPS for MediaRecorder
    const canUseMediaRecorder = isMediaRecorderSupported() && isSecureContext();

    if (!canUseMediaRecorder) {
      // Fall back to Web Speech API only mode
      if (isWebSpeechSupported()) {
        startWebSpeechOnly();
        return;
      }

      // Neither is available
      const unsupportedError = new Error(
        'Voice input requires HTTPS on this device. Access via https:// to enable voice.'
      );
      setError(unsupportedError);
      setState('error');
      onError?.(unsupportedError);
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimal for Whisper
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder with supported mime type
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      // Reset audio chunks
      audioChunksRef.current = [];

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        cleanupRecording();

        // Check minimum recording duration
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        if (recordingDuration < MIN_RECORDING_DURATION_MS) {
          const shortError = new Error('Recording too short. Please hold longer.');
          setError(shortError);
          setState('error');
          onError?.(shortError);
          setTimeout(() => setState('idle'), 100);
          return;
        }

        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Process the audio
        await processAudio(audioBlob);
      };

      // Handle errors
      mediaRecorder.onerror = () => {
        cleanupRecording();
        const recordError = new Error('Recording failed. Please try again.');
        setError(recordError);
        setState('error');
        onError?.(recordError);
      };

      // Store reference and start recording
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start(1000); // Collect data every second

      // Start duration counter
      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);

      // Set up max duration timeout
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_DURATION_MS);

      // Start Web Speech API fallback in parallel (if available)
      if (isWebSpeechSupported()) {
        startWebSpeechFallback();
      }

      // Update state
      setState('recording');
      setError(null);
    } catch (err) {
      cleanupRecording();

      // Handle permission denied or other errors
      let errorMessage = 'Failed to start recording. Please try again.';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone access denied. Please enable microphone permission.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone.';
        } else {
          errorMessage = err.message;
        }
      }

      const startError = new Error(errorMessage);
      setError(startError);
      setState('error');
      onError?.(startError);
    }
  }, [state, onError, cleanupRecording, processAudio, startWebSpeechFallback, startWebSpeechOnly]);

  /**
   * Stop recording and begin transcription
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      // State will be updated in onstop handler
    }
  }, []);

  /**
   * Reset state to idle and clear errors
   */
  const reset = useCallback(() => {
    cleanupRecording();
    audioChunksRef.current = [];
    setState('idle');
    setError(null);
    setDuration(0);
  }, [cleanupRecording]);

  return {
    state,
    error,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    startRecording,
    stopRecording,
    reset,
    duration,
  };
}
