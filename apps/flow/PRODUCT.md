# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary users:** Students (including Cambridge IGCSE & Pearson Edexcel IAL candidates) and working professionals or independent makers who manage fixed daily commitments alongside self-directed deep work, revision, workouts, and family routines.
- **Core situation:** Users switching between deep-focus execution (Pomodoro intervals) and macro daily/weekly scheduling need one coherent space that keeps priorities, 24-hour time blocks, transition buffers, and reminders aligned without heavy setup.

## Product Purpose

**Flow** *(by The ANTs)* (`flow.the-ants.org`) is a cross-device productivity studio that unifies a 24-hour Smart Timetable, P1–P4 Task Planner, Pomodoro Focus Studio, Telegram Reminders, and synced Exam Countdowns from Study (`study.the-ants.org`). Success means a visitor can open Flow immediately as a guest to time-block their day and launch linked focus sessions, and seamlessly persist schedules, tasks, and reminder triggers when signed in.

## Positioning

Unlike disconnected timers or generic enterprise calendars, Flow pairs an instant guest-accessible Focus Studio directly with a 24-hour time-blocking timetable, exam countdown awareness from Study, and 5-minute Cloudflare Cron Telegram reminder triggers under one shared `.the-ants.org` account.

## Operating Context

- **Guest-first browser workflow:** Immediate interactive use backed by `localStorage` (`ants-flow-pomodoro-v1` and timetable state) and offline PWA caching (`/sw.js`, `/manifest.webmanifest`).
- **Authenticated ecosystem workflow:** Cross-subdomain Better Auth SSO (`.the-ants.org`) syncing user preferences, timetable events, tasks, Pomodoro logs, `exam_countdowns` read-sync from Study, and `notification_queue` Telegram Bot dispatches via `@ants/api`.
- **UI-Prototype-First separation:** Presentational views (`*View.tsx`) run purely on typed props and realistic mock fixtures so backend containers (`*Container.tsx`) can wire Cloudflare D1/Hono data cleanly.

## Capabilities and Constraints

- **Implemented (`[ZYY-3.1]`):** Slim workspace shell, Pomodoro Timer (`/pomodoro` and `/`) with Focus/Short Break/Long Break cycles, customizable durations, linked task list, daily/weekly stats, Web Audio cues and ambient soundscapes, atmospheric Focus Mode, keyboard shortcuts, and PWA offline support.
- **Implemented (`[ZYY-3.2]`):** Task Planner & Today Focus (`/tasks`) with TickTick-style P1–P4 priority badges, inline subtasks checklist, project/status/tag/priority filters, quick-add bar, due dates, and Flow Pomodoro handoff.
- **Implemented (`[ZYY-3.3]`):** Smart Timetable Views (`/timetable`) featuring a Week 24-hour time-blocking grid (default), Day timeline view, Month calendar view, Today P1–P4 focus rail, Study Exam Countdown chips, Telegram Reminder toggle modal, interactive drag/resize/quick-add, and one-click handoff into `/pomodoro`.
- **Implemented (`[ZYY-3.4]`):** Shared Account/Telegram Settings (`/settings`), Unified SSO Auth (`/login`, `/signup`, Guest Prototype Banner + Settings Login Gate), and Public Member Portfolio (`/ @[username]` via `/[handle]`), featuring structured academic identity & portfolio highlights/certifications, multi-role section visibility controls, an interactive Sun–Sat × 08:00–21:00 Tutor slot-painter (`Available` / `Flexible` / `Erase`, presets, `12h`/`24h` toggle, live inquiry preview), and `@TheANTsFlowBot` `/start ANT-XXXX` verification with granular delivery lead times (`5m`/`10m`/`15m`/`30m`) synced to `ants-sso-session`, `ants-account-profile-v1`, and `ants-flow-timetable-v1`.
- **Architectural constraints:** Pure client `*View.tsx` components (and shared `@ants/ui` views) must never import `@ants/db`, `next/*` inside `@ants/ui`, server actions, or API fetchers. Backend persistence, recurrence expansion API, and live Telegram webhook dispatch remain gated behind Thaw's `[THAW-3.x]` full-stack milestone (prototype uses local interactive state + realistic mock data).

## Brand Commitments

- Product name: **Flow** with *"by The ANTs"* endorsement badge linking to `https://the-ants.org` and shared 9-dot `AppSwitcher` (`The ANTs` · `Flow` · `Study`).
- Shared paired design system (`@ants/ui/styles/tokens.css`, Light + Amber Dark) using `Plus Jakarta Sans` for UI copy, `JetBrains Mono` (`font-mono tabular-nums`) for times, durations, and countdowns, and `lucide-react` icons exclusively.

## Evidence on Hand

- Existing Flow frontend views across Pomodoro (`apps/flow/src/components/pomodoro/views/*`), Tasks (`apps/flow/src/components/tasks/views/*`), Timetable (`apps/flow/src/components/timetable/views/*`), Account/Profile (`apps/flow/src/components/account/views/*` + shared `@ants/ui` account views/lib), and `FlowShellView.tsx`, covered by Vitest unit tests (`apps/flow/src/__tests__/*.test.ts` and `packages/ui/src/__tests__/account.test.ts`).
- Authoritative specification in `spec.md` and design specs in `docs/design/the_ants_academic_system.md` and `docs/design/amber_academic_studio.md`.
- Note: Live D1 persistence and live Telegram Bot API dispatch are not yet wired in this frontend prototype (`[THAW-3.3]` pending); Telegram reminder toggles and Study exam countdown chips represent verified UI contracts backed by realistic synthetic demonstration fixtures.

## Product Principles

1. **Zero-friction entry:** Every core productivity tool works interactively for guests on first load without forcing account creation.
2. **Schedule to focus in one click:** Time blocks and priority tasks connect directly to the Pomodoro timer so planning flows straight into execution.
3. **Calm precision over clutter:** Show hours, durations, transition buffers, and priorities clearly without visual noise or manipulative gamification.
4. **Prototypes stay contract-pure:** Presentational views expose explicit `*ViewProps` and callbacks with realistic defaults so full-stack wiring never requires rewriting UI markup.

## Accessibility & Inclusion

- Keyboard-navigable controls, visible focus rings (`focus-visible:ring-2 focus-visible:ring-ring`), WCAG contrast compliance across both Light and Amber Dark themes, and accessible ARIA roles for tabs, grids, dialogs, and switches.

