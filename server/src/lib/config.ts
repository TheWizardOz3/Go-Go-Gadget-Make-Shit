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

  // HTTPS/SSL configuration
  // Set these to enable HTTPS (required for voice input on iOS Safari)
  sslCertPath: process.env.SSL_CERT_PATH || '',
  sslKeyPath: process.env.SSL_KEY_PATH || '',

  // Helper to check if HTTPS is configured
  get httpsEnabled(): boolean {
    return Boolean(this.sslCertPath && this.sslKeyPath);
  },
} as const;
