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
- **In Review (`[~]`):**
  - **`[ZYY-3.4]` `@ants/ui` + `apps/flow` Shared User Profile (`/@[username]`) & Account/Telegram Settings (`/settings`):** Editable ANTs `@username` (`/@[username]`) kept strictly distinct from Telegram `@username` and optional public booking handle; interactive `Sun–Sat × 08:00–21:00` Tutor drag slot-painter (`Available` / `Flexible` / `Erase`, presets, `12H`/`24H`, live `preview` inquiry mode); multi-role section visibility toggles; and unlinked-by-default `@TheANTsFlowBot` `/start ANT-XXXX` verification synced across `ants-account-profile-v1`, `UserMenuView`, `TodayFocusPanelView`, `TodayFocusRailView`, and `TelegramReminderModalView`.
  - **`[ZYY-3.3]` `apps/flow` Smart Timetable Views (`/timetable`):** Full 24-hour interactive Week Grid, Day Timeline, Month overview, sticky Today Focus Rail, Pomodoro handoff, Telegram reminder modal, and `24h Workday` / `IAL Scholar` presets backed by `localStorage` (`ants-flow-timetable-v1`).
  - **`[ZYY-3.2]` `apps/flow` Task Planner View (`/tasks`) & Today Focus Panel:** TickTick-style `P1`–`P4` priority cards with semantic completion rings, inline functional subtasks checklists, multi-stage filtering (`All` / `Today` / `Upcoming` / `P1–P2` / `Done`, union tag chips, search over subtasks), deterministic priority sorting (`priority` / `due-date` / `duration` / `recent`), quick-add shorthand parser (`!P1 #tag @today ~2p`), sticky `Today Focus Panel`, bidirectional `ants-flow-timetable-v1` + `/pomodoro` integration, and dual presets backed by `localStorage` (`ants-flow-tasks-v1`).
- **Queued Next (`[ZYY-2.2]`):** Team, Founders, Tutors & Contributors Showcase View (`/team` in `apps/org`).

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
- [x] **`[ZYY-1.2]`** `@ants/ui` Ecosystem Chrome Views: 9-dot `<AppSwitcher />` (`The ANTs` · `Flow` · `Study`), subtle *"by The ANTs"* header badge, `<AuthFormView />` (`/login`, `/signup` UI), and `<UserMenuView />`.
- [x] **`[ZYY-1.3]`** `@ants/calculator` UI Prototype (`<GradeCalculatorView />`): Interactive board/subject selector UI, paper mark sliders, UMS/grade pills (`A*`–`U`), mounted with mock catalog at both `the-ants.org/calculator` and `study.the-ants.org/calculator`.

### Stage Z2: `the-ants.org` Organization Showcase UI Prototypes (`apps/org`)
- [x] **`[ZYY-2.1]`** `apps/org` Showcase Navbar, Footer & Home Landing View (`/`): Hero, mission, impact stats, **"Our Products"** (`Flow` & `Study`) showcase cards, and **Hackathon Showcase** spotlight banner.
- [ ] **`[ZYY-2.2]`** Team, Founders, Tutors & Contributors Showcase View (`/team`): Filterable member grid, Founder badges, and Tutor showcase cards.
- [ ] **`[ZYY-2.3]`** Tutor Weekly Availability Grid & Telegram Inquiry QR Modal View: Interactive Sun–Sat slot display (`Available` / `Flexible` / `Unavailable`) + QR modal prototype.
- [ ] **`[ZYY-2.4]`** Activities & Articles Showcase Views (`/activities`, `/activities/[slug]`, `/articles`, `/articles/[slug]`, `/hackathon`): Tutoring, Student's Meet, Exam Venue Visit galleries, and article reader layout.

### Stage Z3: `flow.the-ants.org` Productivity App UI Prototypes (`apps/flow`)
- [x] **`[ZYY-3.1]`** `apps/flow` Slim Top Bar & **Pomodoro Timer View (`/pomodoro` + Floating Mini-Timer)**: Centered single-column timer & task list, `Timer` / `Stats` tabs, crisp progress arc, `JetBrains Mono` countdown, Web Audio notifications, daily/weekly charts, `localStorage` persistence, PWA offline support, keyboard shortcuts, themes/fonts, and distraction-free Focus Mode.
- [~] **`[ZYY-3.2]`** **Task Planner View (`/tasks`) & Today Focus Panel**: TickTick-style `P1`–`P4` priority task cards, subtasks checklist, tag filters, and quick-add bar.
- [~] **`[ZYY-3.3]`** **Smart Timetable Views (`/timetable`):** Week 24h time-blocking grid UI, Day timeline view, Month calendar view, Exam Countdown banner chips, and Reminder toggle modal.
- [~] **`[ZYY-3.4]`** Shared User Profile & Account/Telegram Settings View (`/settings`, `/@[username]`): Portfolio sections, Tutor slot-painter UI, and Telegram connect card.

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

### Session Z1.2 & Z1.3 — 2026-11-10 (`[ZYY]` Ecosystem Chrome Views & `@ants/calculator` Grade Calculator Prototype)
- **Approved (`[x]`):** Item **`[ZYY-1.1]`**.
- **In Review (`[~]`):** Items **`[ZYY-1.2]`** and **`[ZYY-1.3]`** on branch `zaylynn`.
- **Summary:**
  - Built `@ants/ui` Ecosystem Chrome components (`BrandHeaderBadge`, 9-dot `AppSwitcher`, `AuthFormView`, and `UserMenuView` with Guest + Authenticated multi-role states) + mock fixtures (`ecosystem-chrome.mock.ts`).
  - Clarified Grade Calculator UX via `/askmefirst` pop-up modals and built `@ants/calculator` `<GradeCalculatorView />` (`packages/calculator/src/views/GradeCalculatorView.tsx`) with:
    - Two-column desktop studio layout (sticky live Grade & UMS result card on the right).
    - Dual paper mark controls (smooth range slider + synced `JetBrains Mono` numeric box + per-paper boundary preset chips).
    - Exam Series Boundary Switcher (`May/June 2025`, `January 2025`, `Oct/Nov 2024`) across all 4 core ANTs boards (`Edexcel IAL`, `Cambridge AS & A-Level`, `Cambridge IGCSE`, `Edexcel IGCSE`).
    - Mounted guest-accessible route at `apps/org/src/app/(showcase)/calculator/page.tsx` (`/calculator`).
- **Next Session Target (`[ZYY]`):** Verify `/calculator` and `/` on `http://localhost:3000`, mark `[ZYY-1.2]` & `[ZYY-1.3]` as `[x]`, and run `/continue` for **`[ZYY-2.1]`** (`apps/org` Showcase Navbar, Footer & Home Landing View).

### Session Z2.1 — 2026-11-10 (`[ZYY]` Minimalist Humanized Grade Calculator & `apps/org` Home Showcase Landing)
- **Approved (`[x]`):** Items **`[ZYY-1.2]`** and **`[ZYY-1.3]`**.
- **In Review (`[~]`):** Item **`[ZYY-2.1]`** on branch `zaylynn`.
- **Summary:**
  - Refined `<GradeCalculatorView />` (`packages/calculator/src/views/GradeCalculatorView.tsx`) to minimize visual clutter and humanize the UX: unified subject/session bar, clean paper sliders with synced `JetBrains Mono` inputs, and a warm, conversational result card.
  - Built `<OrgNavbarView />`, `<OrgFooterView />`, and `<OrgHomeLandingView />` (`apps/org/src/components/**/views/*View.tsx`) with `showcase-home.mock.ts`, mounted at `/` in `apps/org` (and preserved `<DesignSystemShowcaseView />` at `/design-system`).
- **Next Session Target (`[ZYY]`):** Verify `/` and `/calculator` on `http://localhost:3000`, mark `[ZYY-2.1]` as `[x]`, and run `/continue` for **`[ZYY-2.2]`** (`/team` Showcase View).

### Session Z3.1 — 2026-11-10 (`[ZYY]` `apps/flow` Bootstrapping & Comprehensive Pomodoro Timer Studio)
- **Approved (`[x]`):** Item **`[ZYY-2.1]`**.
- **In Review (`[~]`):** Item **`[ZYY-3.1]`** on branch `zaylynn`.
- **Summary:**
  - Clarified Pomodoro scope via `/askmefirst` pop-up modals and bootstrapped `apps/flow` (`:3002`) with Next.js 15, Tailwind CSS v4, Stitch semantic tokens (`@ants/ui/styles/tokens.css`), PWA manifest (`/manifest.webmanifest`), and offline service worker (`/sw.js`).
  - Built pure client-side Pomodoro engine, statistics aggregator, `localStorage` persistence, and offline Web Audio synthesizer in `apps/flow/src/lib/pomodoro/` (`engine.ts`, `stats.ts`, `storage.ts`, `sound.ts`, `browser.ts`) + mock fixtures (`pomodoro.mock.ts`).
  - Built presentational views (`FlowShellView`, `PomodoroView`, `TimerRingView`, `TaskListView`, `PomodoroStatsView`, `PomodoroSettingsView`, `FocusModeView`, `FloatingMiniTimerView`, `ShortcutsModalView`) with typed props and callbacks ready for Thaw's `[THAW-3.1]` D1 sync container.
  - Added 7 Vitest unit tests (`apps/flow/src/__tests__/pomodoro.test.ts`).
  - **2026-11-11 Layout & Craft Refinement (`/impeccable` + `/askmefirst`):** Distilled the UI to remove clutter and "AI look" — replaced the sidebar/two-column layout with a slim top bar (`Timer` / `Stats` tabs) and single centered column (timer + task list on `Timer`, 3 key metrics + daily/weekly chart + recent sessions on `Stats`), simplified `<TimerRingView />` and `<FocusModeView />`, consolidated sound/theme/shortcut controls into `<PomodoroSettingsView />`, and moved timer transition side effects out of React state updaters (`commit()` + `stateRef`) for StrictMode reliability.
  - **2026-11-11 Focus Scenes & Ambient Soundscapes:** Generated 4 offline-precached atmospheric background scenes (`apps/flow/public/scenes/{rainy-study,quiet-library,misty-forest,warm-fireplace}.jpg`), built continuous Web Audio ambient soundscapes (`apps/flow/src/lib/pomodoro/ambient.ts`: `rain`, `fireplace`, `forest`, `cafe`, `brown-noise`) + subtle start/pause cues (`playFocusCue`), wired scene & sound popovers into `<FocusModeView />` + a dedicated `Atmosphere` tab in `<PomodoroSettingsView />` + subtle backdrop support in `<FlowShellView />`, and expanded unit tests (`8/8` passing).
- **Next Session Target (`[ZYY]`):** Verify `/pomodoro` on `http://localhost:3002`, mark `[ZYY-3.1]` as `[x]`, and run `/continue` for **`[ZYY-2.2]`** (`/team` Showcase View) or **`[ZYY-3.2]`** (`Flow` Task Planner View).

### Session Z3.3 — 2026-11-11 (`[ZYY]` `apps/flow` Smart Timetable Views (`/timetable`) & 24h Coaching Engine)
- **Approved (`[x]`):** Item **`[ZYY-3.1]`**.
- **In Review (`[~]`):** Item **`[ZYY-3.3]`** on branch `zaylynn`.
- **Summary:**
  - Built pure client-side scheduling, recurrence expansion, 5-minute Telegram Cron trigger offset calculation, 15m drag/resize snap math, open-slot finder, and defensive `localStorage` (`ants-flow-timetable-v1`) persistence in `apps/flow/src/lib/timetable/` (`engine.ts`, `storage.ts`).
  - Authored realistic mock presets in `apps/flow/src/mocks/timetable.mock.ts` (`workday-coaching` — full 1,440-minute 24h executive/family coaching schedule with `10:30 PM – 6:00 AM` grouped sleep, 15m transition buffers, peak morning `2 × 25m` Pomodoro side-hustle sprint, `9–5` work, commutes, kids pickup, dinner, gym, reading, and Telegram ping times — plus `scholar-ial` preset and `Study` exam countdown chips).
  - Built presentational views (`SmartTimetableView`, `TimetableWeekGridView`, `TimetableDayView`, `TimetableMonthView`, `TodayFocusRailView`, `BlockEditorModalView`, `TelegramReminderModalView`) mounted at `/timetable` (`apps/flow/src/app/timetable/page.tsx`), wired top-level `Timetable` / `Pomodoro` nav into `<FlowShellView />`, added `/pomodoro?task=...&pomodoros=...` deep-link prefill in `<PomodoroView />`, and updated `public/sw.js` (`v3` precaching `/timetable`).
  - Added 7 Vitest unit tests (`apps/flow/src/__tests__/timetable.test.ts`; `@ants/flow` suite `15/15` passing), passed `tsc --noEmit`, `eslint .`, `impeccable detect --json` (`[]`), and independent Finish Review Verdict Pass (`disposition: ship`).
- **Next Session Target (`[ZYY]`):** Verify `/timetable` and Pomodoro handoff on `http://localhost:3002`, mark `[ZYY-3.3]` as `[x]`, and run `/continue` for **`[ZYY-2.2]`** (`/team` Showcase View) or **`[ZYY-3.2]`** (`Flow` Task Planner View).

### Session Z3.2 — 2026-11-11 (`[ZYY]` `apps/flow` Task Planner View (`/tasks`) & Today Focus Panel)
- **In Review (`[~]`):** Item **`[ZYY-3.2]`** on branch `zaylynn` (alongside **`[ZYY-3.3]`**).
- **Summary:**
  - Clarified module requirements (`ask_question`) and documented the `Operate` Direction Contract in `apps/flow/.impeccable/surfaces/src-app-tasks-page-tsx.md`.
  - Built pure TypeScript task business logic in `apps/flow/src/lib/tasks/engine.ts` and `storage.ts` (`filterTasks` 4-stage pipeline, deterministic `sortTasks` `P1`→`P4` comparators, `parseQuickAddInput` shorthand tokens `!P1`–`!P4` `#tag` `@today`/`@tomorrow`/`@backlog` `~2p`/`~15m`, subtask rollup math, defensive `ants-flow-tasks-v1` persistence, and bidirectional `ants-flow-timetable-v1` focus sync) with inline explanatory comments, plus `apps/flow/src/mocks/tasks.mock.ts` (`workday-coaching` & `scholar-ial`).
  - Built presentational views in `apps/flow/src/components/tasks/views/` (`TaskPlannerView`, `TaskCardView`, `TodayFocusPanelView`, `taskStyles.ts`) and mounted `apps/flow/src/app/tasks/page.tsx`: semantic `P1`–`P4` completion rings & clickable badges, functional inline subtasks checklists with progress bar, interactive multi-tag filters, quick-add bar with parsed shorthand preview, sticky `Today Focus Panel`, `<BlockEditorModalView />` 1-click scheduling, and `/pomodoro?task=...&pomodoros=...` handoff.
  - Updated `<FlowShellView />` with `/tasks` navigation, `<TodayFocusRailView />` with a `/tasks` `Planner →` link, `packages/ui/src/views/UserMenuView.tsx` responsive mobile Guest wrapping, and `public/sw.js` (`v4` precaching `/tasks`).
  - Verified with 6 new Vitest tests (`apps/flow/src/__tests__/tasks.test.ts`; `@ants/flow` suite `21/21` passing), `tsc --noEmit`, `eslint .`, `@ants/ui`/`@ants/org`/`@ants/calculator` checks, `impeccable detect --json` (`[]`), headless Chromium E2E + Light/Dark/390px mobile screenshot inspection, and independent Finish Review Verdict Pass (`disposition: ship`).
- **Next Session Target (`[ZYY]`):** Verify `/tasks` and `/timetable` on `http://localhost:3002`, mark `[ZYY-3.2]` and `[ZYY-3.3]` as `[x]`, and run `/continue` for **`[ZYY-2.2]`** (`/team` Showcase View) or **`[ZYY-3.4]`** (`/settings`, `/@[username]`).

### Session Z3.4 — 2026-11-11 (`[ZYY]` Shared User Profile `/@[username]` & Account/Telegram Settings `/settings`)
- **In Review (`[~]`):** Item **`[ZYY-3.4]`** on branch `zaylynn` (alongside **`[ZYY-3.2]`** and **`[ZYY-3.3]`**).
- **Summary:**
  - Clarified module design via `/askmefirst` and authored `Operate` Direction Contract (`apps/flow/.impeccable/surfaces/src-app-settings-page-tsx.md` with verified seed `seed:799e37072be2cf56`) and design system spec `apps/flow/DESIGN.md`.
  - Built pure shared TypeScript state transformers, brush painting geometry (`paintTutorSlotRect`), Telegram `/start ANT-XXXX` verification helpers, completeness calculator, and defensive storage helpers in `packages/ui/src/lib/account.ts`, plus multi-role demo personas (`@zyylinnhtet`, `@thawyezaw`, `@minkhant`) in `packages/ui/src/mocks/account-profile.mock.ts`.
  - Built shared pure presentational components in `@ants/ui` (`TutorSlotPainterView`, `TelegramConnectCardView`, `AccountSettingsView`, `UserProfileView`) and refined `@ants/ui` primitives/tokens (`tokens.css` `--primary-solid`, `Button.tsx` accessible disabled state, responsive `CardHeader`, high-contrast `UserMenuView` initials/streak ink).
  - Mounted App Router views in `apps/flow` at `/settings` (`apps/flow/src/app/settings/page.tsx`) and `/@[username]` (`apps/flow/src/app/[handle]/page.tsx` via `FlowProfilePageView`) synced via `ants-account-profile-v1` + `accountSync.ts` (`ants-flow-timetable-v1` Telegram link & handle sync), wired `/settings` header navigation in `FlowShellView.tsx`, updated `apps/flow/PRODUCT.md`, and bumped `public/sw.js` (`ants-flow-pwa-v5`).
  - Added Vitest tests in `packages/ui/src/__tests__/account.test.ts` (5 tests) and `apps/flow/src/__tests__/account.test.ts` (2 tests), plus unlinked-default assertions in `packages/ui/src/__tests__/primitives.test.ts` and `apps/flow/src/__tests__/timetable.test.ts`; separated ANTs `@username` editing/validation from Telegram `@username` and updated all default personas (`@zyylinnhtet`, `@thawyezaw`, `@minkhant`), `MOCK_AUTHENTICATED_USER` / `MOCK_ADMIN_USER`, `/timetable` presets, and Flow modals/rails to start with Telegram `unlinked` (`Not linked` + direct `/settings#telegram` `Connect` CTA) ready for onboarding or Settings verification.
  - Verified with `tsc --noEmit` (`@ants/ui`, `@ants/flow`, `@ants/org`, `@ants/calculator`), `eslint src/` (`@ants/ui`, `@ants/flow`, `@ants/org`), `pnpm test` (`14/14` Turbo tasks, including `@ants/ui` `9/9`, `@ants/flow` `23/23`, `@ants/calculator` `3/3`, `@ants/org` `2/2`), headless Chrome CDP E2E across `/settings`, `/@[username]`, `/timetable`, and `/tasks`, and full Light/Amber-Dark/390px visual screenshot inspection.
- **Next Session Target (`[ZYY]`):** Verify `/settings` and `/@[username]` on `http://localhost:3002`, mark `[ZYY-3.2]`–`[ZYY-3.4]` as `[x]`, and run `/continue` for **`[ZYY-2.2]`** (`/team` Showcase View in `apps/org`).

### Session Z3.1 (Polish) — 2026-11-11 (`[ZYY]` Pomodoro Break Start/Pause Button Color & Mechanical Chronograph Dial)
- **Polished (`[x]`):** Item **`[ZYY-3.1]`** on branch `zaylynn` (keeping `[ZYY-3.2]`–`[ZYY-3.4]` in `[~]` review and `[ZYY-2.2]` queued next).
- **Summary:**
  - Unified the primary Start/Pause button color across `Focus`, `Short Break`, and `Long Break` (`bg-primary text-on-primary hover:bg-primary-hover`) in `apps/flow/src/components/pomodoro/views/PomodoroView.tsx`, `apps/flow/src/components/pomodoro/views/FocusModeView.tsx`, and `apps/flow/src/components/pomodoro/views/FloatingMiniTimerView.tsx`, while preserving green (`stroke-success` / `bg-success`) break phase progress indicators.
  - Upgraded `<TimerRingView />` (`apps/flow/src/components/pomodoro/views/TimerRingView.tsx`) into a **Precision Chronograph** mechanical clock dial with a machined outer bezel, 60 graduated chapter ticks (twin-baton 12-o'clock anchor, 5-minute/cardinal batons, and hairline second ticks illuminating with elapsed progress), an outer progress arc with tracking bezel rider, a recessed dial plate framing the `JetBrains Mono` countdown and cycle pips, and a 1-second mechanical escapement pointer (`parseClockSeconds` / `getEscapementSecondStep` with clockwise rollover protection) synced via `remainingMs` across `PomodoroView.tsx` and `FocusModeView.tsx` in Light, Amber Dark, all 5 accents, and `photo` Focus scenes.
  - Fixed Focus Mode and modal stacking over `FlowShellView`'s sticky header (`z-20`) by moving `<FocusModeView />`, `<FloatingMiniTimerView />`, `<PomodoroSettingsView />`, and `<ShortcutsModalView />` outside `<FlowShellView />`'s `<main z-10>` stacking context in `PomodoroView.tsx`.
  - Fixed `<FocusModeView />` Scene/Sound popover hit-testing (`<header>` raised from `z-10` to `z-30` above `<main z-10>` so `<main>` never intercepts clicks or slams popovers closed), added live ambient sound preview while the Focus Mode Sound popover is open + inline `Only while focusing` toggle + `Esc` popover dismissal (`FocusModeView.tsx`, `PomodoroView.tsx`), and added a **Settings** icon button in the Focus Mode bar to open `<PomodoroSettingsView />` cleanly over Focus Mode.
  - **2026-11-11 Mechanical Clock Ticking Sound Effect:** Synthesised classic offline wristwatch/desk-clock tick-tock transients in `apps/flow/src/lib/pomodoro/sound.ts` (`playClockTick`, `playClockTickSample`), added persisted `sound.ticking` (`true` default) and independent `sound.tickingVolume` (`0.35` default) in `engine.ts` and `storage.ts`, wired 1-Hz Focus-only playback into `PomodoroView.tsx` (silent when Paused, Idle, or on Breaks, synced to `100ms` timer polling and second rollovers), and exposed independent `Clock ticking` toggles, volume sliders, and preview triggers in both `<PomodoroSettingsView />` (`Alerts` tab) and `<FocusModeView />` (`Sound` popover).
  - Expanded unit test coverage in `apps/flow/src/__tests__/pomodoro.test.ts` (`10/10` passing; `@ants/flow` `25/25` passing), verified `pnpm --filter @ants/flow typecheck`, `pnpm --filter @ants/flow lint`, `pnpm test` (`14/14` Turbo tasks), live `next dev` (`:3002/pomodoro`) HTTP `200`, and headless Chrome CDP E2E + visual screenshot checks (including Web Audio tick/tock timing & Focus Mode/Settings controls) with zero console errors.
- **Next Session Target (`[ZYY]`):** Verify `/pomodoro` (Focus + Short/Long Break Start button, mechanical clock dial, and Focus Mode), `/tasks`, `/timetable`, `/settings`, and `/@[username]` on `http://localhost:3002`, mark `[ZYY-3.2]`–`[ZYY-3.4]` as `[x]`, and run `/continue` for **`[ZYY-2.2]`** (`/team` Showcase View in `apps/org`).
