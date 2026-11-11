# The ANTs Ecosystem — System Specification & Feature Manifest (`spec.md`)

> **Authoritative Single Source of Truth.**  
> Built from scratch one verified component at a time by **Thaw Ye Zaw (Thorin — Main Full-Stack & Admin)** and **Zyy Linn Htet (Front-End Prototypes & UI Polishing)**.  
> Whenever a feature contract, route, or database schema detail is refined during a session, AI agents **must** keep this document synchronized.

---

## 1. Vision & Multi-App Ecosystem Architecture

Following the team's architectural decisions, **The ANTs** is structured into **3 specialized frontend web apps** + **1 shared Hono API Worker** inside a single Cloudflare HONC monorepo:

| Product | Domain (Prod / Local) | Monorepo App | UI Branding | Target Audience | Core Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. The ANTs (Showcase)** | `https://the-ants.org` (`localhost:3000`) | `apps/org` (`@ants/org`) | **The ANTs** | General public, students, tutors, event attendees, sponsors | **100% Pure Organization Showcase:** Mission, Founders & Members, Tutors & weekly availability, Activities (Tutoring, Student's Meet, Exam Venue Visit), Articles, Hackathon Showcase (external link), `/admin` CMS, **+ preserved `/calculator` route** (zero user login/student profiles on `the-ants.org`). |
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

## 2. Dual-Developer Workflow (Thaw Ye Zaw × Zyy Linn Htet)

| Developer | Role | Workflow Responsibility |
| :--- | :--- | :--- |
| **Zyy Linn Htet** (`AGENTS.zyy.md`) | **Front-End & UI Polishing Lead** | **Builds UI Prototypes First (`ui/*` branches):** Designs and polishes `@ants/ui` primitives, `apps/org` showcase pages, and pure presentational `*View.tsx` components in `apps/flow`, `apps/study`, and `packages/calculator` backed by realistic `mocks/*.mock.ts` data (zero DB/API imports). |
| **Thaw Ye Zaw / Thorin** (`AGENTS.thaw.md`) | **Main Full-Stack Developer & Platform Admin** | **Builds Foundation, Backend & Full-Stack Wiring (`feat/*` branches):** Owns `@ants/db` (D1), `apps/api` (Hono, Better Auth, R2, Cron), `@ants/shared-types`, `@ants/auth-client`, calculation/UMS engines, Server Actions, hooks, Admin CMS, and `*Container.tsx` components that pass live data into Zyy's `*View.tsx` prototypes. |

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
All three apps share one semantic CSS variable system (`packages/ui/src/styles/tokens.css`) supporting Light and Dark modes:
- **Light Mode (*The ANTs Academic System*):** [`docs/design/the_ants_academic_system.md`](./docs/design/the_ants_academic_system.md)
- **Dark Mode (*Amber Academic Studio*):** [`docs/design/amber_academic_studio.md`](./docs/design/amber_academic_studio.md)

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
| `the-ants.org` (Home, About, Activities, Articles, Team/Tutors, Hackathon Showcase) | **100% Public Showcase** (no user login UI in public navbar) | Same (+ `/admin` CMS if `admin` / `main_contributor`) |
| **`the-ants.org/calculator` & `study.the-ants.org/calculator` (Grade Calculator)** | **100% Usable Without Login** (`@ants/calculator` fetches public syllabus/boundary rules) | Same + optional save to `grade_entries` inside `Study` |
| **`flow.the-ants.org/pomodoro` (Pomodoro Timer)** | **100% Usable Without Login** (persists timer & preferences in `localStorage`) | Syncs settings (`pomodoro_user_settings`), logs `pomodoro_sessions` to D1, awards XP |
| `flow.the-ants.org/login`, `/signup` & `study.the-ants.org/login`, `/signup` | Shared SSO sign-in / sign-up views (sets `.the-ants.org` cookie for both `Flow` and `Study`) | Redirects to workspace |
| `flow.the-ants.org` (`/`, `/timetable`, `/tasks`, `/settings`) | Prototype preview or login gate | Full read/write persisted in D1 + Telegram cron reminders |
| `study.the-ants.org` (`/`, `/curriculum/**`, `/past-papers`, `/countdown`, `/notes/**`, `/flashcards/**`, `/quizzes/**`, `/leaderboard`, `/settings`) | Login gate | Full read/write persisted in D1 |

---

## 5. App-by-App Detailed Feature Specifications

### App 1: `the-ants.org` (`apps/org`) — Organization Showcase + `/calculator`

1. **Home Showcase (`/`)**:
   - Organization hero, mission statement, impact numbers, **"Our Products"** showcase cards (**Flow** at `flow.the-ants.org` & **Study** at `study.the-ants.org`), featured Tutors & Founders, and community activity highlights.
2. **Activities & Initiatives (`/activities`, `/activities/[slug]`)**:
   - **Peer & Expert Tutoring**, **Student's Meetups**, **Exam Venue Visits**, and community workshops with R2 photo galleries, dates, locations, and recaps.
3. **Hackathon Showcase (`/hackathon` + Homepage spotlight)**:
   - Showcase page/banner highlighting the hackathon led by The ANTs with an **external CTA button** linking to the standalone hackathon website.
4. **Articles & Written Content (`/articles`, `/articles/[slug]`)**:
   - Study guides, organization announcements, and essays written by ANTs contributors and founders.
5. **Team, Tutors & Contributors Showcase (`/team`, `/team/[username]`)**:
   - Filterable by **Founders**, **Tutors**, **Contributors**, and **Alumni**.
   - **Tutor Showcase & Availability Drawer:** Institution, specialization, hourly rate, taught curriculums & subjects, interactive **Sun–Sat Weekly Availability Grid** (`Available` emerald · `Flexible` amber · `Taken/Busy` muted), and **1-Click Telegram Inquiry** (prefilled link + mobile QR code).
6. **Preserved Grade Calculator Route (`/calculator`)**:
   - Mounts `<GradeCalculatorView />` from `@ants/calculator` so `https://the-ants.org/calculator` remains live and guest-accessible.
7. **Organization Admin CMS (`/admin`)**:
   - Protected strictly for `admin` (`Thaw Ye Zaw`). Stored natively in D1 + R2 images: manage Mission/Hackathon showcase, Activities, Markdown Articles, Team/Tutors/Founders, and User Roles.

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
   - **Sticky Today Focus Panel (`<TodayFocusPanelView />`) & Cross-Flow Bridge:** Displays daily execution progress bar, remaining time & Pomodoro totals, `P1`–`P4` filter, quick pin-add bar, 1-click `<BlockEditorModalView />` scheduling onto `ants-flow-timetable-v1`, `/pomodoro?task=...&pomodoros=...` handoff on Pomodoro-eligible tasks, Telegram ping status footer, and offline guest persistence (`ants-flow-tasks-v1` synced bidirectionally with `ants-flow-timetable-v1`, `/sw.js` `v4`).
3. **Pomodoro Timer (`/pomodoro` + Mini-Timer) — *GUEST-ACCESSIBLE*:**
   - Slim top-bar workspace (`Timer` / `Stats` tabs, Settings, `AppSwitcher`, `UserMenuView`) with a centered single-column layout on `Timer` and an optional corner mini-timer when viewing `Stats` while a timer runs.
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
   - Shared `.the-ants.org` SSO login (`<AuthFormView />`) plus shared `@ants/ui` account modules mounted in `Flow` (`apps/flow/src/app/settings/page.tsx`, `apps/flow/src/app/[handle]/page.tsx`) and reusable in `Study` (`[THAW-3.4]` / `[THAW-4.x]`):
   - **Account & Profile Editor (`<AccountSettingsView />`):** Editable ANTs `@username` (`/@[username]`, key-relocated cleanly via `renameAccountStorageProfile`) kept separate from Telegram `@username` and optional tutor booking handle, plus display identity, curriculum track, timezone, portfolio highlights composer, academic certifications list, multi-role capability badges, preferred workspace landing selector (`Flow` vs. `Study`), section visibility toggles (`showStatsStreak`, `showPortfolioProjects`, `showCertifications`, `showTutorSchedule`, `showTelegramInquiry`), live completeness score, and local persona switcher (`@zyylinnhtet`, `@thawyezaw`, `@minkhant`).
   - **Interactive Tutor Slot-Painter (`<TutorSlotPainterView />`):** Click-and-drag rectangular painter across `Sun–Sat × 08:00–21:00` (`Available`, `Flexible`, `Erase`), schedule presets (`Balanced`, `Evenings`, `Weekends`, `Clear all`), keyboard arrow/Enter navigation, and `24H` / `12H` toggle; switches cleanly to interactive student inquiry selection (`preview` mode) on `/@[username]`.
   - **Telegram Connect Card (`<TelegramConnectCardView />`):** Unlinked by default (`status: 'unlinked'`, `telegramConnected: false`) across all personas and Flow presets/panels/modals until explicitly verified in onboarding or `/settings#telegram`; immediately generates a one-time `/start ANT-XXXX` code, `t.me/TheANTsFlowBot?start=...` deep link, webhook handle capture (with optional test override) & test-ping preview, delivery lead-time buttons (`5m` / `10m` / `15m` / `30m`), granular channel switches (`blockReminders`, `dailyMorningDigest`, `examCountdownAlerts`, `tutorInquiryAlerts`), backed by `localStorage` (`ants-account-profile-v1`) synced bidirectionally into `ants-flow-timetable-v1`.
   - **Public Profile Showcase (`<UserProfileView />` at `/@[username]`):** Multi-role badge header, single primary Telegram inquiry CTA, unified 4-metric telemetry ledger strip, interactive Tutoring Availability schedule, categorized Portfolio Projects, Verified Certifications, member switcher rail, and unknown-handle suggestions fallback.

---

### App 3: `study.the-ants.org` (`apps/study`) — "Study" *(IGCSE & IAL Tracker)*

1. **Supported Exam Boards & Subject Type System:**
   - **Cambridge IGCSE**, **Cambridge International AS & A Level**, **Pearson Edexcel International GCSE**, and **Pearson Edexcel International Advanced Level (IAL)**.
   - Supports `fixed_linear`, `modular_sciences`, and **`modular_maths_suite` (`WMA11-SET`)** with 14 units (`WMA11`–`WMA14`, `WFM01`–`03`, `WME01`–`03`, `WST01`–`03`, `WDM11`), 4 cash-in awards (`XMA01`, `YMA01`, `XFM01`, `YFM01`), and `CHOOSE_N_FROM_SET | EXACT_COMBINATION_PAIRS | AT_LEAST_ONE_OF` rules.
2. **Topic Tracker (`/curriculum`, `/curriculum/[curriculumId]/[subjectId]?tab=topics`):**
   - Interactive syllabus breakdown, subtopic checklists, confidence/completion tracking (`not_started` | `in_progress` | `mastered`), difficulty tags, unit-code filtering for modular subjects, and personal topic notes.
3. **Past Paper Tracker (`/past-papers` & `?tab=papers`):**
   - Cross-subject and per-subject Excel-style variant × exam series matrix + card view, instant raw mark → grade / UMS calculation (`paper_grade_boundaries` & `subject_grade_boundaries`), score trends, and XP rewards.
4. **Grade Calculator (`/calculator`) — *GUEST-ACCESSIBLE*:**
   - Mounts shared `@ants/calculator` package (identical to `the-ants.org/calculator`), plus signed-in ability to save grade snapshots to `grade_entries`.
5. **Exam Countdown (`/countdown`):**
   - Auto-populated from enrolled subjects + custom/mock exams (`is_custom`, `is_mock`, `is_pinned`, target grade, color tag). Syncs automatically into `flow.the-ants.org`.
6. **Study Resources & Gamification (`/notes`, `/flashcards`, `/quizzes`, `/leaderboard`, `/studio`):**
   - Native D1 study notes, spaced-repetition flashcards, topical quizzes, XP/streak leaderboard, and Contributor/Admin Exam Data Studio.
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
