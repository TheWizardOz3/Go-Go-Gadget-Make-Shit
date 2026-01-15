/**
 * Configuration loader
 * Centralized config access with environment variable defaults
 */
export const config = {
  port: Number(process.env.PORT) || 3456,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Groq API for voice transcription (Whisper)
  // Get your key at: https://console.groq.com/keys
  groqApiKey: process.env.GROQ_API_KEY || '',
} as const;
