/**
 * Tests for useAudioAnalyser hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAudioAnalyser } from './useAudioAnalyser';

// Mock AudioContext and related APIs
class MockAnalyserNode {
  fftSize = 256;
  smoothingTimeConstant = 0.8;
  frequencyBinCount = 128;

  getByteFrequencyData = vi.fn((array: Uint8Array) => {
    // Fill with mock data
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 255);
    }
  });
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state: string = 'running';
  analyser: MockAnalyserNode;
  source: MockMediaStreamAudioSourceNode;
  createAnalyser: ReturnType<typeof vi.fn>;
  createMediaStreamSource: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;

  constructor() {
    this.analyser = new MockAnalyserNode();
    this.source = new MockMediaStreamAudioSourceNode();
    this.createAnalyser = vi.fn(() => this.analyser);
    this.createMediaStreamSource = vi.fn(() => this.source);
    this.close = vi.fn(() => Promise.resolve());
  }
}

// Mock MediaStream
class MockMediaStream {}

// Helper to store created instance
const instanceHolder = { current: null as MockAudioContext | null };

describe('useAudioAnalyser', () => {
  let mockRequestAnimationFrame: ReturnType<typeof vi.fn>;
  let mockCancelAnimationFrame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset instance holder
    instanceHolder.current = null;

    // Create mock class that stores instance in holder
    class TestAudioContext extends MockAudioContext {
      constructor() {
        super();
        instanceHolder.current = this;
      }
    }

    (global as Record<string, unknown>).AudioContext = TestAudioContext;

    mockRequestAnimationFrame = vi.fn((callback) => {
      setTimeout(callback, 16); // ~60fps
      return 1;
    });
    mockCancelAnimationFrame = vi.fn();

    global.requestAnimationFrame =
      mockRequestAnimationFrame as unknown as typeof requestAnimationFrame;
    global.cancelAnimationFrame =
      mockCancelAnimationFrame as unknown as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    vi.clearAllMocks();
    instanceHolder.current = null;
  });

  it('should return null frequency data when no stream provided', () => {
    const { result } = renderHook(() => useAudioAnalyser({ audioStream: null }));

    expect(result.current.frequencyData).toBeNull();
    expect(result.current.isAnalysing).toBe(false);
  });

  it('should create AudioContext when stream is provided', async () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    renderHook(() => useAudioAnalyser({ audioStream: mockStream }));

    expect(instanceHolder.current).not.toBeNull();
    expect(instanceHolder.current!.createAnalyser).toHaveBeenCalled();
    expect(instanceHolder.current!.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
  });

  it('should connect MediaStreamSource to AnalyserNode', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    renderHook(() => useAudioAnalyser({ audioStream: mockStream }));

    expect(instanceHolder.current).not.toBeNull();
    expect(instanceHolder.current!.source.connect).toHaveBeenCalledWith(
      instanceHolder.current!.analyser
    );
  });

  it('should respect custom fftSize', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const customFFTSize = 512;

    renderHook(() => useAudioAnalyser({ audioStream: mockStream, fftSize: customFFTSize }));

    expect(instanceHolder.current).not.toBeNull();
    expect(instanceHolder.current!.analyser.fftSize).toBe(customFFTSize);
  });

  it('should respect custom smoothingTimeConstant', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const customSmoothing = 0.5;

    renderHook(() =>
      useAudioAnalyser({
        audioStream: mockStream,
        smoothingTimeConstant: customSmoothing,
      })
    );

    expect(instanceHolder.current).not.toBeNull();
    expect(instanceHolder.current!.analyser.smoothingTimeConstant).toBe(customSmoothing);
  });

  it('should update frequency data on animation frames', async () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    const { result } = renderHook(() => useAudioAnalyser({ audioStream: mockStream }));

    // Wait for first animation frame
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.current.frequencyData).toBeInstanceOf(Uint8Array);
    expect(result.current.isAnalysing).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    const { unmount } = renderHook(() => useAudioAnalyser({ audioStream: mockStream }));

    unmount();

    expect(mockCancelAnimationFrame).toHaveBeenCalled();
    expect(instanceHolder.current).not.toBeNull();
    expect(instanceHolder.current!.close).toHaveBeenCalled();
  });

  it('should cleanup when stream becomes null', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    const { rerender } = renderHook(
      ({ stream }: { stream: MediaStream | null }) => useAudioAnalyser({ audioStream: stream }),
      { initialProps: { stream: mockStream as MediaStream | null } }
    );

    // Change to null stream
    rerender({ stream: null });

    expect(mockCancelAnimationFrame).toHaveBeenCalled();
    expect(instanceHolder.current).not.toBeNull();
    expect(instanceHolder.current!.close).toHaveBeenCalled();
  });

  it('should handle AudioContext creation failure gracefully', () => {
    // Mock AudioContext to throw error
    (global as Record<string, unknown>).AudioContext = undefined;

    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useAudioAnalyser({ audioStream: mockStream }));

    expect(result.current.frequencyData).toBeNull();
    expect(result.current.isAnalysing).toBe(false);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('AudioContext not supported'));

    consoleWarn.mockRestore();
  });

  it('should cancel animation frame on cleanup', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    const { unmount } = renderHook(() => useAudioAnalyser({ audioStream: mockStream }));

    unmount();

    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });
});
