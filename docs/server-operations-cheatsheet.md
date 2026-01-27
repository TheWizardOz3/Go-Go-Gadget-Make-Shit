# Server Operations Cheatsheet

Quick reference for starting, rebuilding, and troubleshooting GoGoGadgetClaude servers.

---

## Quick Health Check

```bash
# Check if local server is running
curl http://localhost:3457/api/status

# Check HTTPS port (with self-signed cert)
curl -k https://localhost:3456/api/status

# Expected response when healthy:
# {"data":{"healthy":true,"claudeRunning":false},"meta":{"timestamp":"..."}}
```

---

## Starting the Server

### Development Mode (with hot reload)
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude"
pnpm dev
```
- Runs both client (Vite on :5173) and server (tsx watch)
- Auto-reloads on file changes
- Best for active development

### Production Mode
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude"
pnpm start
```
- Serves built client + runs compiled server
- Use for normal daily use

### Direct Node (if pnpm fails)
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude/server"
node dist/server/src/index.js
```
- Bypasses pnpm, useful if you get permission errors
- Run from Terminal.app if Cursor has sandbox issues

---

## Rebuilding

### Full Rebuild (client + server)
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude"
pnpm build
```

### Server Only
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude/server"
pnpm build
```

### Client Only
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude/client"
pnpm build
```

### Clean Rebuild (nuclear option)
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude"
rm -rf node_modules server/dist client/dist
pnpm install
pnpm build
```

---

## Stopping Servers

### Kill all Node processes
```bash
killall -9 node
```

### Find and kill specific port
```bash
# Find what's using port 3456
lsof -i :3456

# Kill by PID
kill -9 <PID>
```

---

## Common Issues & Fixes

### App shows "Cloud" mode when laptop is on
**Cause:** Server isn't running  
**Fix:** Start the server (see above)

### EPERM: operation not permitted
**Cause:** macOS/Cursor sandbox permission issue  
**Fix:** Run directly from Terminal.app instead of Cursor:
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude/server"
node dist/server/src/index.js
```

### Port already in use
```bash
killall -9 node
sleep 2
pnpm start
```

### Module not found errors
```bash
pnpm install
pnpm build
```

### Server starts but app can't connect
1. Check Tailscale is running: `tailscale status`
2. Verify server is listening: `curl http://localhost:3457/api/status`
3. Check firewall isn't blocking ports 3456/3457

---

## Deployment (Vercel)

### Deploy to production
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude"
vercel --prod
```

### Preview deployment
```bash
vercel
```

### Check deployment logs
```bash
vercel logs
```

---

## Modal (Cloud Backend)

### Deploy Modal functions
```bash
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude/modal"
modal deploy main.py
```

### Check Modal logs
```bash
modal app logs gogogadgetclaude
```

### Sync scheduled prompts to Modal
Happens automatically when server starts, or manually via Settings in the app.

---

## Useful Paths

| What | Path |
|------|------|
| Project root | `/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude` |
| Server code | `server/src/` |
| Client code | `client/src/` |
| Server build | `server/dist/server/src/` |
| Client build | `client/dist/` |
| App settings | `~/.gogogadgetclaude/settings.json` |
| Claude sessions | `~/.claude/projects/` |
| Server logs | Terminal where server is running |

---

## Server Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 3456 | HTTPS | Primary (voice input requires HTTPS) |
| 3457 | HTTP | Secondary (for development/testing) |
| 5173 | HTTP | Vite dev server (dev mode only) |

---

## Quick Restart Recipe

When things aren't working, this sequence usually fixes it:

```bash
# 1. Kill everything
killall -9 node 2>/dev/null

# 2. Wait a moment
sleep 2

# 3. Start fresh
cd "/Users/derekosgood/Documents/0_Git Repos/GoGoGadgetClaude"
pnpm start

# 4. Verify it's working
curl http://localhost:3457/api/status
```

---

*Last Updated: 2026-01-26*

