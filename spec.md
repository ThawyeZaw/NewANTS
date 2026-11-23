# The ANTs Ecosystem — System Specification & Feature Manifest (`spec.md`)

> **Authoritative Single Source of Truth.**  
> Built from scratch one verified component at a time by **Thaw Ye Zaw (Thorin — Main Full-Stack & Admin)** and **Zay Lynn Htet (Front-End Prototypes & UI Polishing)**.  
> Whenever a feature contract, route, or database schema detail is refined during a session, AI agents **must** keep this document synchronized.

---

## 1. Vision & Multi-App Ecosystem Architecture

Following the team's architectural decisions, **The ANTs** is structured into **3 specialized frontend web apps** + **1 shared Hono API Worker** inside a single Cloudflare HONC monorepo:

| Product | Domain (Prod / Local) | Monorepo App | UI Branding | Target Audience | Core Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. The ANTs (Showcase)** | `https://the-ants.org` (`localhost:3000`) | `apps/org` (`@ants/org`) | **The ANTs** | General public, students, tutors, event attendees, sponsors | **100% Pure Organization Showcase:** Mission, Founders & Members, Tutors & weekly availability, Activities (Tutoring, Student's Meet, Exam Venue Visit, Hackathon with external registration), Articles, `/admin` CMS, **+ preserved `/calculator` route** (zero user login/student profiles on `the-ants.org`). |
| **2. Flow (Productivity)** | `https://flow.the-ants.org` (`localhost:3002`) | `apps/flow` (`@ants/flow`) | **Flow** *(by The ANTs)* | **Everyone** (general productivity users & students) | **Sleek TickTick-Style Productivity App:** Day/Week/Month **Smart Timetable**, **Task Planner**, **Telegram Reminders**, **Pomodoro Timer** *(guest + synced)*, synced Exam Countdowns, plus Auth & User Profile Settings. |
| **3. Study (Academic Hub)** | `https://study.the-ants.org` (`localhost:3001`) | `apps/study` (`@ants/study`) | **Study** *(by The ANTs)* | **Cambridge & Pearson Edexcel IGCSE / IAL / A-Level students** | **IGCSE & IAL Study Tracker:** Syllabus **Topic Tracker**, Edexcel Modular Maths Suite, Excel-style **Past Paper Tracker**, **Exam Countdown**, **Grade Calculator (`/calculator`)**, Notes, Flashcards, Quizzes, Leaderboard, plus Auth & User Profile Settings. |
| **4. API Worker** | `https://api.the-ants.org` (`localhost:8787`) | `apps/api` (`@ants/api`) | *(Headless Worker)* | Internal API serving all 3 frontends | **Shared Backend Engine:** Hono router, Better Auth (`.the-ants.org` cross-subdomain SSO between `flow` & `study`), private Cloudflare R2 file streaming, Telegram Bot webhook, and `*/5 * * * *` Cron notification queue processor. |

> **Beta Testing Workers (`*.thawyezaw.workers.dev`):** Isolated Cloudflare Workers beta deployment serving `https://ants-org.thawyezaw.workers.dev`, `https://ants-study.thawyezaw.workers.dev`, `https://ants-flow.thawyezaw.workers.dev`, and `https://ants-api.thawyezaw.workers.dev` (bound to D1 `the-ants-v2-db` `08906524-156f-44b6-bc22-e8703c2dae2f`) while legacy v1 `the-ants.org` / `api.the-ants.org` domains stay untouched.

### Key Team Structural Decisions
1. **Grade Calculator (`/calculator`) Mounted on BOTH `the-ants.org/calculator` & `study.the-ants.org/calculator`:**
   - Lives once in the shared package `@ants/calculator` (`packages/calculator`).
   - Preserves existing `the-ants.org/calculator` links and SEO while also giving students inside `study.the-ants.org/calculator` instant access. Works 100% without login (guest-accessible).
2. **`the-ants.org` is Purely an Organization Showcase:**
   - No student login or user profile management lives on `the-ants.org` (except hidden/protected `/admin` CMS for org content editors).
   - User authentication (`/login`, `/signup`) and user profile/account settings (`/settings`, `/@[username]`) live inside **`flow.the-ants.org`** and **`study.the-ants.org`**, sharing a single session automatically via `.the-ants.org` cookies.
3. **`flow.the-ants.org` Owns the Full Productivity Suite (Including Pomodoro):**
   - Houses the **Smart Timetable**, **Task Planner**, **Reminders**, and **Pomodoro Timer** (guest-usable via `localStorage`, synced to D1 when logged in).
4. **`study.the-ants.org` Owns the Academic Trackers & Exam Countdown:**
   - Houses **Topic Tracker**, **Past Paper Tracker**, **Grade Calculator (`/calculator`)**, and **Exam Countdown** (which syncs target exam dates & reminders over to `flow.the-ants.org`).

---

## 2. Dual-Developer Workflow (Thaw Ye Zaw × Zay Lynn Htet)

| Developer | Role | Workflow Responsibility |
| :--- | :--- | :--- |
| **Zay Lynn Htet** (`AGENTS.zyy.md`) | **Front-End & UI Polishing Lead** | **Builds UI Prototypes First (`ui/*` branches):** Designs and polishes `@ants/ui` primitives, `apps/org` showcase pages, and pure presentational `*View.tsx` components in `apps/flow`, `apps/study`, and `packages/calculator` backed by realistic `mocks/*.mock.ts` data (zero DB/API imports). |
| **Thaw Ye Zaw / Thorin** (`AGENTS.thaw.md`) | **Main Full-Stack Developer & Platform Admin** | **Builds Foundation, Backend & Full-Stack Wiring (`feat/*` branches):** Owns `@ants/db` (D1), `apps/api` (Hono, Better Auth, R2, Cron), `@ants/shared-types`, `@ants/auth-client`, calculation/UMS engines, Server Actions, hooks, Admin CMS, and `*Container.tsx` components that pass live data into Zay's `*View.tsx` prototypes. |

---

## 3. Technology Stack (100% Cloudflare HONC Monorepo)

- **Monorepo & Package Manager:** `pnpm` workspaces + **Turborepo** (`NewANTS`)
- **Language:** TypeScript 5 (`strict: true`, `noUncheckedIndexedAccess: true`)
- **Frontend Framework (All 3 Web Apps):** **Next.js 16 (App Router) + React 19**, deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Styling & Icons:** **Tailwind CSS v4** with paired semantic CSS variables + **`lucide-react`** icons exclusively
- **Typography:** **Plus Jakarta Sans** (UI, headings, editorial copy) + **JetBrains Mono** (`font-mono tabular-nums` for timers, syllabus codes, scores, UMS, durations, and dates)
- **Backend API:** **Hono** on **Cloudflare Workers** (`apps/api`, configured in `apps/api/wrangler.jsonc` exposing `GET /`, `GET /api/health`, `GET /api/ecosystem`, `/api/auth/*`, `/api/calculator/*` (`GET /catalog`, `GET /subjects/:subjectId`, `POST /calculate`, `POST /calculate-maths-suite`, authenticated `GET`/`POST`/`DELETE /snapshots`), `/api/storage/*`, `/api/telegram/*`, structured JSON error envelopes, and `scheduled` `*/5 * * * *` cron entrypoint)
- **Database & ORM:** **Cloudflare D1 (SQLite)** + **Drizzle ORM** (`packages/db`), bound directly as `env.DB` to Workers
- **Shared Validation:** **Zod** schemas & TypeScript contracts (`packages/shared-types`: `roles.ts`, `ecosystem.ts`, `edexcel-maths.ts`, `contracts.ts` including R2 storage and Telegram Bot DTOs)
- **Authentication & Client SDK:** Web-Crypto PBKDF2-HMAC-SHA256 (`100_000` iterations) + Drizzle D1 SQLite adapter on `api.the-ants.org` (`POST /api/auth/sign-up/email`, strict email-only `POST /api/auth/sign-in/email`, `GET /api/auth/get-session` / `/api/auth/session`, `POST /api/auth/sign-out`), emitting dual cross-subdomain cookies (`better-auth.session_token` `HttpOnly` + `ants_sso_session` bridge) scoped to `.the-ants.org` (`Secure; SameSite=Lax`) in production and host-only `localhost` in development with atomic signup provisioning (`profiles`, `student_profiles`, `notification_preferences`, `user_streaks`, and `tutor_profiles` when `academicTrack === 'tutor'`), paired with `@ants/auth-client` (`packages/auth-client`: `<AuthProvider />`, `useSession()`, `useRole()`, `<AuthGuard />`, `getServerSession()`, Access Matrix guards, and cross-subdomain redirect helpers).
- **Object Storage:** Private **Cloudflare R2** bucket `the-ants-assets` (`env.ASSETS`) proxied via `/api/storage/file/*` (`GET`/`HEAD` public for `org`/`articles`/`activities`/`avatars`/`study` with `ETag`/`304`, session owner/admin auth for `private/*`), role-gated `POST /api/storage/upload` (multipart `FormData` + base64 JSON Data URLs), and `DELETE /api/storage/file/*`
- **Background Jobs & Messaging:** **Telegram Bot Webhook & Account Suite** (`POST /api/telegram/webhook` `/start ANT-XXXX` linking + `GET /api/telegram/status`, `POST /api/telegram/link/start`, `PUT`/`PATCH /api/telegram/preferences`, `POST /api/telegram/test-ping`, `POST /api/telegram/unlink`) paired with **Cloudflare Worker Cron** (`*/5 * * * *` in `apps/api/src/cron/notification-runner.ts`) draining due `notification_queue` rows to Telegram Bot API (or local simulated delivery + `notifications` mirror when `TELEGRAM_BOT_TOKEN` is unset, up to 3 retry attempts)

### Paired Design System (`docs/design/`)
All three apps share one semantic CSS variable system (`packages/ui/src/styles/tokens.css`) supporting Light and Dark modes plus a unified Signature Studio reduced-motion choreography system (`--ease-out-expo`, `--ease-in-expo`, `--ease-spring` `cubic-bezier(0.22, 1, 0.36, 1)`): non-blocking `<NavigationProgressView />` hairline progress bar paired with `.ants-route-curtain` masked `clip-path` wipe (`showcase`) / top ambient wash (`workspace`), `useSlidingIndicator` gliding pills & active underlines across navbars/sidebars/tabs/filters, `.ants-hero-enter` / `.ants-clip-reveal` editorial entrances, `.ants-stagger-item` & `<ScrollReveal />` cascading waterfalls, `.ants-card-interactive` tactile elevation, CSS Grid `0fr -> 1fr` `.ants-accordion`, drawer/modal/sheet animations, transient Light ↔ Dark cross-fade, and sticky-safe opacity containment:
- **Light Mode (*The ANTs Academic System*):** [`docs/design/the_ants_academic_system.md`](./docs/design/the_ants_academic_system.md)
- **Dark Mode (*Amber Academic Studio*):** [`docs/design/amber_academic_studio.md`](./docs/design/amber_academic_studio.md)
- **Brand Mascot (Milo · `<AntMascot />` & `<MiloCompanionDock />`):** [`docs/design/mascot.md`](./docs/design/mascot.md) (with canonical visual reference sheets in `docs/design/assets/mascot-hero-sheet.jpg` and `docs/design/assets/mascot-expressions-grid.jpg`, implemented as a shared animated SVG component `variant="full" | "avatar"` with periodic eye-blinks + `ANT_MASCOT_PRESETS` + unified borderless draggable edge-snapping `<MiloCompanionDock />` across desktop & mobile with tap sparkle/heart bursts, `emitMiloCheer` achievement triggers, and `<NotFoundView />` in `@ants/ui` across Org, Study, Flow, Grade Calculator, Auth, Telegram alerts, and branded `not-found.tsx` routes; visible scrollbars hidden globally in `tokens.css` while preserving native scroll).
- **Cross-App Theme Synchronization:** Pre-hydration scripts and `@ants/ui` `ThemeToggle` persist user Light/Dark preference via a shared `ants_theme` cookie (`Domain=.the-ants.org` in production; host-wide across `localhost` ports) plus `ants-theme` `localStorage` and open-tab `focus`/`visibilitychange`/`pageshow` sync, defaulting strictly to `'light'`.

---

## 4. Authentication, Roles & Guest Access Rules

### Multi-Role Permission System
Accounts store `role` (primary text) and `roles` (JSON string array in D1, e.g. `["student", "tutor"]`). Users receive the **union of permissions** across all assigned roles.

| Role | Who | Capabilities |
| :--- | :--- | :--- |
| **`student`** | Default on every signup | Full access to `Study` (Topic Tracker, Past Papers, Countdown, Notes, Flashcards, Quizzes, Leaderboard) and `Flow` (Timetable, Tasks, Pomodoro, Reminders). |
| **`tutor` / `teacher`** | Verified educators | `student` access + Tutor showcase profile on `the-ants.org/team` (Sun–Sat weekly schedule, hourly rate, subjects, Telegram inquiry prefill & QR). |
| **`contributor`** | Curriculum/content authors | `student` access + exam/grade-boundary/content submission proposals (`review_queue`). |
| **`main_contributor`** | Senior reviewers | `contributor` access + review queue approval/rejection & contributor team oversight. |
| **`admin`** | Platform owners (Thorin) | Full platform management: direct role assignment/revocation, user management, exam data studio, and **Organization Admin CMS (`the-ants.org/admin`)**. |

### Strict Guest (No-Login) vs. Authenticated Access Matrix

| App & Route / Feature | Guest (Logged Out) | Authenticated User |
| :--- | :--- | :--- |
| `the-ants.org` (Home, About, Activities, Articles, Team/Tutors) | **100% Public Showcase** (no user login UI in public navbar) | Same (+ `/admin` CMS if `admin` / `main_contributor`) |
| **`the-ants.org/calculator` & `study.the-ants.org/calculator` (Grade Calculator)** | **100% Usable Without Login** (`<GradeCalculatorContainer />` fetches live D1 boundaries via `GET /api/calculator/catalog`; clicking Save prompts `Sign in on Study`) | Same + authenticated `POST`/`GET`/`DELETE /api/calculator/snapshots` backed by D1 `grade_entries` |
| **`flow.the-ants.org/pomodoro` (Pomodoro Timer)** | **100% Usable Without Login** (persists timer & preferences in `localStorage`) | Syncs settings (`pomodoro_user_settings`), logs `pomodoro_sessions` to D1, awards XP |
| `flow.the-ants.org/login`, `/signup` & `study.the-ants.org/login`, `/signup` | Shared SSO sign-in / sign-up views (`<AuthStudioView />` + `<AuthShowcaseVideoView />` + `<AuthFormView />`, setting `.the-ants.org` / `localhost` `ants_sso_session` cookie + `ants-auth-session-v1` synced across both `Flow` and `Study`) | Redirects to workspace (honoring sanitized `?redirect=`) |
| `flow.the-ants.org` (`/`, `/timetable`, `/tasks`, `/settings`) | Prototype preview banner (`<WorkspaceAuthGateView variant="banner" />`) on `/timetable` & `/tasks`; Login Gate (`variant="gate"`) on `/settings` | Full read/write persisted in D1 + Telegram cron reminders |
| `study.the-ants.org` (`/`, `/curriculum/**`, `/past-papers`, `/countdown`, `/notes/**`, `/flashcards/**`, `/quizzes/**`, `/leaderboard`, `/settings`) | Login gate (`<WorkspaceAuthGateView variant="gate" />` with Sign In, Create Account, Demo Persona, and guest `/calculator` & `/pomodoro` links) | Full read/write persisted in D1 |

---

## 5. App-by-App Detailed Feature Specifications

### App 1: `the-ants.org` (`apps/org`) — Organization Showcase + `/calculator`

1. **Home Showcase (`/`)**:
   - Organization hero, mission statement, impact numbers, **"Our Products & Public Tools"** distraction-free widescreen 4-chapter video showcase (`<OrgProductsVideoView />` covering **Study** at `study.the-ants.org`, **Flow** at `flow.the-ants.org`, **Guest Grade Calculator** at `/calculator`, and **Telegram QR & Bot** `@TheANTsFlowBot` / `/team` with top scene indicator, play/pause toggle, and integrated 4-segment timeline scrubber), featured Tutors & Founders, and community activity highlights.
2. **Activities & Initiatives (`/activities`, `/activities/[slug]`; `/hackathon` redirects to `/activities`)**:
   - **Peer & Expert Tutoring**, **Student's Meetups**, **Exam Venue Visits**, and **Hackathon** recaps (curated overview, dates, venue, concise 4-phase schedule summary, external registration/site links like `https://edtechhackathon.dev/`, and R2 documentary photo galleries — without duplicating full hackathon rubric/agenda/FAQ/crew walls).
3. **Articles & Written Content (`/articles`, `/articles/[slug]`)**:
   - Study guides, organization announcements, and essays written by ANTs contributors and founders.
4. **Team, Tutors & Contributors Showcase (`/team`, `/team/[username]`)**:
   - Filterable by **Founders**, **Tutors**, **Contributors**, and **Alumni**.
   - **Tutor Showcase & Availability Drawer:** Institution, specialization, hourly rate, taught curriculums & subjects, interactive **Sun–Sat Weekly Availability Grid** (`Available` emerald · `Flexible` amber · `Taken/Busy` muted), and **1-Click Telegram Inquiry** (prefilled link + mobile QR code).
5. **Preserved Grade Calculator Route (`/calculator`)**:
   - Mounts `<GradeCalculatorContainer />` from `@ants/calculator` (powered by `@ants/calculator/engine` + live D1 `/api/calculator/catalog`) so `https://the-ants.org/calculator` remains live and guest-accessible while routing authenticated snapshot saves via cross-subdomain SSO.
6. **Organization Content Studio Prototype (`/cms`) & Admin CMS (`/admin`)**:
   - **UI Prototype (`/cms`, `[ZYY-2.5]`):** Restricted strictly to the contributor hierarchy (`contributor`, `main_contributor`, `admin`) via shared SSO session check (`ants_sso_session` / `ants-auth-session-v1`). Unauthorized visitors and guests are gated with a branded Stitch "Contributor Access Required" card offering 1-click Sign In (`/login?redirect=/cms`), 1-click contributor persona switchers (`Zay Lynn Htet` / `Thaw Ye Zaw`), and a dev simulation toggle (`simulatedAccess`). The public footer link (`CMS Studio`) is conditionally displayed only when signed in with an authorized contributor role. Features pure `'use client'` 4-section editorial studio (`Home Page`, `Team & Tutors` with Sun–Sat slot painter, `Activities & Hackathon` with client-side image upload dropzones `<CmsImageDropzone />` for Cover Photos and batch multi-photo galleries auto-scaled to 1280px WebP/JPEG Data URLs, and `Articles` with structured section/callout/code/checklist editor), JSON backup Export/Import, and live `localStorage` (`ants-org-cms-v1`) sync across all showcase routes.
   - **Production Admin CMS (`/admin`, `[THAW-2.3]`):** Protected strictly for `admin` (`Thaw Ye Zaw`). Stored natively in D1 + R2 images: manage Mission, Activities (including Hackathon entries), Markdown Articles, Team/Tutors/Founders, and User Roles.

---

### App 2: `flow.the-ants.org` (`apps/flow`) — "Flow" *(Productivity App)*

1. **Smart Timetable (`/timetable` / `/` workspace):**
   - **Full-Width Canvas & Compact Controls:** 100% full-width timetable grid (`TodayFocusRailView` merged into `/tasks`), compact two-row toolbar with Demo Presets (`24h Workday`, `IAL Scholar`) tucked into a popover menu, unified Zoom/Density strip (`Fit`, `28px–140px/hr` slider, `Ctrl/Cmd+Wheel`, `+`/`-`/`0` keyboard shortcuts in Week/Day; `Compact | Comfortable | Detailed` density modes in Month), and `00–06` / `Exams` toggles.
   - **Week View (Default):** Interactive 24-hour time-blocking grid with sticky day headers, daily focus totals, `00–06` grouped overnight sleep summary (automatically folding morning sleep blocks without peeking past `06:00`), side-by-side concurrent overlap columns (`layoutOverlappingBlocks`), pointer drag-to-create on empty slots, 15-minute pointer drag to move/resize, recurring rules (`none`, `daily`, `weekdays`, `weekly`), category colors, live current-time hairline, Telegram bell badges, and one-click `/pomodoro?task=...&pomodoros=...` launch triggers.
   - **Day View:** Zoomable full-width proportional 24-hour timeline matching Week View (drag-to-create, move, resize, side-by-side overlap columns, `00–06` grouped overnight sleep bar, day blocks/focus/open-time overview, completion checkboxes, exact Telegram ping times).
   - **Month View:** 42-cell monthly overview with active days & monthly focus hours summary, 3 density modes (`Compact` color-dot summary, `Comfortable`, `Detailed` with timestamps), synced `Study` exam milestone badges, reminder counts, and click-through to the day's timeline.
   - **Modals & Offline Guest Persistence:** Interactive `<BlockEditorModalView />` and `<TelegramReminderModalView />` (previewing `@TheANTsFlowBot` 5-minute Worker Cron trigger offsets) backed by `localStorage` (`ants-flow-timetable-v1`) and offline PWA precaching (`/sw.js`).
2. **Unified Tasks (`/tasks`):**
   - **TickTick-Inspired Single-Column Workspace (`<TaskPlannerView />` + `<TaskCardView />`):** Clean 3-tab navigation (**Timetable | Tasks | Pomodoro**) with a single-column layout (`max-w-3xl`), quiet header stat (`X left · Yh blocked`), tucked Search / Filter & Sort / Demo Presets popovers, gliding `Today | Inbox | Upcoming | Done` tabs, and a 1-line Quick Add bar supporting `!P1`–`!P4`, `#tag`, `@today` / `@tomorrow` / `@backlog`, and `~2p` / `~15m`.
   - **Compact Single-Line Expandable Rows:** Priority-colored completion checkboxes, quiet due/scheduled slot pill, hover Pomodoro `Play` / `Schedule` / `Delete` icons, and click-to-expand inline details (notes, priority cycle, Today pin, duration, `#tag` filter chips, and inline subtask checklists).
   - **True 2-Way Timetable Sync (`lib/tasks/engine.ts`):** `mergeTimetableIntoTasks` automatically surfaces actionable Timetable blocks (`study`, `deep-work`, `work`, `health`, `family`, `reading`) while skipping `sleep`, `meal`, `commute`, and `buffer`; completing or rescheduling linked tasks updates `ants-flow-timetable-v1` via `syncTaskCompletionToTimetable` & `<BlockEditorModalView />`.
3. **Pomodoro Timer (`/pomodoro` + Mini-Timer) — *GUEST-ACCESSIBLE*:**
   - **Friction-Free 1-Screen Architecture & Precision Dial:** Slim responsive `<FlowShellView />` navigation bar paired with a single-screen desktop/landscape 2-column layout (`grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]` within `max-w-6xl` shell) constrained to viewport height (`lg:h-[calc(100dvh-11.5rem)]`) with zero window-level page scrolling, tactile dial click-to-toggle start/pause, and an optional corner mini-timer positioned clear of mobile bottom navigation when viewing `Stats` while a timer runs.
   - **Instant Duration Presets & Running Extensions:** Zero-modal quick duration pills (`15m`, `25m`, `50m`, `90m` for Work; `3m`, `5m`, `10m` for Short Break; `15m`, `20m`, `30m` for Long Break) when idle, plus live `+5m` / `+10m` / `-5m` extension chips while running to extend focus flow without restarting.
   - **Precision Chronograph & Ambient Atmosphere:** Mechanical clock dial (`<TimerRingView />`) with 60 chapter ticks, 1-second escapement needle, cycle count indicators, Web Audio mechanical tick-tock audio with 1-click canvas toggle, offline ambient soundscapes (`rain`, `fireplace`, `forest`, `cafe`, `brown-noise`) with 1-click quick cycle, and 1-click Focus mode `[F]`.
   - **Minimal-Step Task Integration (`<TaskListView />`):** Dedicated right-column card with 1-click "Focus Now" on any task row, shorthand estimate parsing (e.g. `Essay review ~2`), and `Ctrl+Enter` instant Add & Focus.
   - **Statistics & Fullscreen Studio:** Daily (7d) and Weekly (8w) productivity charts, 3 key summary metrics (`Today`, `This week`, `Streak`), recent session log (`<PomodoroStatsView />`), full settings modal (appearance, sounds, scenes, shortcuts), and distraction-free `<FocusModeView />` with tab-switch counter.
   - Works without login via `localStorage` (`ants-flow-pomodoro-v1`); when logged in (`[THAW-3.1]`), syncs settings (`pomodoro_user_settings`) and logs `pomodoro_sessions` to D1.
4. **Reminders & Exam Countdown Sync:**
   - **Telegram Reminders:** Per-event/task reminders enqueued in D1 `notification_queue` and dispatched every 5 minutes by `apps/api` Worker Cron.
   - **Synced Exam Countdowns:** Optional **"Show Exams"** toggle pulls the user's `exam_countdowns` from `study.the-ants.org` onto the `Flow` calendar grid.
5. **Auth & Account Settings (`/login`, `/signup`, `/settings`, `/@[username]`):**
   - Shared `.the-ants.org` SSO login & registration (`<AuthStudioView />` + `<AuthFormView />` with 1-click Demo Personas, Google/GitHub OAuth prototype triggers, live `@username` validation, Primary Focus Track selector, and Password Strength Meter; paired with `<WorkspaceAuthGateView />` Guest/Login Gate rules) plus shared `@ants/ui` account modules mounted in `Flow` (`apps/flow/src/app/{login,signup,settings,[handle]}/page.tsx`) and `Study` (`apps/study/src/app/{login,signup,settings}/page.tsx`):
   - **Account & Profile Editor (`<AccountSettingsView />`):** Editable ANTs `@username` (`/@[username]`, key-relocated cleanly via `renameAccountStorageProfile`) kept separate from Telegram `@username` and optional tutor booking handle, plus display identity, curriculum track, timezone, portfolio highlights composer, academic certifications list, multi-role capability badges, preferred workspace landing selector (`Flow` vs. `Study`), section visibility toggles (`showStatsStreak`, `showPortfolioProjects`, `showCertifications`, `showTutorSchedule`, `showTelegramInquiry`), live completeness score, and local persona switcher (`@zaylynnhtet`, `@thawyezaw`, `@minkhant`).
   - **Interactive Tutor Slot-Painter (`<TutorSlotPainterView />`):** Click-and-drag rectangular painter across `Sun–Sat × 08:00–21:00` (`Available`, `Flexible`, `Erase`), schedule presets (`Balanced`, `Evenings`, `Weekends`, `Clear all`), keyboard arrow/Enter navigation, and `24H` / `12H` toggle; switches cleanly to interactive student inquiry selection (`preview` mode) on `/@[username]`.
   - **Telegram Connect Card (`<TelegramConnectCardView />`):** Unlinked by default (`status: 'unlinked'`, `telegramConnected: false`) across all personas and Flow presets/panels/modals until explicitly verified in onboarding or `/settings#telegram`; immediately generates a one-time `/start ANT-XXXX` code, `t.me/TheANTsFlowBot?start=...` deep link, webhook handle capture (with optional test override) & test-ping preview, delivery lead-time buttons (`5m` / `10m` / `15m` / `30m`), granular channel switches (`blockReminders`, `dailyMorningDigest`, `examCountdownAlerts`, `tutorInquiryAlerts`), backed by `localStorage` (`ants-account-profile-v1`) synced bidirectionally into `ants-flow-timetable-v1`.
   - **Public Profile Showcase (`<UserProfileView />` at `/@[username]`):** Multi-role badge header, single primary Telegram inquiry CTA, unified 4-metric telemetry ledger strip, interactive Tutoring Availability schedule, categorized Portfolio Projects, Verified Certifications, member switcher rail, and unknown-handle suggestions fallback.

---

### App 3: `study.the-ants.org` (`apps/study`) — "Study" *(IGCSE & IAL Tracker)*

1. **Supported Exam Boards & Subject Type System:**
   - **Cambridge IGCSE**, **Cambridge International AS & A Level**, **Pearson Edexcel International GCSE**, and **Pearson Edexcel International Advanced Level (IAL)**.
   - Supports `fixed_linear`, `modular_sciences`, and **`modular_maths_suite` (`WMA11-SET`)** with 14 units (`WMA11`–`WMA14`, `WFM01`–`03`, `WME01`–`03`, `WST01`–`03`, `WDM11`), 4 cash-in awards (`XMA01`, `YMA01`, `XFM01`, `YFM01`), and `CHOOSE_N_FROM_SET | EXACT_COMBINATION_PAIRS | AT_LEAST_ONE_OF` rules.
2. **Topic Tracker (`/curriculum`, `/curriculum/[subjectId]?tab=topics`, `/curriculum/[curriculumId]/[subjectId]?tab=topics`):**
   - Interactive syllabus breakdown with dual Kanji-Style Topic Mastery Matrix + Syllabus Topic Accordion, subtopic checklists, confidence/completion tracking (`not_started` | `in_progress` | `mastered` with `+10 XP` on mastery), difficulty tags (`foundation` | `standard` | `stretch`), unit-code filtering for modular subjects (including `"My Cash-In Units Only"` for `WMA11-SET`), and slide-over personal topic notes & examiner formulas drawer with Flow Pomodoro handoff.
3. **Past Paper Tracker (`/past-papers` & `?tab=papers`):**
   - Top **Enrolled Overview** telemetry bar + instant subject switcher paired with an Excel-style Paper/Variant × chronological Exam Series matrix (`MJ 25`–`ON 23`) and scannable 2-column Card view (`Best Score` vs. `Latest Sit` mode toggle).
   - Supports Cambridge regional variants (`V1`/`V2`/`V3` with `Feb/Mar` `N/A` zone handling), Edexcel IGCSE `Standard` / `Regional (R)`, and modular IAL units (`WMA11-SET` `"My Cash-In Units Only"` filter), plus live SVG chronological score trajectory sparkline.
   - Interactive `<PaperScoreModalView />` calculates Grade (`A*`–`U` / `9`–`1`) and piecewise UMS/PUM live against historical series cutoffs (`paper_grade_boundaries` / `subject_grade_boundaries`), captures Timed vs. Untimed conditions, weak-topic tags, and post-paper reflections, awards `+25 XP` (first sit) / `+15 XP` (personal best) synced to the Study Dashboard, and persists guest attempts in `localStorage` (`ants-study-papers-v1`).
4. **Grade Calculator (`/calculator`) — *GUEST-ACCESSIBLE*:**
   - Mounts shared `<GradeCalculatorContainer />` (`@ants/calculator` + `@ants/calculator/engine`) inside `StudyCalculatorContainer` (and `apps/org`) with clean, student-friendly board labels (`Grades A*–U`, `Grades A*–G`, `Grades 9–1`), Milo grade-reactive spotlights & milestone progress bars (`<MiloGradeSpotlight />`, `<GradeTierProgressBar />`), serving live 2022–2026 D1 boundaries across all **50 requested subjects** (`49` catalog entries across CAIE IGCSE 12, Edexcel IGCSE 14, CAIE Int'l AS & A-Level 12, and Edexcel IAL 11 entries combining Maths & Further Maths into the 14-unit suite):
     - **Standard Subjects (3-Step Flow: `1 · Board & Subject` → `2 · Syllabus & Mode` → `3 · Marks & Grade`):** Modular Edexcel IAL subjects with official D1 boundaries default to **Direct UMS** with a 1-click **Raw Marks** toggle; `edexcel-ial-cs` (lacking official D1 raw boundaries) enforces **Direct UMS** exclusively (`400 DIRECT_UMS_ONLY` in API); Edexcel IGCSE supports both **Raw Marks** (default) and optional **Direct UMS (9–1)** (`buildEdexcelIgcseUmsBoundaries`); Cambridge boards support Raw Marks cleanly without PUM clutter. Whenever UMS mode is active, UI links to Pearson's official Raw-to-UMS converter (`PEARSON_UMS_CONVERTER_URL`).
     - **Edexcel IAL Maths & Further Maths (Direct 2-Step Jump into Unified 14-Unit Workspace):** Selecting Mathematics & Further Mathematics skips Step 2 and opens `<EdexcelMathsSuiteView />` directly with all 14 units (`P1–P4`, `FP1–FP3`, `M1–M3`, `S1–S3`, `D1`) visible at once in 2-column category grids, compact quick-track chips, simultaneous Pearson non-overlapping allocation (`XMA01`/`YMA01` + `XFM01`/`YFM01`), and Jan/May-June-only enforcement on Further Maths / `M3` / `S3` / `D1` (`on-*` excluded in D1, API, & UI).
     - Authenticated `grade_entries` snapshot history/persistence (`GET`/`POST`/`DELETE /api/calculator/snapshots`, storing `'direct-ums'` series markers for UMS-entered snapshots).
5. **Exam Countdown (`/countdown`):**
   - Auto-populated from enrolled subjects + custom/mock exams (`<CustomExamModalView />` with `is_custom`, `is_mock`, session time, `is_pinned`, target grade, color tag, live `JetBrains Mono` `DDd HHh MMm SSs` countdowns, Flow Pomodoro launch, and `ants-study-countdowns-v1` + `ants-study-dashboard-v1` persistence). Syncs automatically into `flow.the-ants.org`.
6. **Study Resources & Gamification (`/notes`, `/flashcards`, `/quizzes`, `/leaderboard`, `/studio`):**
   - **Study Notes (`/notes`, `[ZYY-4.6]`):** Library sidebar + safe AST Markdown reader/split/live editor with formula code blocks, examiner tips, interactive checklists, and cross-links to decks/quizzes (`ants-study-learning-v1`).
   - **Flashcards (`/flashcards`, `[ZYY-4.6]`):** Interactive 3D flip SM-2 spaced-repetition decks (`Again`/`Hard`/`Good`/`Easy` interval previews, `Space`/`1–4` shortcuts, Cram All mode, custom card & deck modals) earning `+3 XP`/card + `+15 XP` deck clear.
   - **Quizzes (`/quizzes`, `[ZYY-4.6]`):** Untimed Practice & Timed Exam topical quizzes supporting MCQ (`1–4` keys) and tolerance-aware numeric/formula short answers, step-by-step mark-scheme explanations, `Retry Mistakes`, and Flow Pomodoro handoff (`+20 XP`/`+25 XP`).
   - **Leaderboard (`/leaderboard`, `[ZYY-4.5]`):** `<StudyLeaderboardView />` (`Weekly Sprint` / `All-Time XP`, Top-3 Scholar Podium, board filters, live Dashboard/Papers/Learning XP merge, opt-in Private Study Mode in `ants-study-leaderboard-v1`, Milestone Badges shelf) + upcoming Contributor/Admin Exam Data Studio (`/studio`).
7. **Auth & Student/Tutor Settings (`/login`, `/signup`, `/settings`, `/@[username]`):**
   - Shared `.the-ants.org` SSO login, student/tutor/contributor profile editor, and Telegram Bot linking.

---

## 6. Cloudflare D1 Database Schema Blueprint (`packages/db/src/schema/`)

1. **`auth.ts`:** Better Auth core tables (`user`, `session`, `account`, `verification`).
2. **`profiles.ts`:** `profiles`, `student_profiles`, `tutor_profiles`, `contributor_profiles`, `certifications`, `role_upgrade_requests`.
3. **`organization.ts`:** `org_settings`, `org_team_members`, `org_activities`, `org_articles`.
4. **`curriculums.ts`:** `curriculums`, `subjects` (`subject_type`, `qualification_data`), `topics`, `user_curriculums`, `topic_progress`.
5. **`study_tools.ts`:** `exams`, `exam_schedules`, `exam_countdowns`, `user_enrollments`, `user_exam_overrides`, `user_exam_history`, `subject_component_routes`, `user_cash_in_enrollments`, `user_component_selections`, `past_papers`, `subject_grade_boundaries`, `paper_grade_boundaries`, `user_past_paper_records`, `grade_entries`, `exam_data_audit_log`, `user_xp_ledger`, `user_badges`, `user_streaks`.
6. **`learning.ts`:** `study_notes`, `flashcard_decks`, `flashcards`, `flashcard_reviews`, `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_live_sessions`.
7. **`planner.ts`:** `timetable_events`, `tasks`, `pomodoro_user_settings`, `pomodoro_sessions`.
8. **`system.ts`:** `notifications`, `notification_queue`, `notification_preferences`, `review_queue`, `version_history`, `activity_feed`.

- **Registry, Relations & Migrations:** `helpers.ts` (`nowIso`, `isoTimestamps`, `booleanFlag`), `relations.ts`, `createDb(d1)` in `packages/db/src/index.ts`, `packages/db/drizzle.config.ts`, initial 55-table D1 SQL migration (`0000_romantic_marvex.sql`), initial catalog seed (`0001_seed_calculator_catalog.sql`), full 50-subject 2022–2026 calculator catalog migration (`0002_seed_full_calculator_catalog.sql`: 4 `curriculums`, 49 `subjects`, 180 `past_papers`, 1,475 `subject_grade_boundaries`, 3,779 `paper_grade_boundaries`), Edexcel IAL Further Maths Oct/Nov removal (`0003_remove_ial_fm_oct_nov.sql`: removes the 8 `on-*` rows for `XFM01`/`YFM01`), and clean board label update (`0004_clean_calculator_board_labels.sql`) in `packages/db/migrations/` (wired to `apps/api/wrangler.jsonc` via `migrations_dir`).
