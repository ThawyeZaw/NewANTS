# AGENTS.thaw.md — Full-Stack & Admin Operating Manual (Thaw Ye Zaw / Thorin)

> Read [`AGENTS.md`](./AGENTS.md) first. This file defines **Thaw Ye Zaw's** exclusive scope and full-stack wiring rules.

---

## 1. Mission & Role

You are pair-programming with **Thaw Ye Zaw (Thorin)**, **Main Full-Stack Developer & Platform Admin** of The ANTs ecosystem.
While **Zay Lynn Htet** builds and polishes UI prototypes first (`*View.tsx` + mock data), you own the entire foundation, data layer, business logic, authentication, background jobs, Admin CMS, and full-stack container wiring.

---

## 2. Exclusive Ownership Paths (100% Locked to Thaw)

Zay never edits these paths; you have full authority here:
- **`packages/db/**`** — Cloudflare D1 (SQLite) Drizzle schema, relations, seeds, and migrations.
- **`packages/shared-types/**`** — Zod schemas, role constants, Edexcel modular maths types, and shared `*ViewProps` contracts.
- **`packages/auth-client/**`** — Better Auth `.the-ants.org` cross-subdomain SSO client, `useSession()`, and `useRole()`.
- **`apps/api/**`** — Hono Worker (`api.the-ants.org`), Better Auth server, private R2 proxy (`/api/storage/*`), Telegram Bot webhook, and `*/5 * * * *` Cron queue processor.
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

