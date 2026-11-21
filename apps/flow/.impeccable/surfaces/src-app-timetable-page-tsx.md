---
version: 1
slug: "src-app-timetable-page-tsx"
primary_target: "src/app/timetable/page.tsx"
related_targets: ["src/components/timetable/views/SmartTimetableView.tsx","src/components/layout/views/FlowShellView.tsx"]
---

# Surface Brief — Flow Smart Timetable (`/timetable`)

- **Scope & Mode:** `Operate` — `/timetable` (`apps/flow/src/app/timetable/page.tsx`) plus `FlowShellView` top-level `Timetable` / `Pomodoro` navigation and block-to-Pomodoro deep link (`/pomodoro`).
- **Audience & Job:** Students and busy professionals time-blocking a 24-hour day, reconciling fixed commitments with deep work, transition buffers, P1–P4 priorities, synced Study exam countdowns, and Telegram reminders.
- **Constraints:** Preserve the established Flow Stitch Academic Studio design system (`@ants/ui/styles/tokens.css` Light + Amber Dark, `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals, `lucide-react` icons). Pure client `*View.tsx` architecture with exported `*ViewProps` and realistic mock data (`timetable.mock.ts`); no `@ants/db` or server actions. Code-led build path.

## Direction contract

THESIS: Treat a 24-hour day as an architectural time-column instrument—combining fixed blocks, explicit 15-minute transition buffers, P1–P4 priorities, and one-click Pomodoro launches—rather than a cramped generic event grid buried under chrome.

OWN-WORLD: Built strictly inside Flow's Light (*The ANTs Academic System*, Slate `#f8fafc` canvas, crisp `#ffffff` cards, Amber `#d97706` focus) and Dark (*Amber Academic Studio*, Obsidian `#0b0c0e` canvas, `#18191e` elevated surfaces, `#f59e0b` amber signals), using `JetBrains Mono` tabular timestamps, crisp 1px borders without thick left-accent bars, semantic status tints (amber focus, emerald wellness/study, rose urgent/exams, muted transit/sleep/buffers), and subtle current-time rule.

STORY: Opening `/timetable`, the visitor immediately sees their week's 24-hour rhythm, exam countdown chips from Study, and Today's P1–P4 priority rail—able to switch Week/Day/Month views, drag or resize blocks, click any slot to block time, toggle Telegram 5-minute cron reminders, or launch a focus block directly into the `/pomodoro` timer.

FIRST VIEWPORT: Top `FlowShellView` header (Brand badge, `Timetable` / `Pomodoro` mode switcher, `Week` / `Day` / `Month` + scenario preset selector, `AppSwitcher`, `UserMenuView`), followed by an optional compact Study Exam Countdown chip strip (`Show Exams` toggle), then a responsive split workspace: primary left/center interactive 24-hour timetable grid (with sticky day headers, hourly mono ruler, live current-time line, and clickable/draggable time blocks showing Telegram bell & Pomodoro play triggers) alongside a sleek right Today Focus Rail (`P1`–`P4` tasks, daily time budget breakdown, and 1-click "Schedule" / "Start Pomodoro" actions).

FORM: Structured 24-hour timetable column rhythm with persistent block identity across Week/Day/Month views and integrated Today Focus Rail (ranked #1 grounded structure, pinned via user choice); seed:799e37072be2cf56.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
