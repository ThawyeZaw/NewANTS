import { z } from 'zod';

/**
 * Canonical workspace application IDs across The ANTs monorepo.
 */
export const ECOSYSTEM_APP_IDS = ['org', 'flow', 'study'] as const;
export const EcosystemAppIdSchema = z.enum(ECOSYSTEM_APP_IDS);
export type EcosystemAppId = z.infer<typeof EcosystemAppIdSchema>;

export const ECOSYSTEM_PORTS = {
  org: 3000,
  study: 3001,
  flow: 3002,
  api: 8787,
} as const;

export const ECOSYSTEM_PRODUCTION_COOKIE_DOMAIN = '.the-ants.org' as const;

export const EcosystemAppMetadataSchema = z.object({
  id: EcosystemAppIdSchema,
  name: z.string().min(1),
  domain: z.string().min(1),
  port: z.number().int().positive(),
  localUrl: z.string().url(),
  prodUrl: z.string().url(),
  purpose: z.string().min(1),
});

export type EcosystemAppMetadata = z.infer<typeof EcosystemAppMetadataSchema>;

export const ECOSYSTEM_APPS: Record<EcosystemAppId, EcosystemAppMetadata> = {
  org: {
    id: 'org',
    name: 'The ANTs',
    domain: 'the-ants.org',
    port: ECOSYSTEM_PORTS.org,
    localUrl: 'http://localhost:3000',
    prodUrl: 'https://the-ants.org',
    purpose: 'Organization showcase, team/tutors, activities, articles, /calculator, and /admin CMS.',
  },
  study: {
    id: 'study',
    name: 'Study',
    domain: 'study.the-ants.org',
    port: ECOSYSTEM_PORTS.study,
    localUrl: 'http://localhost:3001',
    prodUrl: 'https://study.the-ants.org',
    purpose: 'IGCSE & IAL Topic Tracker, Past Paper Matrix, Exam Countdown, and Grade Calculator.',
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    domain: 'flow.the-ants.org',
    port: ECOSYSTEM_PORTS.flow,
    localUrl: 'http://localhost:3002',
    prodUrl: 'https://flow.the-ants.org',
    purpose: 'Smart Timetable, P1-P4 Task Planner, Telegram Reminders, and Pomodoro Timer.',
  },
};

export const ECOSYSTEM_APP_LIST: readonly EcosystemAppMetadata[] = [
  ECOSYSTEM_APPS.org,
  ECOSYSTEM_APPS.study,
  ECOSYSTEM_APPS.flow,
];

/**
 * Exact allowlist of browser origins authorized to make credentialed cross-origin
 * requests to `@ants/api` (`api.the-ants.org` / `localhost:8787`).
 */
export const ALLOWED_CORS_ORIGINS: readonly string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'https://the-ants.org',
  'https://www.the-ants.org',
  'https://study.the-ants.org',
  'https://flow.the-ants.org',
  'https://api.the-ants.org',
];

const SUBDOMAIN_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.the-ants\.org$/i;

/**
 * Evaluates whether a request `Origin` header is permitted for CORS + Better Auth SSO.
 */
export function isAllowedCorsOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (ALLOWED_CORS_ORIGINS.includes(origin)) return true;
  return SUBDOMAIN_ORIGIN_PATTERN.test(origin);
}

export const ApiHealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('@ants/api'),
  version: z.string().min(1),
  environment: z.string().min(1),
  timestamp: z.string().datetime(),
  cronSchedule: z.literal('*/5 * * * *'),
  bindings: z.object({
    d1: z.boolean(),
    r2: z.boolean(),
  }),
  apps: z.array(EcosystemAppMetadataSchema),
});

export type ApiHealthResponse = z.infer<typeof ApiHealthResponseSchema>;

export const ApiErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Helper constructing a typed success envelope Zod schema `{ ok: true, data }`.
 */
export function createApiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
  });
}
