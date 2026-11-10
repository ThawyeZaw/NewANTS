# The ANTs Ecosystem (`NewANTS`)

100% Cloudflare HONC monorepo powering:
- **`the-ants.org`** (`apps/org`) — Organization Showcase + `/calculator` + `/admin` CMS
- **`flow.the-ants.org`** (`apps/flow`) — Sleek Productivity App (Timetable, Task Planner, Reminders, Pomodoro Timer)
- **`study.the-ants.org`** (`apps/study`) — IGCSE & IAL Study Hub (Topic Tracker, Past Paper Tracker, Exam Countdown, `/calculator`)
- **`api.the-ants.org`** (`apps/api`) — Shared Hono Worker (Better Auth `.the-ants.org` SSO, Cloudflare D1, Private R2, 5-min Telegram Cron)

## Key Governance & Dual-Developer Docs (Read First)
- [`AGENTS.md`](./AGENTS.md) — Shared rules, file ownership locks, verification gates, and mandatory end-of-session updates.
- [`AGENTS.thaw.md`](./AGENTS.thaw.md) — **Thaw Ye Zaw (Thorin)**: Main Full-Stack Developer & Platform Admin (`[THAW]` track).
- [`AGENTS.zyy.md`](./AGENTS.zyy.md) — **Zyy Linn Htet**: Front-End Prototype & UI Polishing Lead (`[ZYY]` track).
- [`spec.md`](./spec.md) — Authoritative system specification, feature requirements, auth/guest matrix, and D1 database blueprint.
- [`progress.md`](./progress.md) — Dual-track (`[ZYY]` & `[THAW]`) component build tracker and session history log.
- [`docs/design/README.md`](./docs/design/README.md) — Paired Stitch Academic Design System (Light + Amber Dark).

## Custom Agent Slash Commands
- `/continue` — Picks up, builds, tests, and verifies the single next queued component for `[THAW]` or `[ZYY]` in `progress.md`.
- `/askmefirst` — Clarifies requirements via interactive pop-up modals before writing any code.
