# Feature: Voice Input UX Improvements

> **Status**: ✅ Complete
> **Completed**: 2026-01-17
> **Milestone**: V0.75
> **Feature Doc Version**: 1.1

---

## Overview

This feature enhances the existing voice input experience by making the button larger and more accessible, reducing latency when starting/stopping recording, improving mobile UI alignment, and adding real-time audio waveform visualization during recording. These improvements make voice input feel more responsive and provide visual feedback that recording is working properly.

## User Story

> As a developer using voice input on my phone, I want a bigger, more responsive voice button with visual feedback, so I can easily activate voice recording one-handed and know that it's working without looking closely at the screen.

## Requirements (from Product Spec)

From `project_status.md` and `product_spec.md`:

- [x] **Bigger button**: Increase voice button size for easier one-handed use while walking
- [x] **Lower latency start/stop**: Reduce delay between tap and recording state change
- [x] **Better mobile alignment**: Optimize button placement and spacing for thumb reach
- [x] **Waveform visualization**: Show real-time audio levels during recording using Web Audio API

## Design Specification

### Visual Design Changes

**Current State** (from voice-input.md):
```
┌──────────────────────────────────────────────────┐
│  ┌────────────────────────────────┐  ┌──┐ ┌──┐ │
│  │ Type a message...              │  │🎤│ │ ➤│ │
│  │                                │  │  │ │  │ │
│  └────────────────────────────────┘  └──┘ └──┘ │
└──────────────────────────────────────────────────┘
  44×44px button                    Small gap
```

**Enhanced State**:
```
┌──────────────────────────────────────────────────┐
│  ┌────────────────────────────┐  ┌────┐ ┌────┐  │
│  │ Type a message...          │  │ 🎤 │ │ ➤  │  │
│  │                            │  │    │ │    │  │
│  └────────────────────────────┘  └────┘ └────┘  │
│                                    ▼▼▼▼         │
│                               (Waveform when    │
│                                recording)        │
└──────────────────────────────────────────────────┘
  56×56px button                  12px gap
```

### Button Specifications

| Property       | Current | Enhanced | Rationale                                     |
|----------------|---------|----------|-----------------------------------------------|
| Size           | 44×44px | 56×56px  | Easier thumb target, especially while walking |
| Border radius  | 12px    | 14px     | Proportional to larger size                   |
| Gap from input | 8px     | 12px     | Better visual separation                      |
| Icon size      | 20px    | 24px     | More visible at arm's length                  |
| Touch target   | 44×44px | 56×56px  | Exceeds iOS minimum (44px)                    |

### Waveform Visualization

**Placement**: Below the voice button, slides up when recording starts

**Specifications**:
- **Height**: 48px
- **Width**: 280px (or full width minus 32px padding)
- **Animation**: Slide up from below with 200ms ease-out
- **Bars**: 40-50 vertical bars, 3-4px wide, 2px gap
- **Color**: `--color-accent` with opacity varying by amplitude
- **Refresh rate**: ~60fps via requestAnimationFrame
- **Bar height**: Scales from 4px (silence) to 48px (loud)

**Visual States**:

| State                | Waveform                      | Voice Button             |
|----------------------|-------------------------------|--------------------------|
| Idle                 | Hidden                        | Microphone icon, neutral |
| Recording - Silence  | Flat bars (min height)        | Red, pulsing             |
| Recording - Speaking | Animated bars                 | Red, pulsing             |
| Processing           | Static "processing" animation | Spinner                  |

### Layout Changes

**Current Layout** (from PromptInput.tsx):
```tsx
<div className="flex items-end gap-2">
  <textarea ... />
  <VoiceButton size="44" />
  <ActionButton size="44" />
</div>
```

**Enhanced Layout**:
```tsx
<div className="flex flex-col gap-2">
  {/* Waveform visualization (only when recording) */}
  {isRecording && <Waveform audioStream={audioStream} />}

  {/* Input row */}
  <div className="flex items-end gap-3">
    <textarea ... />
    <VoiceButton size="56" />
    <ActionButton size="56" />
  </div>
</div>
```

### Accessibility

- **Waveform**: `role="status"` with `aria-live="polite"` announcing "Recording audio"
- **Button**: Increased size improves accessibility for motor impairments
- **Visual feedback**: Waveform provides redundant confirmation for those who may not hear audio cues
- **Color contrast**: Waveform bars meet 3:1 minimum for graphical elements

## Acceptance Criteria

- [x] **Given** I tap the voice button, **when** the tap completes, **then** recording starts within 100ms (down from ~300ms)
- [x] **Given** I'm recording audio, **when** I speak, **then** the waveform bars animate to reflect my voice amplitude in real-time
- [x] **Given** I'm holding my phone one-handed, **when** I try to tap the voice button, **then** I can reliably hit it with my thumb without looking closely
- [x] **Given** I'm recording in a quiet environment, **when** there's silence, **then** the waveform shows minimal (flat) bars
- [x] **Given** I tap to stop recording, **when** the tap completes, **then** recording stops and processing begins within 100ms
- [x] **Given** I'm on a smaller iPhone (SE), **when** I view the input area, **then** the buttons don't overflow or cause horizontal scroll
- [x] **Given** I have reduced motion enabled, **when** recording, **then** the waveform animation is simplified (no pulse on button, static bars)

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React)                                            │
│                                                              │
│  ┌───────────────┐    ┌──────────────────┐    ┌──────────┐ │
│  │ VoiceButton   │───►│ useVoiceInput    │───►│ Waveform │ │
│  │ (56×56px)     │    │ (updated hook)   │    │ Component│ │
│  └───────────────┘    └────────┬─────────┘    └─────┬────┘ │
│                                 │                     │      │
│                                 ▼                     │      │
│                        ┌──────────────────┐           │      │
│                        │ MediaRecorder    │───────────┘      │
│                        │ (Web Audio API)  │ audioStream      │
│                        └──────────────────┘                  │
│                                 │                            │
│                                 ▼                            │
│                        ┌──────────────────┐                  │
│                        │ AnalyserNode     │ (FFT analysis)   │
│                        │ (Web Audio API)  │                  │
│                        └──────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### New Files to Create

| File                                              | Purpose                                | Estimated Lines |
|---------------------------------------------------|----------------------------------------|-----------------|
| `client/src/components/conversation/Waveform.tsx` | Audio waveform visualization component | ~150            |
| `client/src/hooks/useAudioAnalyser.ts`            | Web Audio API analyser hook            | ~80             |

### Files to Modify

| File                                                 | Changes                                                | Estimated Impact |
|------------------------------------------------------|--------------------------------------------------------|------------------|
| `client/src/components/conversation/VoiceButton.tsx` | Update size props, add larger variant                  | ~30 lines        |
| `client/src/components/conversation/PromptInput.tsx` | Add Waveform component, adjust layout                  | ~40 lines        |
| `client/src/hooks/useVoiceInput.ts`                  | Add audioStream state, reduce latency, expose analyser | ~50 lines        |
| `client/src/index.css`                               | Add waveform animation keyframes                       | ~20 lines        |

### Dependencies

No new npm dependencies required. Uses built-in Web Audio API.

### Implementation Details

#### 1. Enhanced useVoiceInput Hook

**Current implementation**: Returns `state`, `startRecording`, `stopRecording`

**Enhanced implementation**: Add `audioStream` for waveform visualization

```typescript
// client/src/hooks/useVoiceInput.ts (updated)
import { useState, useCallback, useRef } from 'react';

type VoiceState = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceInputOptions {
  onTranscription: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useVoiceInput({ onTranscription, onError }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder with optimal settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType(),
      });

      chunksRef.current = [];

      // Set up event handlers
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Clear audio stream
        setAudioStream(null);

        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await processAudio(audioBlob);
      };

      // Store refs
      mediaRecorderRef.current = mediaRecorder;

      // Start recording immediately - reduces latency
      mediaRecorder.start();

      // Update state synchronously - reduces perceived latency
      setState('recording');
      setAudioStream(stream);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      setState('error');
      onError?.(error);
    }
  }, [onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      // Stop immediately - reduces latency
      mediaRecorderRef.current.stop();

      // Update state synchronously
      setState('processing');
    }
  }, []);

  const processAudio = async (audioBlob: Blob) => {
    // ... existing implementation
  };

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setAudioStream(null);
  }, []);

  return {
    state,
    error,
    audioStream,  // NEW: Expose for waveform
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    startRecording,
    stopRecording,
    reset,
  };
}

function getSupportedMimeType(): string {
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}
```

**Latency Improvements**:
- Move state updates before async operations
- Start MediaRecorder immediately after getUserMedia
- Remove unnecessary delays/awaits in critical path
- Use synchronous setState calls where possible

#### 2. New useAudioAnalyser Hook

Manages Web Audio API analyser for waveform visualization.

```typescript
// client/src/hooks/useAudioAnalyser.ts
import { useEffect, useState, useRef } from 'react';

interface UseAudioAnalyserOptions {
  /** The MediaStream from getUserMedia */
  audioStream: MediaStream | null;
  /** FFT size (must be power of 2) */
  fftSize?: number;
  /** Smoothing time constant (0-1) */
  smoothingTimeConstant?: number;
}

export function useAudioAnalyser({
  audioStream,
  fftSize = 256,
  smoothingTimeConstant = 0.8,
}: UseAudioAnalyserOptions) {
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioStream) {
      cleanup();
      return;
    }

    // Create audio context and analyser
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);

    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothingTimeConstant;

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    // Create buffer for frequency data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Animation loop to update frequency data
    const updateFrequencyData = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      setFrequencyData(new Uint8Array(dataArray));

      animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
    };

    updateFrequencyData();

    return cleanup;
  }, [audioStream, fftSize, smoothingTimeConstant]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    audioContextRef.current = null;
    analyserRef.current = null;
    setFrequencyData(null);
  };

  return frequencyData;
}
```

#### 3. New Waveform Component

Visualizes audio amplitude in real-time using frequency data from the analyser.

```typescript
// client/src/components/conversation/Waveform.tsx
import { useMemo } from 'react';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { cn } from '@/lib/cn';

interface WaveformProps {
  /** MediaStream from getUserMedia */
  audioStream: MediaStream | null;
  /** Number of bars to display */
  barCount?: number;
  /** Height of the waveform container */
  height?: number;
  /** Custom className */
  className?: string;
}

export function Waveform({
  audioStream,
  barCount = 45,
  height = 48,
  className,
}: WaveformProps) {
  const frequencyData = useAudioAnalyser({
    audioStream,
    fftSize: 256,
    smoothingTimeConstant: 0.8,
  });

  // Downsample frequency data to match bar count
  const barHeights = useMemo(() => {
    if (!frequencyData) {
      return Array(barCount).fill(0);
    }

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

      // Normalize to 0-1 range
      const normalized = average / 255;

      // Apply easing for better visual effect
      const eased = Math.pow(normalized, 1.5);

      heights.push(eased);
    }

    return heights;
  }, [frequencyData, barCount]);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!audioStream) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-0.5 px-4 py-2',
        'animate-slide-up',
        className
      )}
      style={{ height }}
      role="status"
      aria-live="polite"
      aria-label="Recording audio"
    >
      {barHeights.map((height, index) => {
        const barHeight = Math.max(4, height * 100); // Min 4%, max 100%

        return (
          <div
            key={index}
            className={cn(
              'flex-1 rounded-full bg-accent transition-all',
              !prefersReducedMotion && 'duration-75'
            )}
            style={{
              height: `${barHeight}%`,
              opacity: 0.3 + (height * 0.7), // 0.3 to 1.0
              minWidth: '3px',
              maxWidth: '4px',
            }}
          />
        );
      })}
    </div>
  );
}
```

#### 4. Updated VoiceButton Component

Add size variant for larger button.

```typescript
// client/src/components/conversation/VoiceButton.tsx (updated)
import { cn } from '@/lib/cn';

interface VoiceButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  size?: 44 | 56;  // NEW: Size variant
  className?: string;
}

export function VoiceButton({
  isRecording,
  isProcessing,
  disabled,
  onStart,
  onStop,
  size = 56,  // NEW: Default to larger size
  className,
}: VoiceButtonProps) {
  const handleClick = () => {
    if (isProcessing) return;
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  const ariaLabel = isRecording
    ? 'Stop recording'
    : isProcessing
    ? 'Processing audio'
    : 'Start voice input';

  // Size classes
  const sizeClass = size === 56 ? 'w-14 h-14' : 'w-11 h-11';
  const iconSize = size === 56 ? 'w-6 h-6' : 'w-5 h-5';
  const borderRadius = size === 56 ? 'rounded-[14px]' : 'rounded-xl';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      aria-label={ariaLabel}
      className={cn(
        // Base styling
        'flex-shrink-0 flex items-center justify-center',
        sizeClass,
        borderRadius,
        'transition-colors duration-150',
        // Recording state - red with pulse
        isRecording && 'bg-error text-white animate-pulse',
        // Processing state - accent with spinner
        isProcessing && 'bg-accent text-white',
        // Idle state
        !isRecording && !isProcessing && 'bg-surface-elevated text-text-secondary',
        // Hover/active states
        !disabled && !isRecording && !isProcessing && 'hover:bg-text-primary/10 active:bg-text-primary/20',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className={iconSize}>
        {isProcessing ? (
          <SpinnerIcon />
        ) : isRecording ? (
          <StopIcon />
        ) : (
          <MicrophoneIcon />
        )}
      </div>
    </button>
  );
}

// Icons remain the same, but now scale with container
```

#### 5. Updated PromptInput Component

Integrate waveform and adjust layout.

```typescript
// client/src/components/conversation/PromptInput.tsx (updated section)
import { Waveform } from './Waveform';

export function PromptInput({ ... }: PromptInputProps) {
  const {
    state,
    audioStream,
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    onTranscription: setText,
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-border bg-background">
      {/* Waveform visualization - only shown when recording */}
      {isRecording && <Waveform audioStream={audioStream} />}

      {/* Input row with larger buttons and increased gap */}
      <div className="flex items-end gap-3">
        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isRecording || isProcessing || status === 'working'}
            className={cn(
              'w-full resize-none bg-surface rounded-xl px-4 py-3',
              'text-body placeholder:text-text-tertiary',
              'border border-border focus:border-accent focus:outline-none',
              'min-h-[44px] max-h-[120px]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            rows={1}
          />
        </div>

        {/* Voice button - larger size */}
        <VoiceButton
          isRecording={isRecording}
          isProcessing={isProcessing}
          disabled={status === 'working'}
          onStart={startRecording}
          onStop={stopRecording}
          size={56}
        />

        {/* Action button: Stop when working, Send otherwise - larger size */}
        {status === 'working' && onStop ? (
          <StopButton onClick={onStop} size={56} />
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'flex-shrink-0 flex items-center justify-center',
              'w-14 h-14 rounded-[14px]',  // Larger size
              'bg-accent text-white',
              'transition-colors duration-150',
              'hover:bg-accent/90 active:bg-accent/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <SendIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
```

#### 6. Animation Keyframes

Add slide-up animation for waveform.

```css
/* client/src/index.css */

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 200ms ease-out;
}
```

### Performance Considerations

| Concern                     | Mitigation                                                     |
|-----------------------------|----------------------------------------------------------------|
| Waveform render performance | Use `useMemo` for bar height calculations, limit to ~60fps     |
| Memory leaks                | Cleanup audio context and animation frames in useEffect        |
| Battery drain               | Use efficient FFT size (256), throttle updates if backgrounded |
| Mobile performance          | Reduce bar count on smaller devices if needed                  |

### Edge Cases

| Scenario                       | Expected Behavior                                           |
|--------------------------------|-------------------------------------------------------------|
| User taps voice button rapidly | Debounce clicks, prevent multiple overlapping recordings    |
| AudioContext fails to create   | Fall back to recording without waveform visualization       |
| Reduced motion enabled         | Disable pulse animation, use static waveform bars           |
| Very quiet audio               | Show minimal bars (4px height minimum)                      |
| Very loud audio                | Clamp bar heights to container (48px max)                   |
| Screen locked during recording | Continue recording, waveform pauses but resumes on unlock   |
| Low memory                     | Reduce FFT size, bar count dynamically if performance drops |

## Implementation Tasks

| # | Task                           | Est. Time | Dependencies | Notes                                        |
|---|--------------------------------|-----------|--------------|----------------------------------------------|
| 1 | Create `useAudioAnalyser` hook | 45 min    | —            | Web Audio API, cleanup logic                 |
| 2 | Create `Waveform` component    | 60 min    | Task 1       | Bar rendering, animations, a11y              |
| 3 | Update `useVoiceInput` hook    | 30 min    | —            | Add audioStream state, latency optimizations |
| 4 | Update `VoiceButton` component | 30 min    | —            | Add size prop (44/56), scale icons           |
| 5 | Update `PromptInput` component | 45 min    | Tasks 2-4    | Integrate waveform, adjust layout/spacing    |
| 6 | Add CSS animations             | 15 min    | —            | Slide-up keyframes, reduced motion           |
| 7 | Add responsive adjustments     | 30 min    | Tasks 4-5    | Test on iPhone 17, adjust sizes if needed    |
| 8 | Performance optimization       | 30 min    | All          | Memoization, throttling, cleanup             |

**Total Estimated Time**: ~6 hours

## Test Plan

### Unit Tests

**useAudioAnalyser.test.ts** (10 tests):
- Creates AudioContext when stream provided
- Connects MediaStreamSource to AnalyserNode
- Updates frequency data on animation frames
- Cleans up on unmount
- Handles null audioStream
- Respects custom fftSize
- Respects custom smoothingTimeConstant
- Cancels animation frame on cleanup
- Closes AudioContext on cleanup
- Handles AudioContext creation failure

**Waveform.test.tsx** (12 tests):
- Renders null when no audioStream
- Renders correct number of bars
- Bars have minimum height (4%)
- Bars scale based on frequency data
- Applies reduced motion styles
- Has correct ARIA attributes
- Slide-up animation plays
- Updates bars on frequency data change
- Handles empty frequency data
- Custom barCount prop works
- Custom height prop works
- Custom className applied

**VoiceButton.test.tsx** (updates to existing 18 tests):
- Renders at size 44
- Renders at size 56 (new default)
- Icon scales with size
- Border radius scales with size

### Integration Tests

**PromptInput.test.tsx** (additions to existing):
- Waveform appears when recording starts
- Waveform disappears when recording stops
- Layout doesn't break with larger buttons
- Gap between buttons is correct (12px)
- Buttons align properly on small screens

### Manual Testing Checklist

- [ ] Voice button is larger and easier to hit with thumb
- [ ] Waveform appears smoothly when recording starts
- [ ] Waveform bars animate in real-time while speaking
- [ ] Waveform shows minimal bars in silence
- [ ] Waveform disappears when recording stops
- [ ] Latency feels improved (start/stop within 100ms)
- [ ] Layout works on iPhone SE (smallest screen)
- [ ] Layout works on iPhone 15 Pro Max (largest screen)
- [ ] Reduced motion setting disables animations
- [ ] Recording still works if waveform fails to initialize
- [ ] No memory leaks after multiple recordings
- [ ] Battery usage is acceptable

### Performance Testing

- [ ] Waveform maintains 60fps during recording
- [ ] No frame drops while scrolling conversation
- [ ] AudioContext cleanup prevents memory leaks
- [ ] Works smoothly on older devices (iPhone 11)

## Out of Scope (for this feature)

- **Voice command shortcuts**: "Send", "Cancel", etc. (future feature)
- **Frequency spectrum**: Colorful spectrum analyzer (overkill for this use case)
- **Playback**: Playing back recorded audio before sending (adds complexity)
- **Multi-language support**: Waveform is universal, no need for i18n changes
- **Desktop optimizations**: This is mobile-first; desktop gets the same experience
- **Picture-in-Picture mode**: Separate feature (next in V0.75 build order)

## Dependencies

| Dependency        | Type        | Status      | Notes                           |
|-------------------|-------------|-------------|---------------------------------|
| Voice Input (MVP) | Feature     | ✅ Complete  | Foundation for this enhancement |
| Web Audio API     | Browser API | ✅ Available | Built-in, no install needed     |
| Tailwind CSS      | Styling     | ✅ Complete  | For layout and animations       |

## Related Documents

- [Product Spec - Voice Input UX](../product_spec.md#voice-input-ux-improvements)
- [Architecture - Frontend Stack](../architecture.md#frontend-stack)
- [Voice Input (MVP)](./voice-input.md)
- [Project Status - V0.75 Build Order](../project_status.md#v075-build-order)

---

## Implementation Notes

### Files Created
- `client/src/components/conversation/Waveform.tsx` — Audio waveform visualization component (~192 lines)
- `client/src/components/conversation/Waveform.test.tsx` — 12 unit tests
- `client/src/hooks/useAudioAnalyser.ts` — Web Audio API analyser hook (~200 lines)
- `client/src/hooks/useAudioAnalyser.test.ts` — 10 unit tests

### Files Modified
- `client/src/components/conversation/VoiceButton.tsx` — Added size prop (44/56px), default now 56px
- `client/src/components/conversation/PromptInput.tsx` — Integrated Waveform, gap increased to 12px
- `client/src/hooks/useVoiceInput.ts` — Added `audioStream` state for waveform visualization
- `client/src/index.css` — Added `slide-up-fade` animation keyframes
- `client/src/test/setup.ts` — Added `window.matchMedia` mock for reduced motion tests

### Tests Added
- 22 new tests for Voice Input UX Improvements
- **Total test count: 515 tests** (342 client + 173 server)

### Implementation Details
- Button size increased from 44×44px to 56×56px (default)
- Border radius scaled proportionally (12px → 14px)
- Gap between input and buttons increased from 8px to 12px
- Waveform uses Web Audio API `AnalyserNode` for real-time FFT analysis
- Animation runs at ~60fps via `requestAnimationFrame`
- Reduced motion preference is respected (static bars, no pulse)
- Waveform slides up with 200ms ease-out animation when recording starts

---

*Created: 2026-01-17*
*Completed: 2026-01-17*
