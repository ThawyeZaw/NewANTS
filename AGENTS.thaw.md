# AGENTS.thaw.md — Full-Stack & Admin Operating Manual (Thaw Ye Zaw / Thorin)

> Read [`AGENTS.md`](./AGENTS.md) first. This file defines **Thaw Ye Zaw's** exclusive scope and full-stack wiring rules.

---

## 1. Mission & Role

You are pair-programming with **Thaw Ye Zaw (Thorin)**, **Main Full-Stack Developer & Platform Admin** of The ANTs ecosystem.
While **Zay Lynn Htet** builds and polishes UI prototypes first (`*View.tsx` + mock data), you own the entire foundation, data layer, business logic, authentication, background jobs, Admin CMS, and full-stack container wiring.

---

## 2. Exclusive Ownership Paths (100% Locked to Thaw)

Zay never edits these paths; you have full authority here:
- **`packages/db/**`** — Cloudflare D1 (SQLite) Drizzle schema (8 domain modules + `helpers.ts` + `relations.ts`, 55 tables), `createDb(d1)` factory, re-exported Drizzle query operators (`eq`, `and`, `or`, `desc`, `asc`, `sql`, etc.) so consumers share one `drizzle-orm` instance, `drizzle.config.ts`, and `migrations/` (applied via `pnpm db:migrate:local`).
- **`packages/shared-types/**`** — Zod schemas, role constants (`roles.ts`), ecosystem/CORS & API envelope schemas (`ecosystem.ts`), Edexcel 14-unit/4-cash-in validator (`edexcel-maths.ts`), and shared domain/auth/storage/Telegram contracts (`contracts.ts`).
- **`packages/auth-client/**`** — Shared cross-subdomain SSO SDK exposing isomorphic subpaths (`./redirects` origin & `?redirect=` sanitizer/bounce helpers, `./client` credentialed `@ants/api` fetcher, `./guards` union role capabilities & Access Matrix evaluators, `./server` Next.js `getServerSession()` / middleware guards) plus `'use client'` `provider.tsx` (`<AuthProvider />`, `useSession()`, `useRole()`, `<AuthGuard />`). Keep `'use client'` strictly in `provider.tsx` so Next.js Server Components/Middleware can import `./server` and `./redirects` safely.
- **`apps/api/**`** — Hono Worker (`api.the-ants.org`, configured via `apps/api/wrangler.jsonc` with D1 `DB`, R2 `ASSETS`, `*/5 * * * *` cron, `GET /api/health`, `GET /api/ecosystem`, `src/auth/*` Web-Crypto Drizzle D1 cross-subdomain SSO routes, `src/storage/*` private R2 upload/stream/delete proxy, `src/telegram/*` webhook & linking/preferences/test-ping/unlink routes, `src/cron/notification-runner.ts` 5-minute `notification_queue` drainer, and `src/http/context.ts` shared route helpers). Note: `apps/api/src/index.ts` is the Cloudflare Worker entrypoint and must only export functions/types/Hono `app`/`default` (`workerd` rejects primitive constant exports from the main entrypoint).
- **`packages/calculator/src/engine/**`** — Grade Calculator raw-mark / UMS / cash-in calculation engine & boundary lookup logic.
- **`apps/{org,study,flow}/src/actions/**` & `src/hooks/**`** — Server Actions, data fetching, optimistic mutations, and state hooks.
- **`apps/{org,study,flow}/src/components/**/containers/*Container.tsx`** — Smart Containers that fetch D1/API data and pass typed props into Zay's `*View.tsx` components.
- **`apps/org/src/app/admin/**`** & **`apps/study/src/app/studio/**`** — Organization Admin CMS and Contributor/Admin Exam Data Studio.

---

## 3. How to Wire Backend into Zay's UI Prototypes Safely

1. **Never Rewrite Zay's Visual Markup:**
   - When Zay finishes a prototype (`*View.tsx`), inspect its exported `*ViewProps` interface.
   - Build a corresponding `*Container.tsx` (or Server Component `page.tsx`) that queries D1 / Hono API and renders `<FeatureView {...realProps} />`.
   - If you need to add a prop to `*ViewProps`, make it optional or provide a default in the mock fixture (`src/mocks/*.mock.ts`) so Zay's isolated UI preview never breaks `pnpm typecheck`.
2. **Can Build Headless or With Base Fallback First:**
   - If you are building a backend module before Zay has built its `*View.tsx`, export the typed hook/container and test it thoroughly with **Vitest** (or a minimal unstyled harness), leaving the `*View.tsx` slot ready for Zay.
3. **End-of-Session Rule:**
   - Always update the **`[THAW]`** section in [`progress.md`](./progress.md), plus [`spec.md`](./spec.md) and [`AGENTS.md`](./AGENTS.md) / [`AGENTS.thaw.md`](./AGENTS.thaw.md) at the end of every session.
- Use **`/push`** to test, fix local errors, and push to your `feat/*` branch (or `main`).

