# GoGoGadgetClaude

> Monitor and control Claude Code from your phone 📱

A mobile-first web interface for monitoring and controlling Claude Code sessions running on your laptop—from anywhere via Tailscale.

## Features

- 📱 **Mobile-First UI** — Designed for one-handed use while walking
- 💬 **Conversation View** — See what Claude is doing in real-time
- 🎤 **Voice Input** — Dictate prompts using Groq Whisper
- ⏹️ **Stop Button** — Immediately halt the agent if needed
- 📁 **File Diffs** — Review code changes with syntax highlighting
- 🔔 **iMessage Notifications** — Get notified when tasks complete

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20.x LTS** — [Download](https://nodejs.org/)
- **pnpm** — `npm install -g pnpm`
- **Claude Code CLI** — [Installation Guide](https://docs.anthropic.com/claude-code)
- **Git** — Usually pre-installed on macOS
- **Tailscale** — For phone access (see setup below)

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd gogogadgetclaude
pnpm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your GROQ_API_KEY
```

### 3. Get Your Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to [API Keys](https://console.groq.com/keys)
4. Create a new API key
5. Copy it to your `.env` file:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

### 4. Set Up Tailscale

Tailscale creates a secure private network between your devices.

**On your Mac:**
```bash
# Install via Homebrew
brew install tailscale

# Or download from https://tailscale.com/download

# Start Tailscale and sign in
sudo tailscale up
```

**On your iPhone:**
1. Install [Tailscale from the App Store](https://apps.apple.com/app/tailscale/id1470499037)
2. Sign in with the same account as your Mac
3. Both devices are now on the same private network!

**Get your Mac's Tailscale hostname:**
```bash
tailscale status
# Look for your machine name, e.g., "your-macbook"
# Full URL will be: http://your-macbook.tailnet-name.ts.net:3456
```

### 5. Start Development

```bash
# Run both client and server in development mode
pnpm dev
```

The app will be available at:
- **Local:** http://localhost:3456
- **Phone (via Tailscale):** http://your-macbook.tailnet-name.ts.net:3456

### 6. (Optional) Set Up Notifications

To receive iMessage notifications when Claude completes tasks:

```bash
# Run the setup script
./scripts/setup-hooks.sh
```

This configures Claude Code's hooks to notify you when tasks complete.

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (client + server) |
| `pnpm dev:client` | Start only the Vite dev server |
| `pnpm dev:server` | Start only the Node.js server |
| `pnpm build` | Build client for production |
| `pnpm start` | Run production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix auto-fixable lint issues |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run tests |

## Project Structure

```
gogogadgetclaude/
├── client/           # React frontend (Vite)
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utilities
│       └── stores/       # Zustand state
├── server/           # Node.js backend (Express)
│   └── src/
│       ├── api/          # REST endpoints
│       ├── services/     # Business logic
│       └── lib/          # Utilities
├── shared/           # Shared TypeScript types
├── scripts/          # Setup scripts
└── docs/             # Documentation
```

## How It Works

```
┌─────────────────┐         ┌─────────────────────────────────────┐
│  iPhone Safari  │ Tailscale│  Your Mac                          │
│  (React SPA)    │◄────────►│  Node.js Express :3456             │
└─────────────────┘         │         │                          │
                            │         ▼                          │
                            │  ┌─────────────┐  ┌──────────────┐ │
                            │  │ ~/.claude/  │  │ Claude Code  │ │
                            │  │ (JSONL)     │  │ (CLI)        │ │
                            │  └─────────────┘  └──────────────┘ │
                            └─────────────────────────────────────┘
```

1. **React app** polls the server every 2-3 seconds
2. **Server** reads JSONL files from `~/.claude/projects/`
3. **You send a prompt** → Server spawns `claude -p` → Claude writes to JSONL
4. **Next poll** picks up the new messages

## Troubleshooting

### Can't connect from phone
- Ensure Tailscale is running on both devices
- Check you're using the correct hostname: `tailscale status`
- Verify the server is running: `curl http://localhost:3456/api/status`

### Voice transcription not working
- Verify your `GROQ_API_KEY` is set in `.env`
- Check the browser has microphone permissions
- The app will fall back to Web Speech API if Groq fails

### Notifications not arriving
- Run `./scripts/setup-hooks.sh` to configure hooks
- Verify your phone number in Settings or `.env`
- Check that iMessage is working on your Mac

## Documentation

- [Product Spec](docs/product_spec.md) — Features and requirements
- [Architecture](docs/architecture.md) — Technical design
- [Decision Log](docs/decision_log.md) — Why we chose things
- [Changelog](docs/changelog.md) — Version history

## License

MIT

