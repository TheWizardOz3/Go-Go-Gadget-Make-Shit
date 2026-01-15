# Feature: Voice Input

> **Status**: ✅ Complete  
> **Started**: 2026-01-15  
> **Completed**: 2026-01-15  
> **Feature Doc Version**: 1.1

---

## Overview

Voice input allows users to dictate prompts using their phone's microphone instead of typing. The audio is transcribed to text via the Groq Whisper API, displayed in the input field for review/editing, and then sent to Claude with explicit user confirmation. This enables hands-free interaction while walking around.

## User Story

> As a developer walking around, I want to dictate a prompt with my voice and review it before sending, so I can interact with Claude Code hands-free.

## Requirements (from Product Spec)

- [ ] Tap-to-record button (tap to start, tap to stop—not hold-to-record)
- [ ] Visual feedback during recording (icon change, subtle animation)
- [ ] Transcribe audio using Groq Whisper API (primary) or Web Speech API (fallback)
- [ ] Display transcription in text input for review
- [ ] User can edit transcription before sending
- [ ] User must explicitly tap send (no auto-send)

## Design Specification

### Visual Design

**Voice Button Location**: Next to send button in PromptInput component

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            Conversation Messages                 │
│                                                  │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌──┐ ┌──┐ │
│  │ Type a message...              │  │🎤│ │ ➤│ │
│  │                                │  │  │ │  │ │
│  └────────────────────────────────┘  └──┘ └──┘ │
│  Safe area (bottom padding)                     │
└──────────────────────────────────────────────────┘
```

**Voice Button States**:

| State | Icon | Background | Animation |
|-------|------|------------|-----------|
| Idle | Microphone | `--color-surface-elevated` | None |
| Recording | Stop (square) | `--color-error` (red) | Subtle pulse |
| Processing | Spinner | `--color-accent` | Rotation |
| Disabled | Microphone (muted) | `--color-border` | None |

**Button Specifications**:
- Size: 44×44px (touch target minimum)
- Border radius: 12px (matches send button)
- Positioned between input and send button

**Recording Indicator**:
- Voice button turns red with pulse animation
- Optional: Recording duration timer below button

### States

| State | Voice Button | Input Field | Send Button |
|-------|--------------|-------------|-------------|
| Idle | Mic icon, neutral | Editable | Normal |
| Recording | Stop icon, red + pulse | Disabled | Disabled |
| Processing | Spinner, accent | Disabled, "Transcribing..." | Disabled |
| Transcribed | Mic icon, neutral | Contains transcript, editable | Enabled if text |
| Error | Mic icon, neutral | Unchanged | Normal |

### Accessibility

- Voice button has `aria-label` that changes based on state
- Recording state announced to screen readers
- Error messages accessible via toast and aria-live region
- Fallback to Web Speech API maintains accessibility

## Acceptance Criteria

- [ ] Given I tap the voice button and speak, when I tap stop, then my speech is transcribed into the text input
- [ ] Given a transcription appears, when I review it, then I can edit it before sending
- [ ] Given I tap send after voice input, when Claude Code is running, then the transcribed prompt is sent to the agent
- [ ] Given the Groq API fails, when I try voice input, then it falls back to Web Speech API
- [ ] Given an empty transcription, when returned, then show error toast "Couldn't understand, try again"
- [ ] Given no microphone permission, when I tap voice button, then show permission request with explanation

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                                    │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  VoiceButton    │──►│  useVoiceInput  │──►│  api.post()      │  │
│  │  (Component)    │   │  (Hook)         │   │  /transcribe     │  │
│  └─────────────────┘   └─────────────────┘   └────────┬─────────┘  │
│          │                                            │            │
│          ▼                                            │            │
│  ┌─────────────────┐                                  │            │
│  │  MediaRecorder  │ (Browser API for audio capture)  │            │
│  └─────────────────┘                                  │            │
│          │                                            │            │
│          │ (Fallback)                                 │            │
│          ▼                                            │            │
│  ┌─────────────────┐                                  │            │
│  │  Web Speech API │ (Browser native transcription)   │            │
│  └─────────────────┘                                  │            │
└──────────────────────────────────────────────────────────│──────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend (Express)                                                   │
│  ┌─────────────────┐   ┌─────────────────────┐   ┌───────────────┐ │
│  │  transcribe.ts  │──►│  transcriptionSvc   │──►│  Groq Whisper │ │
│  │  POST /api/...  │   │  .transcribe()      │   │  API          │ │
│  └─────────────────┘   └─────────────────────┘   └───────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### New Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/conversation/VoiceButton.tsx` | Voice recording button with states |
| `client/src/hooks/useVoiceInput.ts` | Hook managing MediaRecorder, Web Speech fallback |
| `server/src/services/transcriptionService.ts` | Groq Whisper API integration |

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/conversation/PromptInput.tsx` | Add VoiceButton, handle transcription |
| `server/src/api/transcribe.ts` | Implement POST endpoint with multer |
| `server/src/lib/config.ts` | Add Groq API key config |
| `server/src/index.ts` | Add multer middleware for file uploads |

### Dependencies to Add

| Package | Purpose | Location |
|---------|---------|----------|
| `multer` | Multipart form data parsing | Server |
| `@types/multer` | TypeScript types | Server (dev) |

### Backend: transcriptionService.ts

```typescript
// server/src/services/transcriptionService.ts
import { config } from '../lib/config';

interface TranscriptionResult {
  text: string;
  duration?: number;
}

/**
 * Transcribe audio using Groq Whisper API
 * 
 * @param audioBuffer - Audio file buffer (webm, mp3, wav, etc.)
 * @param mimeType - Audio MIME type
 * @returns Transcribed text
 */
export async function transcribe(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptionResult> {
  const formData = new FormData();
  
  // Convert buffer to Blob for FormData
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', blob, `audio.${getExtension(mimeType)}`);
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.groqApiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  return {
    text: result.text?.trim() || '',
    duration: result.duration,
  };
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };
  return map[mimeType] || 'webm';
}
```

### Backend: transcribe.ts (update)

```typescript
// server/src/api/transcribe.ts
import { Router } from 'express';
import multer from 'multer';
import { transcribe } from '../services/transcriptionService';
import { success, error, ErrorCodes } from '../lib/responses';

const router = Router();

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max (Whisper limit)
  },
});

/**
 * POST /api/transcribe
 * Transcribe audio to text using Groq Whisper API
 */
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'No audio file provided'));
      return;
    }
    
    const result = await transcribe(req.file.buffer, req.file.mimetype);
    
    if (!result.text) {
      res.status(200).json(success({ text: '', empty: true }));
      return;
    }
    
    res.json(success({ text: result.text }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, message));
  }
});

export default router;
```

### Frontend: useVoiceInput Hook

```typescript
// client/src/hooks/useVoiceInput.ts
import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

type VoiceState = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceInputOptions {
  /** Called when transcription is complete */
  onTranscription: (text: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export function useVoiceInput({ onTranscription, onError }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType(),
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await processAudio(audioBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState('recording');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      setState('error');
      onError?.(error);
    }
  }, [onError]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  }, []);
  
  const processAudio = async (audioBlob: Blob) => {
    try {
      // Try Groq API first
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const response = await api.upload('/transcribe', formData);
      
      if (response.empty) {
        throw new Error('Could not understand audio. Please try again.');
      }
      
      onTranscription(response.text);
      setState('idle');
    } catch (err) {
      // Try Web Speech API fallback
      const fallbackResult = await tryWebSpeechFallback(audioBlob);
      if (fallbackResult) {
        onTranscription(fallbackResult);
        setState('idle');
      } else {
        const error = err instanceof Error ? err : new Error('Transcription failed');
        setError(error);
        setState('error');
        onError?.(error);
        // Reset to idle after showing error
        setTimeout(() => setState('idle'), 100);
      }
    }
  };
  
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);
  
  return {
    state,
    error,
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
  return 'audio/webm'; // Default
}

async function tryWebSpeechFallback(_audioBlob: Blob): Promise<string | null> {
  // Web Speech API requires live audio, not blobs
  // This is a simplified fallback - returns null to indicate failure
  // Real implementation would use SpeechRecognition during recording
  return null;
}
```

### Frontend: VoiceButton Component

```typescript
// client/src/components/conversation/VoiceButton.tsx
import { cn } from '@/lib/cn';

interface VoiceButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function VoiceButton({
  isRecording,
  isProcessing,
  disabled,
  onStart,
  onStop,
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
  
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      aria-label={ariaLabel}
      className={cn(
        // Base styling
        'flex-shrink-0 flex items-center justify-center',
        'w-11 h-11 rounded-xl',
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
      {isProcessing ? (
        <SpinnerIcon />
      ) : isRecording ? (
        <StopIcon />
      ) : (
        <MicrophoneIcon />
      )}
    </button>
  );
}

function MicrophoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
```

### Integration: Update PromptInput

The `PromptInput` component will be updated to include the voice button:

```tsx
// In PromptInput.tsx - updated render
<div className={cn('flex items-end gap-2', ...)}>
  {/* Text input */}
  <div className="relative flex-1">
    <textarea ... />
  </div>

  {/* Voice button - new */}
  <VoiceButton
    isRecording={isRecording}
    isProcessing={isProcessing}
    disabled={isDisabled}
    onStart={startRecording}
    onStop={stopRecording}
  />

  {/* Action button: Stop when working, Send otherwise */}
  {status === 'working' && onStop ? (
    <StopButton ... />
  ) : (
    <button ... >Send</button>
  )}
</div>
```

### Web Speech API Fallback (Enhanced)

For better fallback support, the hook will support live Web Speech API recognition as an alternative to Groq:

```typescript
// In useVoiceInput - enhanced fallback
const useWebSpeechFallback = useCallback(() => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    return null;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  return recognition;
}, []);
```

### API Client Update

Add upload method to the API client:

```typescript
// In client/src/lib/api.ts
export const api = {
  // ... existing methods
  
  async upload(endpoint: string, formData: FormData) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type - browser sets it with boundary
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const json = await response.json();
    return json.data;
  },
};
```

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| No microphone permission | Show permission prompt, then error toast if denied |
| Groq API failure | Fall back to Web Speech API |
| Both APIs fail | Show error toast "Voice input unavailable" |
| Empty transcription | Show toast "Couldn't understand, try again" |
| Very short recording (<0.5s) | Show toast "Recording too short" |
| Very long recording (>2min) | Auto-stop at 2 minutes with notification |
| Network offline | Show error toast "Network unavailable" |
| Recording during send | Disable voice button while sending |

### Config Update

```typescript
// server/src/lib/config.ts - updated
export const config = {
  port: Number(process.env.PORT) || 3456,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  groqApiKey: process.env.GROQ_API_KEY || '',
} as const;
```

## Implementation Tasks

| # | Task | Estimate | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Add multer dependency and configure in server | 20 min | ✅ | multer ^2.0.2, @types/multer ^2.0.0 |
| 2 | Create `transcriptionService.ts` with Groq API | 45 min | ✅ | FormData, error handling, rate limits |
| 3 | Implement POST `/api/transcribe` endpoint | 30 min | ✅ | multer, status endpoint, error codes |
| 4 | Create `useVoiceInput` hook | 45 min | ✅ | MediaRecorder, duration tracking, cleanup |
| 5 | Add Web Speech API fallback to hook | 30 min | ✅ | Parallel recording, auto-fallback on Groq fail |
| 6 | Create `VoiceButton` component | 30 min | ✅ | Haptics, pulse animation, aria-labels |
| 7 | Integrate VoiceButton into PromptInput | 30 min | ✅ | Hook wired, transcription → input, disabled states |
| 8 | Add `api.upload()` method to API client | 15 min | ✅ | Added in task 4 (dependency) |
| 9 | Add error toasts for voice input failures | 20 min | ✅ | Uses existing toast, error styling with icon |
| 10 | Add config for Groq API key | 10 min | ✅ | Added in task 2 (config.groqApiKey) |

**Total Estimated Time**: ~4.5 hours

## Test Plan

### Unit Tests

**transcriptionService.test.ts** (8 tests):
- Successful transcription with mock Groq response
- Empty transcription handling
- API error handling (401, 429, 500)
- Invalid audio format handling
- Timeout handling
- Response parsing

**useVoiceInput.test.ts** (12 tests):
- Start recording triggers MediaRecorder
- Stop recording processes audio
- State transitions (idle → recording → processing → idle)
- Error state handling
- Fallback to Web Speech API
- Microphone permission denied
- Empty transcription handling
- onTranscription callback invoked

**VoiceButton.test.tsx** (10 tests):
- Renders microphone icon when idle
- Renders stop icon when recording
- Renders spinner when processing
- Click starts recording when idle
- Click stops recording when active
- Disabled state prevents interaction
- Correct aria-labels for each state
- Pulse animation during recording

### Integration Tests

- POST `/api/transcribe` with valid audio file
- POST `/api/transcribe` with invalid file type
- POST `/api/transcribe` with missing file
- POST `/api/transcribe` when Groq API key missing

### Manual Testing

- [ ] Record and transcribe on iPhone Safari
- [ ] Test microphone permission flow
- [ ] Test with background noise
- [ ] Test fallback when Groq unavailable
- [ ] Verify transcription appears in input
- [ ] Verify editing transcription works
- [ ] Test error toasts display correctly
- [ ] Test disabled state when Claude is working

## Out of Scope (for this feature)

- Voice waveform visualization (V1)
- Wake word detection ("Hey Claude")
- Real-time streaming transcription
- Multiple language support
- Voice command shortcuts
- Audio playback of recording

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Text Input & Send | Feature | ✅ Complete |
| API Server | Infrastructure | ✅ Complete |
| Toast Component | UI | ✅ Reused existing toast in ConversationView |
| `multer` package | npm | ✅ Installed (^2.0.2) |
| Groq API Key | Config | ✅ Configurable via GROQ_API_KEY env var |

## Test Coverage

| Test File | Tests | Description |
|-----------|-------|-------------|
| `transcriptionService.test.ts` | 13 | API calls, error handling, timeouts |
| `useVoiceInput.test.ts` | 15 | Recording states, transcription, cleanup |
| `VoiceButton.test.tsx` | 18 | Rendering, interactions, accessibility |
| **Total** | **46** | New tests for this feature |

## Related Documents

- [Product Spec - Voice Prompt Input](../product_spec.md#feature-voice-prompt-input)
- [Architecture - Groq Whisper API](../architecture.md#integration-groq-whisper-api)
- [Text Input & Send](./text-input-send.md)

---

*Created: 2026-01-15*  
*Last Updated: 2026-01-15 (Feature Complete)*

