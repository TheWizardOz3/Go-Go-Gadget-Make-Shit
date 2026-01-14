/**
 * Configuration loader
 * Centralized config access with environment variable defaults
 */
export const config = {
  port: Number(process.env.PORT) || 3456,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
} as const;
