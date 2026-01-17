/**
 * Configuration loader
 * Centralized config access with environment variable defaults
 */
export const config = {
  // HTTP port (secondary, for local development without certs)
  httpPort: Number(process.env.HTTP_PORT) || 3457,
  // HTTPS port (primary, enables voice input on iOS Safari)
  port: Number(process.env.PORT) || 3456,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Groq API for voice transcription (Whisper)
  // Get your key at: https://console.groq.com/keys
  groqApiKey: process.env.GROQ_API_KEY || '',

  // Tailscale hostname for notification links
  // e.g., "your-macbook.tailnet-name.ts.net"
  // Can include protocol (https://) or just hostname
  tailscaleHostname: process.env.TAILSCALE_HOSTNAME || 'dereks-macbook-pro.taild775c5.ts.net',

  // Server URL for webhook callbacks
  // Used by Modal to send completion notifications back to this server
  // e.g., "https://your-macbook.tailnet.ts.net:3456" or "http://localhost:3457"
  serverUrl: process.env.SERVER_URL || '',

  // HTTPS/SSL configuration
  // Set these to enable HTTPS (required for voice input on iOS Safari)
  sslCertPath: process.env.SSL_CERT_PATH || '',
  sslKeyPath: process.env.SSL_KEY_PATH || '',

  // Helper to check if HTTPS is configured
  get httpsEnabled(): boolean {
    return Boolean(this.sslCertPath && this.sslKeyPath);
  },

  // Modal cloud configuration
  // Set this to your Modal web endpoint URL after deployment
  // Format: https://<username>--gogogadget-claude-web.modal.run
  modalWebEndpointUrl: process.env.MODAL_WEB_ENDPOINT_URL || '',

  // Helper to check if Modal is configured
  get modalEnabled(): boolean {
    return Boolean(this.modalWebEndpointUrl);
  },
} as const;
