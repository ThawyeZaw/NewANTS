import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface ApiBindings {
  DB?: D1Database;
  ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
  COOKIE_DOMAIN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
}

export interface ScheduledTickResult {
  ok: true;
  cron: string;
  scheduledTimeIso: string;
  d1Ready: boolean;
  processedCount: number;
  sentCount: number;
  failedCount: number;
  retryingCount: number;
  cancelledCount: number;
  simulatedCount: number;
}
