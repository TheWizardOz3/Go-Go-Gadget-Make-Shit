/**
 * Hook for audio waveform analysis using Web Audio API
 *
 * Creates an AnalyserNode connected to a MediaStream and provides
 * real-time frequency data for waveform visualization.
 */

import { useEffect, useState, useRef, useCallback } from 'react';

// ============================================================
// Types
// ============================================================

/** Options for useAudioAnalyser hook */
export interface UseAudioAnalyserOptions {
  /** The MediaStream from getUserMedia */
  audioStream: MediaStream | null;
  /** FFT size - must be power of 2, affects frequency resolution (default: 256) */
  fftSize?: number;
  /** Smoothing time constant 0-1 - higher = smoother (default: 0.8) */
  smoothingTimeConstant?: number;
}

/** Return type for useAudioAnalyser hook */
export interface UseAudioAnalyserReturn {
  /** Frequency data as Uint8Array (0-255 values), null when not analyzing */
  frequencyData: Uint8Array | null;
  /** Whether the analyser is currently active */
  isAnalysing: boolean;
}

// ============================================================
// Constants
// ============================================================

/** Default FFT size - 256 gives 128 frequency bins, good balance of detail/performance */
const DEFAULT_FFT_SIZE = 256;

/** Default smoothing - 0.8 provides smooth animation without too much lag */
const DEFAULT_SMOOTHING = 0.8;

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Hook for analyzing audio from a MediaStream
 *
 * Creates a Web Audio API pipeline to analyze audio frequency data
 * in real-time. Frequency data is updated at ~60fps via requestAnimationFrame.
 *
 * @param options - Configuration options
 * @returns Object containing frequency data and analysis state
 *
 * @example
 * ```tsx
 * const { frequencyData, isAnalysing } = useAudioAnalyser({
 *   audioStream: mediaStream,
 *   fftSize: 256,
 *   smoothingTimeConstant: 0.8,
 * });
 *
 * // Use frequencyData to render waveform bars
 * if (frequencyData) {
 *   frequencyData.forEach((value, index) => {
 *     const normalizedHeight = value / 255;
 *     // Render bar at index with height
 *   });
 * }
 * ```
 */
export function useAudioAnalyser({
  audioStream,
  fftSize = DEFAULT_FFT_SIZE,
  smoothingTimeConstant = DEFAULT_SMOOTHING,
}: UseAudioAnalyserOptions): UseAudioAnalyserReturn {
  // State for frequency data
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Refs for Web Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Clean up all Web Audio API resources
   */
  const cleanup = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect source node
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      sourceRef.current = null;
    }

    // Clear analyser reference
    analyserRef.current = null;

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore close errors
      }
    }
    audioContextRef.current = null;

    // Clear state
    setFrequencyData(null);
    setIsAnalysing(false);
  }, []);

  // Set up audio analysis when stream changes
  useEffect(() => {
    // No stream - clean up and return
    if (!audioStream) {
      cleanup();
      return;
    }

    // Check if AudioContext is available
    if (typeof AudioContext === 'undefined') {
      console.warn('useAudioAnalyser: AudioContext not supported in this browser');
      return;
    }

    try {
      // Create audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create analyser node with specified settings
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyserRef.current = analyser;

      // Create source from MediaStream and connect to analyser
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);
      sourceRef.current = source;

      // Create buffer for frequency data
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Start analysis
      setIsAnalysing(true);

      /**
       * Animation loop to update frequency data
       * Uses requestAnimationFrame for smooth ~60fps updates
       */
      const updateFrequencyData = () => {
        // Check if we should continue (analyser still exists)
        if (!analyserRef.current) {
          return;
        }

        // Get current frequency data
        analyserRef.current.getByteFrequencyData(dataArray);

        // Create new array to trigger React re-render
        // (using slice to create a copy since getByteFrequencyData reuses the buffer)
        setFrequencyData(new Uint8Array(dataArray));

        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
      };

      // Start the animation loop
      updateFrequencyData();
    } catch (err) {
      // Log error but don't throw - graceful degradation
      console.error('useAudioAnalyser: Failed to initialize audio analysis', err);
      cleanup();
    }

    // Cleanup on unmount or stream change
    return cleanup;
  }, [audioStream, fftSize, smoothingTimeConstant, cleanup]);

  return {
    frequencyData,
    isAnalysing,
  };
}
