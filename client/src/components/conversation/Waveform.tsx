/**
 * Waveform - Real-time audio visualization component
 *
 * Displays animated vertical bars representing audio frequency data
 * from a MediaStream. Uses Web Audio API for analysis.
 *
 * Features:
 * - Real-time frequency analysis at ~60fps
 * - Configurable bar count and height
 * - Respects reduced motion preferences
 * - Slide-up animation on mount
 * - Accessible with ARIA attributes
 */

import { useMemo, useState, useEffect } from 'react';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { cn } from '@/lib/cn';

// ============================================================
// Types
// ============================================================

interface WaveformProps {
  /** MediaStream from getUserMedia */
  audioStream: MediaStream | null;
  /** Number of bars to display (default: 45) */
  barCount?: number;
  /** Height of the waveform container in pixels (default: 48) */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// Constants
// ============================================================

/** Default number of bars to render */
const DEFAULT_BAR_COUNT = 45;

/** Default container height in pixels */
const DEFAULT_HEIGHT = 48;

/** Minimum bar height as percentage (ensures bars are always visible) */
const MIN_BAR_HEIGHT_PERCENT = 4;

/** Minimum opacity for bars (ensures bars are always visible) */
const MIN_OPACITY = 0.3;

/** Maximum opacity for bars */
const MAX_OPACITY = 1.0;

/** Power for easing function (higher = more emphasis on loud sounds) */
const EASING_POWER = 1.5;

// ============================================================
// Component
// ============================================================

/**
 * Waveform visualization component
 *
 * Renders animated vertical bars that respond to audio input in real-time.
 * Uses frequency data from Web Audio API AnalyserNode.
 *
 * @example
 * ```tsx
 * // Basic usage with MediaStream
 * <Waveform audioStream={mediaStream} />
 *
 * // Custom configuration
 * <Waveform
 *   audioStream={mediaStream}
 *   barCount={30}
 *   height={64}
 *   className="my-custom-class"
 * />
 * ```
 */
export function Waveform({
  audioStream,
  barCount = DEFAULT_BAR_COUNT,
  height = DEFAULT_HEIGHT,
  className,
}: WaveformProps) {
  // Get frequency data from audio analyser
  const { frequencyData } = useAudioAnalyser({
    audioStream,
    fftSize: 256,
    smoothingTimeConstant: 0.8,
  });

  // Check for reduced motion preference (memoized for performance)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Listen for changes to reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Downsample frequency data to match bar count (memoized for performance)
  const barHeights = useMemo(() => {
    // No data yet - return zeros
    if (!frequencyData) {
      return Array(barCount).fill(0);
    }

    // Calculate how many frequency bins to average per bar
    const samplesPerBar = Math.floor(frequencyData.length / barCount);
    const heights: number[] = [];

    for (let i = 0; i < barCount; i++) {
      const start = i * samplesPerBar;
      const end = start + samplesPerBar;

      // Average frequency data for this bar
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += frequencyData[j];
      }
      const average = sum / samplesPerBar;

      // Normalize to 0-1 range (frequency data is 0-255)
      const normalized = average / 255;

      // Apply easing for better visual effect (emphasizes louder sounds)
      const eased = Math.pow(normalized, EASING_POWER);

      heights.push(eased);
    }

    return heights;
  }, [frequencyData, barCount]);

  // Don't render if no audio stream
  if (!audioStream) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-0.5 px-4 py-2',
        'animate-slide-up-fade',
        className
      )}
      style={{ height }}
      role="status"
      aria-live="polite"
      aria-label="Recording audio"
    >
      {barHeights.map((normalizedHeight, index) => {
        // Calculate bar height as percentage (min 4%, max 100%)
        const barHeightPercent = Math.max(MIN_BAR_HEIGHT_PERCENT, normalizedHeight * 100);

        // Calculate opacity (0.3 to 1.0 based on height)
        const opacity = MIN_OPACITY + normalizedHeight * (MAX_OPACITY - MIN_OPACITY);

        return (
          <div
            key={index}
            className={cn(
              'flex-1 rounded-full bg-accent transition-all',
              !prefersReducedMotion && 'duration-75'
            )}
            style={{
              height: `${barHeightPercent}%`,
              opacity,
              minWidth: '3px',
              maxWidth: '4px',
            }}
          />
        );
      })}
    </div>
  );
}
