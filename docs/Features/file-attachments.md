# Feature: Image Attachment (MVP)

> **Status**: ✅ Complete  
> **Started**: 2026-01-18  
> **Completed**: 2026-01-19  
> **Milestone**: V1.2

---

## Overview

Attach **one image** (screenshot) to a prompt. Works in local and cloud modes.

## Requirements (MVP)

| Requirement                       | Priority |
|-----------------------------------|----------|
| Attach one image (png, jpg, webp) | MUST     |
| Show preview with remove button   | MUST     |
| Works in local mode               | MUST     |
| Works in cloud mode (Modal)       | MUST     |
| Max 5MB file size                 | MUST     |

**Out of Scope:** Multiple attachments, text files, paste from clipboard

---

## Technical Approach

Image is saved to a temp file, then referenced in the prompt with `@filepath` syntax that Claude CLI understands.

**API Changes:**

```typescript
// POST /api/sessions/:id/send & POST /api/cloud/jobs
{
  prompt: string;
  imageAttachment?: {
    filename: string;
    mimeType: string;
    base64: string;
  };
}
```

**Server-side:**
1. Decode base64 → save to `/tmp/gogogadget-<uuid>.png`
2. Prepend `@/tmp/gogogadget-<uuid>.png` to prompt
3. Pass modified prompt to Claude CLI
4. Cleanup temp file after process exits

---

## Implementation Tasks

| # | Task                             | Est. |
|---|----------------------------------|------|
| 1 | Add ImageAttachment type         | 5m   |
| 2 | Update sessions.ts API           | 15m  |
| 3 | Update claudeService for images  | 15m  |
| 4 | Update Modal app for images      | 20m  |
| 5 | Add attach button to PromptInput | 25m  |
| 6 | Update useSendPrompt hook        | 10m  |

**Total: ~1.5 hours**

---

## Files Changed

**Shared Types:**
- `shared/types/index.ts` — Added `ImageAttachment` interface, `IMAGE_ATTACHMENT_MAX_SIZE` constant

**Server (Local Mode):**
- `server/src/api/sessions.ts` — Added `imageAttachment` to send prompt schema
- `server/src/services/claudeService.ts` — Save image to temp file, prepend `@filepath` to prompt, cleanup on exit

**Server (Cloud Mode):**
- `server/src/api/cloud.ts` — Added `imageAttachment` to dispatch job schema
- `server/src/services/modalClient.ts` — Pass `image_attachment` to Modal

**Modal (Cloud Execution):**
- `modal/modal_app.py` — Decode base64, save to `/tmp/`, prepend to prompt, cleanup

**Client:**
- `client/src/components/conversation/PromptInput.tsx` — Attach button, image preview, file validation
- `client/src/hooks/useSendPrompt.ts` — Accept `ImageAttachment` in all send functions

---

*Created: 2026-01-18*  
*Completed: 2026-01-19*
