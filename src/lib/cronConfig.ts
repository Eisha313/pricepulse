/**
 * Cron job configuration for PricePulse
 * 
 * This file documents the cron jobs used by the application.
 * Actual scheduling is done via Vercel Cron or similar service.
 */

export const cronJobs = {
  checkPrices: {
    path: '/api/cron/check-prices',
    schedule: '0 */4 * * *', // Every 4 hours
    description: 'Check all tracked products for price changes and trigger alerts',
  },
} as const;

/**
 * Vercel cron configuration (vercel.json)
 * 
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/check-prices",
 *       "schedule": "0 */4 * * *"
 *     }
 *   ]
 * }
 */

export const CRON_INTERVALS = {
  HOURLY: '0 * * * *',
  EVERY_4_HOURS: '0 */4 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  TWICE_DAILY: '0 0,12 * * *',
  DAILY: '0 0 * * *',
} as const;

export type CronInterval = typeof CRON_INTERVALS[keyof typeof CRON_INTERVALS];
