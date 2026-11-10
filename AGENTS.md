# AGENTS.md — Dual-Developer AI Operating Manual (`NewANTS`)

> **READ FIRST AT THE START OF EVERY SESSION.**  
> This repository is built incrementally **one component at a time** from scratch using AI agents by two collaborating developers. Maintainability, zero merge conflicts, and living documentation are non-negotiable.

---

## 1. Two-Developer Team & Role Files

Identify which developer is running the current session and **read your corresponding role file immediately after this file**:

| Developer | Role | Branch Prefix | Dedicated Role Manual | Track in `progress.md` |
| :--- | :--- | :--- | :--- | :--- |
| **Thaw Ye Zaw (Thorin)** | **Main Full-Stack Developer & Platform Admin** (DB, Hono API, Auth, Server Actions, Business Logic, Smart Containers, Admin CMS) | `feat/*` | [`AGENTS.thaw.md`](./AGENTS.thaw.md) | **`[THAW]`** |
| **Zyy Linn Htet** | **Front-End & UI Polishing Lead** (Builds **UI Prototypes first** with mock props, Stitch Light/Dark styling, animations, `the-ants.org` showcase UI) | `ui/*` | [`AGENTS.zyy.md`](./AGENTS.zyy.md) | **`[ZYY]`** |

---

## 2. How Thaw & Zyy Work in Parallel Without Breaking the App

We follow a strict **UI-Prototype-First (`Zyy`) → Full-Stack Wiring (`Thaw`)** separation pattern:

1. **Presentational (`*View.tsx`) vs. Smart Container (`*Container.tsx` / `page.tsx`) Split:**
   - **Zyy Linn Htet** builds and polishes **pure presentational UI components** (`src/components/**/views/*View.tsx`) and mock fixtures (`src/mocks/*.mock.ts`).
   - Every `*View.tsx` starts with `'use client';`, accepts strictly typed props (with default mock data so it renders standalone), and **NEVER imports `@ants/db`, server actions, or live API fetchers**.
   - **Thaw Ye Zaw** builds the D1 database schema (`@ants/db`), Hono API (`apps/api`), Server Actions (`src/actions/**`), hooks (`src/hooks/**`), and Smart Containers (`*Container.tsx`) that pass real data and callbacks into Zyy's `*View.tsx` components.
2. **Strict File Ownership Lock (Zero Merge Conflicts):**
   - **Zyy NEVER edits:** `packages/db/**`, `apps/api/**`, `packages/auth-client/**`, `packages/shared-types/**`, `**/actions/**`, `**/hooks/**`, `**/*Container.tsx`, or `/admin/**`.
   - **Thaw NEVER overwrites Zyy's visual Tailwind styling** inside `*View.tsx` when wiring backend data—Thaw passes real props into `<FeatureView {...data} />`.

---

## 3. Monorepo Topology, Ports & Finalized Subdomains

| Workspace Package | Directory | Port | Production URL | Purpose & Key Features |
| :--- | :--- | :---: | :--- | :--- |
| `@ants/org` | `apps/org` | `3000` | `https://the-ants.org` | **Pure Organization Showcase:** Mission, Members, Tutors & weekly availability, Activities (Tutoring, Student's Meet, Exam Venue Visit), Articles, Hackathon Showcase (external link), `/admin` CMS, **+ `/calculator` route** (zero student login/profiles here). |
| `@ants/study` | `apps/study` | `3001` | `https://study.the-ants.org` | **Study** *(by The ANTs)*: IGCSE & IAL **Topic Tracker**, **Past Paper Tracker** (Excel matrix + UMS), **Exam Countdown**, **Grade Calculator (`/calculator`)**, Notes, Flashcards, Quizzes, Auth & Student Profile/Settings. |
| `@ants/flow` | `apps/flow` | `3002` | `https://flow.the-ants.org` | **Flow** *(by The ANTs)*: Sleek Productivity App for everyone — **Smart Timetable**, **Task Planner**, **Telegram Reminders**, **Pomodoro Timer** (guest + synced), synced Exam Countdowns, Auth & Profile/Settings. |
| `@ants/api` | `apps/api` | `8787` | `https://api.the-ants.org` | **Headless Hono Worker:** Better Auth (`.the-ants.org` cross-subdomain SSO between `flow` & `study` + `org/admin`), private R2 proxy, Telegram webhook & `*/5 * * * *` Cron queue. |
| `@ants/calculator` | `packages/calculator` | — | *(Mounted in `org` & `study`)* | **Shared Grade Calculator Package:** Guest-accessible calculator rendered at BOTH `the-ants.org/calculator` and `study.the-ants.org/calculator`. |
| `@ants/ui` | `packages/ui` | — | *(Shared across all 3 apps)* | Stitch Design System tokens (`tokens.css` Light + Amber Dark), shared primitives, 9-dot `AppSwitcher`, shared Auth/Settings views. |
| `@ants/db` | `packages/db` | — | *(Bound as `env.DB`)* | Drizzle ORM + Cloudflare D1 (SQLite) schema, relations, and migrations (**Thaw only**). |
| `@ants/shared-types` | `packages/shared-types` | — | — | Shared Zod schemas, role constants, and TypeScript UI/API contracts (**Thaw only**). |
| `@ants/auth-client` | `packages/auth-client` | — | — | Shared Better Auth client, `useSession()`, and `useRole()` hooks (**Thaw only**). |

---

## 4. Mandatory Session Lifecycle, Verification & End-of-Session Updates

### Clarify Before Coding (`/askmefirst`)
- Whenever requirements, UI states, or contracts have any ambiguity—or when `/askmefirst` is invoked—call the **`ask_question` tool (interactive pop-up modals)** with a `(Recommended)` option first before writing code.

### Strict "One Component at a Time" & Verification Gate
Build **one atomic item per session** from your track (`[ZYY]` or `[THAW]`) in `progress.md`. Every item must pass **all 5 gates** before being marked `[x]`:
1. **Typecheck:** `pnpm typecheck` passes with zero errors across the monorepo.
2. **Lint:** `pnpm lint` passes cleanly.
3. **Automated Tests:** `pnpm test` (Vitest) passes.
4. **Local Dev Smoke Check:** Relevant dev server (`pnpm dev:org`, `pnpm dev:study`, `pnpm dev:flow`, or `pnpm dev:api`) renders/responds with zero runtime errors.
5. **Developer Manual Sign-Off:** Present verification steps to the developer. Keep the item marked `[~]` until manually confirmed, then mark `[x]`.

### Mandatory End-of-Session File Updates (NEVER SKIP)
At the end of **EVERY** session, AI agents **MUST** review and update:
1. **`progress.md`** *(Always update)*: Update `[~]` / `[x]` status in your track (`[ZYY]` or `[THAW]`), advance `## Next Up`, and append an entry to `## Session History Log`.
2. **`spec.md`** *(Update whenever details evolve)*: Keep routes, UI contracts, and D1 schema specifications 100% up to date.
3. **`AGENTS.md` / `AGENTS.thaw.md` / `AGENTS.zyy.md`** *(Update whenever workflows evolve)*: Document new shared components, mock patterns, hooks, or guardrails.
