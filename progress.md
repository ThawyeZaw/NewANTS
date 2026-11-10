# Project Progress & Dual-Track Build Tracker (`progress.md`)

> **Workflow Rule:** Build **strictly ONE component/item per session** using `/continue` (or clarify first with `/askmefirst`).  
> **Zyy Linn Htet (`[ZYY]`)** builds interactive **UI Prototypes first** (`*View.tsx` + mock data on `ui/*` branches).  
> **Thaw Ye Zaw (`[THAW]`)** builds **Foundation, D1, Hono API, Engines & Full-Stack Wiring** (`*Container.tsx` on `feat/*` branches).  
> Every item must pass `pnpm typecheck` + `pnpm lint` + `Vitest` + local dev smoke check + **Manual Approval** before changing from `[~]` to `[x]`.  
> **AI Agents MUST update this file, `spec.md` (if needed), and `AGENTS*.md` (if needed) at the end of EVERY session.**

**Legend:** `[ ]` Queued · `[~]` Built & verified by AI, awaiting manual sign-off · `[x]` Verified & approved

---

## Next Up

### 👉 Next Up for `[THAW]` (Thaw Ye Zaw — Full-Stack, DB, API & Wiring)
- **`[THAW-1.1]` Toolchain, ESLint, Vitest & Runnable Empty App Bootstrapping:** Install core workspace dependencies (`next`, `react`, `tailwindcss` v4, `hono`, `drizzle-orm`, `zod`, `lucide-react`, `eslint`, `vitest`, `@opennextjs/cloudflare`) and create minimal runnable shells for `apps/org` (`:3000`), `apps/study` (`:3001`), `apps/flow` (`:3002`), and `apps/api` (`:8787`) so both Thaw and Zyy can run `pnpm dev` and `pnpm typecheck`.

### 👉 Next Up for `[ZYY]` (Zyy Linn Htet — UI Prototypes & Polishing)
- **`[ZYY-1.2]` `@ants/ui` Ecosystem Chrome Views:** 9-dot `<AppSwitcher />` (`The ANTs` · `Flow` · `Study`), subtle *"by The ANTs"* header badge, `<AuthFormView />` (`/login`, `/signup` UI), and `<UserMenuView />`.

---

## Phase 0: Architecture, Team Alignment & Governance Setup
- [x] **0.1** Initial monorepo & Cloudflare HONC architecture analysis.
- [x] **0.2** Git repository initialization, `pnpm` + Turborepo workspace skeleton, `.gitignore`, and `.env.example`.
- [x] **0.3** Paired Stitch design system specs saved in `docs/design/` (Light + Amber Dark).
- [x] **0.4** Team structural alignment & dual-developer setup:
  - `the-ants.org` (`apps/org`) = Pure Organization Showcase + `/calculator` route.
  - `flow.the-ants.org` (`apps/flow`) = Productivity App (Timetable, Task Planner, Reminders, Pomodoro Timer).
  - `study.the-ants.org` (`apps/study`) = Study Tracker (Topic Tracker, Past Paper Tracker, Exam Countdown, `/calculator`).
  - Shared `@ants/calculator` (`packages/calculator`) mounted on both `the-ants.org/calculator` and `study.the-ants.org/calculator`.
  - Dual-developer governance (`AGENTS.md`, `AGENTS.thaw.md`, `AGENTS.zyy.md`, `.github/CODEOWNERS`) for **Zyy (UI Prototypes First)** and **Thaw (Full-Stack & Admin)**.

---

## Track A: `[ZYY]` — UI Prototypes, Showcase & Polishing (`Zyy Linn Htet` · `ui/*`)

> **Rule for `[ZYY]` tasks:** Build pure `'use client'` presentational views (`*View.tsx`) with exported TypeScript `*ViewProps` and default mock data (`mocks/*.mock.ts`). **Never** edit `packages/db`, `apps/api`, `actions/`, or `hooks/`.

### Stage Z1: Shared Design System, Navigation & Calculator UI (`@ants/ui` & `@ants/calculator`)
- [x] **`[ZYY-1.1]`** `@ants/ui` Stitch Design Tokens (`tokens.css` Light + Amber Dark), ThemeToggle, `Button`, `Card`, `Badge`, `Input`, `Checkbox`, `Tabs`, `Modal`.
- [ ] **`[ZYY-1.2]`** `@ants/ui` Ecosystem Chrome Views: 9-dot `<AppSwitcher />` (`The ANTs` · `Flow` · `Study`), subtle *"by The ANTs"* header badge, `<AuthFormView />` (`/login`, `/signup` UI), and `<UserMenuView />`.
- [ ] **`[ZYY-1.3]`** `@ants/calculator` UI Prototype (`<GradeCalculatorView />`): Interactive board/subject selector UI, paper mark sliders, UMS/grade pills (`A*`–`U`), mounted with mock catalog at both `the-ants.org/calculator` and `study.the-ants.org/calculator`.

### Stage Z2: `the-ants.org` Organization Showcase UI Prototypes (`apps/org`)
- [ ] **`[ZYY-2.1]`** `apps/org` Showcase Navbar, Footer & Home Landing View (`/`): Hero, mission, impact stats, **"Our Products"** (`Flow` & `Study`) showcase cards, and **Hackathon Showcase** spotlight banner.
- [ ] **`[ZYY-2.2]`** Team, Founders, Tutors & Contributors Showcase View (`/team`): Filterable member grid, Founder badges, and Tutor showcase cards.
- [ ] **`[ZYY-2.3]`** Tutor Weekly Availability Grid & Telegram Inquiry QR Modal View: Interactive Sun–Sat slot display (`Available` / `Flexible` / `Unavailable`) + QR modal prototype.
- [ ] **`[ZYY-2.4]`** Activities & Articles Showcase Views (`/activities`, `/activities/[slug]`, `/articles`, `/articles/[slug]`, `/hackathon`): Tutoring, Student's Meet, Exam Venue Visit galleries, and article reader layout.

### Stage Z3: `flow.the-ants.org` Productivity App UI Prototypes (`apps/flow`)
- [ ] **`[ZYY-3.1]`** `apps/flow` App Shell, Sidebar/Mobile Nav & **Pomodoro Timer View (`/pomodoro` + Floating Mini-Timer)**: Tactile Amber progress arc, `JetBrains Mono` timer display, Focus/Break mode pills, and session log list.
- [ ] **`[ZYY-3.2]`** **Task Planner View (`/tasks`) & Today Focus Panel**: TickTick-style `P1`–`P4` priority task cards, subtasks checklist, tag filters, and quick-add bar.
- [ ] **`[ZYY-3.3]`** **Smart Timetable Views (`/timetable`):** Week 24h time-blocking grid UI, Day timeline view, Month calendar view, Exam Countdown banner chips, and Reminder toggle modal.
- [ ] **`[ZYY-3.4]`** Shared User Profile & Account/Telegram Settings View (`/settings`, `/@[username]`): Portfolio sections, Tutor slot-painter UI, and Telegram connect card.

### Stage Z4: `study.the-ants.org` Study Tracker UI Prototypes (`apps/study`)
- [ ] **`[ZYY-4.1]`** `apps/study` App Shell, Sidebar/Mobile Nav & **Study Dashboard View (`/`)**: Enrolled subjects progress cards, XP/Streak bar, and pinned countdowns.
- [ ] **`[ZYY-4.2]`** **Curriculum Catalog & Edexcel Modular Maths Suite Selector View (`/curriculum`):** Board selector, subject cards, highlighted `WMA11-SET` Maths Suite card, and 14-unit / 4-cash-in interactive selector UI.
- [ ] **`[ZYY-4.3]`** **Topic Tracker View (`?tab=topics`):** Syllabus topic accordion, subtopic checklists, confidence pills (`Not Started` / `In Progress` / `Mastered`), difficulty tags, and topic notes drawer.
- [ ] **`[ZYY-4.4]`** **Past Paper Tracker View (`?tab=papers` & `/past-papers`):** Excel-style variant × exam series matrix table, card view toggle, score input modal, and grade/UMS badge derivation UI.
- [ ] **`[ZYY-4.5]`** **Exam Countdown View (`/countdown`) & Leaderboard View (`/leaderboard`):** Live `JetBrains Mono` exam countdown cards, custom mock exam modal, and Scholar XP leaderboard table.
- [ ] **`[ZYY-4.6]`** **Notes, Flashcards & Quizzes UI Prototypes (`/notes`, `/flashcards`, `/quizzes`):** Markdown note reader/editor UI, 3D flip flashcard SRS review UI (`Again`/`Hard`/`Good`/`Easy`), and quiz runner UI.

---

## Track B: `[THAW]` — Full-Stack, D1, API, Engines & Wiring (`Thaw Ye Zaw` · `feat/*`)

> **Rule for `[THAW]` tasks:** Own 100% of `@ants/db`, `apps/api`, `@ants/shared-types`, `@ants/auth-client`, calculation engines, Server Actions, hooks, Admin CMS, and `*Container.tsx` wiring into Zyy's `*View.tsx` components.

### Stage T1: Monorepo Toolchain, D1 Schema, Hono API & SSO (`packages/*` & `apps/api`)
- [ ] **`[THAW-1.1]`** Toolchain, ESLint, Vitest & Runnable Empty App Bootstrapping (`:3000`, `:3001`, `:3002`, `:8787` healthcheck).
- [ ] **`[THAW-1.2]`** `@ants/shared-types`: Role constants, domain config, Zod schemas, Edexcel 14-unit/cash-in types, and shared `*ViewProps` contracts.
- [ ] **`[THAW-1.3]`** `@ants/db` (Part A — Identity, Org & System): Drizzle D1 SQLite helpers + `auth.ts`, `profiles.ts` (with `tutor_profiles`), `organization.ts`, and `system.ts` schemas + Vitest tests.
- [ ] **`[THAW-1.4]`** `@ants/db` (Part B — Academic & Planner): `curriculums.ts`, `study_tools.ts`, `learning.ts`, `planner.ts` (`timetable_events`, `tasks`, `pomodoro_*`), `relations.ts`, and initial D1 SQL migration.
- [ ] **`[THAW-1.5]`** `@ants/api` Auth & Cross-Subdomain SSO: Hono server + Better Auth with Drizzle D1 adapter, `.the-ants.org` cookies (`flow` + `study` + `org/admin`), CORS allowlist, and automatic `profiles` creation on signup + API tests.
- [ ] **`[THAW-1.6]`** `@ants/api` Private R2 Proxy & 5-Min Telegram Cron: `/api/storage/*` upload/stream routes + Telegram Bot `/start` webhook & `*/5 * * * *` `notification_queue` processor + unit tests.
- [ ] **`[THAW-1.7]`** `@ants/auth-client`: Shared `useSession()`, `useRole()`, auth route guards, and cross-subdomain redirect helpers.

### Stage T2: Shared Grade Calculator Engine & `the-ants.org` Backend/CMS (`@ants/calculator` & `apps/org`)
- [ ] **`[THAW-2.1]`** `@ants/calculator` Engine & Public API Wiring: Raw mark → percentage / UMS / composite grade (`A*`–`U`, `9`–`1`) engine + public D1 boundary API wired into `<GradeCalculatorContainer />` on both `the-ants.org/calculator` and `study.the-ants.org/calculator`.
- [ ] **`[THAW-2.2]`** `apps/org` Showcase Data Containers: Wire D1 queries (`org_settings`, `org_team_members`, `tutor_profiles`, `org_activities`, `org_articles`) into Zyy's `the-ants.org` showcase views.
- [ ] **`[THAW-2.3]`** `apps/org` Built-in Admin CMS (`/admin`): Role-gated (`admin`) D1 + R2 CRUD for Mission, Hackathon Showcase external link, Activities/galleries, Markdown Articles, Team/Founders, and User Role management.

### Stage T3: `flow.the-ants.org` Full-Stack Productivity Wiring (`apps/flow`)
- [ ] **`[THAW-3.1]`** Pomodoro Engine & Persistence (`apps/flow`): Guest `localStorage` state machine + authenticated D1 sync (`pomodoro_user_settings`, `pomodoro_sessions`, XP reward) wired into `<PomodoroContainer />`.
- [ ] **`[THAW-3.2]`** Task Planner Actions & Container (`apps/flow`): CRUD, `P1`–`P4` sorting, subtask toggles, and Today Focus state wired into `<TasksContainer />`.
- [ ] **`[THAW-3.3]`** Smart Timetable Engine, Exam Sync & Telegram Reminders (`apps/flow`): Drag/resize persistence, recurrence expansion, read-sync of `exam_countdowns` from `Study`, and `notification_queue` reminder scheduling.
- [ ] **`[THAW-3.4]`** Shared User Profile, Tutor Schedule Editor & Telegram Linking Wiring (`/settings`, `/@[username]`) across `Flow` and `Study`.

### Stage T4: `study.the-ants.org` Full-Stack Academic Tracker Wiring (`apps/study`)
- [ ] **`[THAW-4.1]`** Curriculum Catalog, Enrollment & **Edexcel Modular Maths Suite (`WMA11-SET`)** Rule Engine (`CHOOSE_N_FROM_SET | EXACT_COMBINATION_PAIRS | AT_LEAST_ONE_OF`) wired into `/curriculum`.
- [ ] **`[THAW-4.2]`** **Topic Tracker** Server Actions & Container (`?tab=topics`): Topic/subtopic progress persistence, unit-prefix filtering, and topic notes.
- [ ] **`[THAW-4.3]`** **Past Paper Tracker** Engine & Matrix Container (`?tab=papers` & `/past-papers`): Historical `paper_grade_boundaries` lookup, raw score → grade/UMS auto-derivation, `user_past_paper_records` persistence, and idempotent XP ledger awards.
- [ ] **`[THAW-4.4]`** **Exam Countdown** Actions & Container (`/countdown`): Enrolled exam auto-sync, custom/mock exam CRUD, and `Flow` calendar bridge verification.
- [ ] **`[THAW-4.5]`** Gamification Streaks, Badges & Leaderboard Container (`/leaderboard`) + Study Dashboard (`/`) data aggregation.
- [ ] **`[THAW-4.6]`** Native **Notes, Flashcards (SRS) & Quizzes** Backend + Containers (`/notes`, `/flashcards`, `/quizzes`) + Contributor/Admin Exam Data Studio (`/studio`).

---

## Session History Log

### Session 0 — 2026-10-31 (Initial Setup)
- **Completed:** Items `0.1`, `0.2`, `0.3`.
- **Summary:** Initialized Git (`main`), `pnpm` + Turborepo workspace skeleton, and Stitch design docs (`docs/design/`).

### Session 0.5 — 2026-11-10 (Team Structural Alignment & Dual-Developer Setup)
- **Completed:** Item `0.4`.
- **Summary:**
  - Updated architecture to match team decisions:
    1. **Grade Calculator (`/calculator`)** shared via `@ants/calculator` (`packages/calculator`) and mounted on **both** `the-ants.org/calculator` and `study.the-ants.org/calculator`.
    2. **`the-ants.org` (`apps/org`)** scoped strictly as the **Organization Showcase** (+ `/calculator` & `/admin` CMS), moving user login and student profiles into `Flow` and `Study`.
    3. **`flow.the-ants.org` (`apps/flow`)** scoped as the sleek **Productivity App** (Timetable, Task Planner, Reminders, Pomodoro Timer).
    4. **`study.the-ants.org` (`apps/study`)** scoped as the **IGCSE & IAL Study Tracker** (Topic Tracker, Past Paper Tracker, Exam Countdown, Grade Calculator).
  - Configured dual-developer workflow for **Thaw Ye Zaw** (`AGENTS.thaw.md` · `[THAW]` track) and **Zyy Linn Htet** (`AGENTS.zyy.md` · `[ZYY]` UI-Prototype-First track) plus `.github/CODEOWNERS`.
- **Next Session Target:** Run `/continue` to start **`[THAW-1.1]`** (Toolchain & Runnable Empty App Bootstrapping), which unlocks **`[ZYY-1.1]`** (Design Tokens & UI Primitives) in parallel.

### Session Z1.1 — 2026-11-10 (`[ZYY]` Environment Onboarding & `@ants/ui` Design Tokens + Primitives)
- **In Review (`[~]`):** Item **`[ZYY-1.1]`** on branch `ui/tokens-primitives`.
- **Summary:**
  - Completed Zyy Linn Htet's onboarding setup (`pnpm@10.6.5`, Git remote linked to `https://github.com/ThawyeZaw/NewANTS.git`, branch `ui/tokens-primitives`).
  - Implemented paired Stitch semantic CSS tokens in `packages/ui/src/styles/tokens.css` (*The ANTs Academic System* Light + *Amber Academic Studio* Dark) with Tailwind CSS v4 `@theme inline` bridge.
  - Built pure `'use client'` presentational primitives in `@ants/ui`: `ThemeToggle`, `Button`, `Card` (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), `Badge`, `Input`, `Checkbox`, `Tabs` (`segmented` & `underline`), and `Modal`.
  - Created interactive `<DesignSystemShowcaseView />` (`packages/ui/src/views/DesignSystemShowcaseView.tsx`) with mock data (`packages/ui/src/mocks/design-system.mock.ts`) mounted on `apps/org` (`http://localhost:3000`) + Vitest unit tests (`packages/ui/src/__tests__/primitives.test.ts`).
- **Next Session Target (`[ZYY]`):** Confirm `[ZYY-1.1]` manual sign-off (`[x]`) and run `/continue` for **`[ZYY-1.2]`** (`@ants/ui` Ecosystem Chrome Views: 9-dot `<AppSwitcher />`, *"by The ANTs"* badge, `<AuthFormView />`, and `<UserMenuView />`).
