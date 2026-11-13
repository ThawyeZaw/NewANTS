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
- **Backend API:** **Hono** on **Cloudflare Workers** (`apps/api`)
- **Database & ORM:** **Cloudflare D1 (SQLite)** + **Drizzle ORM** (`packages/db`), bound directly as `env.DB` to Workers
- **Shared Validation:** **Zod** schemas & TypeScript contracts (`packages/shared-types`)
- **Authentication:** **Better Auth** + Drizzle SQLite adapter on `api.the-ants.org` with `crossSubDomainCookies` enabled on `.the-ants.org` (`localhost` in development)
- **Object Storage:** Private **Cloudflare R2** bucket `the-ants-assets` served via `/api/storage/file/...`
- **Background Jobs & Messaging:** **Cloudflare Worker Cron** (`*/5 * * * *`) draining D1 `notification_queue` to the **Telegram Bot API**

### Paired Design System (`docs/design/`)
All three apps share one semantic CSS variable system (`packages/ui/src/styles/tokens.css`) supporting Light and Dark modes plus a unified Signature Studio reduced-motion choreography system (`--ease-out-expo`, `--ease-in-expo`, `--ease-spring` `cubic-bezier(0.22, 1, 0.36, 1)`): non-blocking `<NavigationProgressView />` hairline progress bar paired with `.ants-route-curtain` masked `clip-path` wipe (`showcase`) / top ambient wash (`workspace`), `useSlidingIndicator` gliding pills & active underlines across navbars/sidebars/tabs/filters, `.ants-hero-enter` / `.ants-clip-reveal` editorial entrances, `.ants-stagger-item` & `<ScrollReveal />` cascading waterfalls, `.ants-card-interactive` tactile elevation, CSS Grid `0fr -> 1fr` `.ants-accordion`, drawer/modal/sheet animations, transient Light ↔ Dark cross-fade, and sticky-safe opacity containment:
- **Light Mode (*The ANTs Academic System*):** [`docs/design/the_ants_academic_system.md`](./docs/design/the_ants_academic_system.md)
- **Dark Mode (*Amber Academic Studio*):** [`docs/design/amber_academic_studio.md`](./docs/design/amber_academic_studio.md)
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
| **`the-ants.org/calculator` & `study.the-ants.org/calculator` (Grade Calculator)** | **100% Usable Without Login** (`@ants/calculator` fetches public syllabus/boundary rules) | Same + optional save to `grade_entries` inside `Study` |
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
   - Mounts `<GradeCalculatorView />` from `@ants/calculator` so `https://the-ants.org/calculator` remains live and guest-accessible.
6. **Organization Content Studio Prototype (`/cms`) & Admin CMS (`/admin`)**:
   - **UI Prototype (`/cms`, `[ZYY-2.5]`):** Restricted strictly to the contributor hierarchy (`contributor`, `main_contributor`, `admin`) via shared SSO session check (`ants_sso_session` / `ants-auth-session-v1`). Unauthorized visitors and guests are gated with a branded Stitch "Contributor Access Required" card offering 1-click Sign In (`/login?redirect=/cms`), 1-click contributor persona switchers (`Zay Lynn Htet` / `Thaw Ye Zaw`), and a dev simulation toggle (`simulatedAccess`). The public footer link (`CMS Studio`) is conditionally displayed only when signed in with an authorized contributor role. Features pure `'use client'` 4-section editorial studio (`Home Page`, `Team & Tutors` with Sun–Sat slot painter, `Activities & Hackathon` with client-side image upload dropzones `<CmsImageDropzone />` for Cover Photos and batch multi-photo galleries auto-scaled to 1280px WebP/JPEG Data URLs, and `Articles` with structured section/callout/code/checklist editor), JSON backup Export/Import, and live `localStorage` (`ants-org-cms-v1`) sync across all showcase routes.
   - **Production Admin CMS (`/admin`, `[THAW-2.3]`):** Protected strictly for `admin` (`Thaw Ye Zaw`). Stored natively in D1 + R2 images: manage Mission, Activities (including Hackathon entries), Markdown Articles, Team/Tutors/Founders, and User Roles.

---

### App 2: `flow.the-ants.org` (`apps/flow`) — "Flow" *(Productivity App)*

1. **Smart Timetable (`/timetable` / `/` workspace):**
   - **Week View (Default):** Interactive 24-hour time-blocking grid (`00–06 Grouped` overnight sleep summary bar collapsed by default or `00–24h Expanded`)—15-minute pointer drag to reschedule across days/times, bottom-edge drag to resize duration, click empty slots to quick-add, recurring rules (`none`, `daily`, `weekdays`, `weekly`), category colors, live current-time hairline, Telegram bell badges, and one-click `/pomodoro?task=...&pomodoros=...` launch triggers.
   - **Day View:** Chronological 24-hour timeline paired with grouped overnight sleep summary, exact Telegram ping times, completion checkboxes, and inline transition buffers.
   - **Month View:** 42-cell monthly overview with synced `Study` exam milestone badges, focus hours, reminder counts, and click-through to the day's timeline.
   - **Today Focus Side Panel (`<TodayFocusRailView />`):** Sticky 24h Focus Budget (`Deep & Reading`, `Commitments`, `Gym & Meals`, `Buffers`, `Sleep`, `Pomodoros`), `P1`–`P4` priority task quick-add & filters, one-click open-slot scheduling, and deep-link Pomodoro launch (gated on focus-eligible tasks).
   - **Modals & Offline Guest Persistence:** Interactive `<BlockEditorModalView />` and `<TelegramReminderModalView />` (previewing `@TheANTsFlowBot` 5-minute Worker Cron trigger offsets) backed by `localStorage` (`ants-flow-timetable-v1`) and offline PWA precaching (`/sw.js`).
2. **Task Planner (`/tasks`):**
   - TickTick-style `P1` (`Urgent` rose) – `P4` (`Low` muted) task cards (`<TaskCardView />`) with semantic priority completion rings, clickable priority cycling, Today Focus pin stars, metadata badges, and clickable `#tag` filter chips.
   - **Functional Inline Subtasks Checklists:** Expandable checklist region directly inside each task card with step toggle checkboxes, completion percentage bar, inline add (`+ Step`), and per-step deletion.
   - **Multi-Stage Filtering & Deterministic Priority Sorting (`lib/tasks/engine.ts`):** Smart-list tabs (`All`, `Today`, `Upcoming`, `P1–P2`, `Done`), `ALL`/`P1`–`P4` filter pills, union multi-tag filter strip sorted by open task count, search matching across titles/notes/tags/subtasks, and deterministic comparators (`priority` `P1`→`P4` with Today Focus + earliest-due tie-breakers, `due-date`, `duration`, `recent`).
   - **Rapid Quick-Add Bar:** Supports manual selectors plus inline shorthand tokens (`!P1`–`!P4`, `#tag`, `@today` / `@tomorrow` / `@backlog`, `~2p` / `~15m`) with live parsed preview before submit.
   - **Sticky Today Focus Sprint HUD (`<TodayFocusPanelView />`) & Mobile Bottom Sheet:** Docked cleanly on `lg:`+ viewports (`1024px+`) with a 52×52 SVG radial completion ring, conversational completion/remaining/P1 summary, highlighted **"Up next"** Spotlight Card (1-click **Start Focus** → Pomodoro handoff + **Block** scheduling button + checkbox/unpin, deduplicated from queue below), `P1`–`P4` filter, quick pin-add bar, collapsible Timetable & Telegram status footer, 1-click `<BlockEditorModalView />` scheduling onto `ants-flow-timetable-v1`, offline guest persistence (`ants-flow-tasks-v1` synced bidirectionally with `ants-flow-timetable-v1`, `/sw.js` `v4`), and a `< 1024px` header `Today` pill + floating mini-ring pill opening a slide-over `role="dialog"` sheet alongside collapsible mobile quick-add metadata and search filters.
3. **Pomodoro Timer (`/pomodoro` + Mini-Timer) — *GUEST-ACCESSIBLE*:**
   - Slim responsive `<FlowShellView />` navigation bar (centered `Timetable | Tasks | Pomodoro` workspace switcher on `md:`+ with symmetrical `xl:` grid and a thumb-zone sticky **Mobile Bottom Dock** on `< md:` phones) paired with a calm page-local underline `Timer | Stats` tab switcher inside `/pomodoro`, a centered single-column layout on `Timer`, and an optional corner mini-timer positioned clear of mobile bottom navigation when viewing `Stats` while a timer runs.
   - Focus (default 25m) / Short Break (default 5m) / Long Break (default 15m, every 4 focus sessions) intervals with crisp animated SVG circular progress ring (`<TimerRingView />`) and `JetBrains Mono` countdown display.
   - Linked task list (`<TaskListView />`) directly below the timer with session estimate +/- steppers, completion toggles, and estimated finish wall-clock calculation.
   - Offline-ready Web Audio API synthesized interval transition tones (`bell`, `chime`, `digital`, `soft`, `none`), tactile start/pause cues, and continuous ambient focus soundscapes (`rain`, `fireplace`, `forest`, `cafe`, `brown-noise`) with independent volume controls and browser/Service Worker notifications.
   - Atmospheric Focus Scenes (`rainy-study`, `quiet-library`, `misty-forest`, `warm-fireplace`, precached offline in `/sw.js`) selectable via the `Atmosphere` settings tab or directly inside `<FocusModeView />`, with contrast-safe scrims on both the main Timer view and fullscreen Focus Mode.
   - Daily (7d) and Weekly (8w) productivity charts, 3 key summary metrics (`Today`, `This week`, `Streak`), and recent session log (`<PomodoroStatsView />`).
   - Appearance customization in Settings (`Light` / `Dark` / `System` mode, `Amber` / `Ocean` / `Forest` / `Rose` / `Violet` accents, `Plus Jakarta Sans` / `Inter` / `Lora` fonts), keyboard shortcuts (`Space`, `R`, `S`, `1`–`3`, `F`, `N`, `T`, `,`, `?`, `Esc`), fullscreen distraction-free `<FocusModeView />` with tab-switch counter and `beforeunload` guard, and PWA installability (`/manifest.webmanifest` + `/sw.js`).
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
   - Mounts shared `@ants/calculator` package (identical to `the-ants.org/calculator`), plus signed-in ability to save grade snapshots to `grade_entries`.
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
