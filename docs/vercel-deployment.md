# Vercel Deployment Guide

Deploy the GoGoGadgetClaude React app to Vercel for always-available access from your phone, even when your laptop is offline.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Modal Deployed**: Complete Modal setup first (see `modal/README.md`)
3. **Tailscale**: Laptop running with Tailscale for local API access

## Quick Deploy

### Option 1: Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/GoGoGadgetClaude)

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project root
vercel

# Follow prompts, then deploy to production
vercel --prod
```

### Option 3: Git Integration

1. Push your repo to GitHub/GitLab/Bitbucket
2. Import project in Vercel dashboard
3. Vercel auto-deploys on push

## Environment Variables

Set these in **Vercel Dashboard > Project > Settings > Environment Variables**:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_LAPTOP_API_URL` | Yes | Your laptop's Tailscale URL | `https://macbook.taild775c5.ts.net:3456` |
| `VITE_MODAL_API_URL` | Yes | Your Modal web endpoint | `https://user--gogogadget-claude-web.modal.run` |

### Finding Your URLs

**Laptop URL (Tailscale):**
```bash
# On your laptop, run:
tailscale status
# Note your machine's Tailscale hostname (e.g., macbook.taild775c5.ts.net)
# Full URL: https://macbook.taild775c5.ts.net:3456
```

**Modal URL:**
```bash
# After deploying Modal, run:
modal app list
# The URL is: https://<username>--gogogadget-claude-web.modal.run
```

## Build Configuration

The `vercel.json` in the project root configures:

- **Build Command**: `cd client && pnpm install && pnpm build`
- **Output Directory**: `client/dist`
- **Framework**: Vite

No additional configuration needed - Vercel reads this automatically.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  iPhone Safari → Vercel (React App)                             │
│                      │                                          │
│                      ▼                                          │
│              ┌───────────────┐                                  │
│              │ Check Laptop  │                                  │
│              │ Availability  │                                  │
│              └───────┬───────┘                                  │
│                      │                                          │
│         ┌───────────┴───────────┐                               │
│         ▼                       ▼                               │
│   ┌──────────┐           ┌───────────┐                          │
│   │  Laptop  │           │   Modal   │                          │
│   │  Online  │           │  (Cloud)  │                          │
│   └────┬─────┘           └─────┬─────┘                          │
│        │                       │                                │
│        ▼                       ▼                                │
│   Local API              Cloud API                              │
│   (Full features)        (Async prompts)                        │
└─────────────────────────────────────────────────────────────────┘
```

1. **Vercel hosts the React app** - Always accessible
2. **App checks laptop availability** - Pings your Tailscale URL
3. **Routes to appropriate API**:
   - Laptop online → Use local API (full features)
   - Laptop offline → Use Modal cloud API (async prompts)

## Deployment Checklist

- [ ] Vercel account created
- [ ] Modal app deployed and URL noted
- [ ] Tailscale running on laptop, URL noted
- [ ] Environment variables set in Vercel
- [ ] Initial deployment successful
- [ ] Test: Access app from phone on WiFi
- [ ] Test: Access app from phone on cellular

## Troubleshooting

### App loads but shows "Laptop unavailable"

1. Ensure laptop is on and GoGoGadgetClaude server is running
2. Check Tailscale is connected on both devices
3. Verify `VITE_LAPTOP_API_URL` is correct (include `https://` and port)

### Build fails on Vercel

1. Check build logs in Vercel dashboard
2. Ensure `pnpm-lock.yaml` is committed
3. Verify all dependencies are listed in `package.json`

### API calls fail with CORS error

1. Modal app needs CORS headers (already configured in `modal_app.py`)
2. For laptop API, ensure server allows your Vercel domain

### Environment variables not working

1. Redeploy after adding/changing env vars
2. Ensure variables start with `VITE_` (required by Vite)
3. Check for typos in variable names

## Custom Domain (Optional)

1. In Vercel: **Project > Settings > Domains**
2. Add your custom domain
3. Configure DNS as instructed
4. SSL certificate is automatic

## Cost

**Vercel Free Tier** includes:
- Unlimited static deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Preview deployments

For personal use, this is more than sufficient.

---

*For Modal deployment instructions, see `modal/README.md`*


