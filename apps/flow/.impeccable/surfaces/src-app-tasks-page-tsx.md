---
version: 1
slug: "src-app-tasks-page-tsx"
primary_target: "src/app/tasks/page.tsx"
related_targets: ["src/components/tasks/views/TaskPlannerView.tsx","src/components/tasks/views/TodayFocusPanelView.tsx","src/components/tasks/views/TaskCardView.tsx"]
---

# Surface Brief — Flow Task Planner (`/tasks`)

- **Scope & Mode:** `Operate` — `/tasks` (`apps/flow/src/app/tasks/page.tsx`) plus `FlowShellView` top-level `Tasks` link alongside `Timetable` and `Pomodoro`, with live `localStorage` bridge to `/timetable` (`ants-flow-timetable-v1`) and deep link to `/pomodoro`.
- **Audience & Job:** Students and focused makers triaging P1–P4 tasks, decomposing work into subtasks, filtering by subject/life tags, pinpointing Today's Focus queue, and scheduling open tasks directly onto their 24h Timetable or Pomodoro timer.
- **Constraints:** Preserve the established Flow Stitch Academic Studio design system (`@ants/ui/styles/tokens.css` Light + Amber Dark, `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals, `lucide-react` icons). Pure client `*View.tsx` architecture with exported `*ViewProps` and realistic mock presets (`tasks.mock.ts`); no `@ants/db` or server actions. Code-led build path.

## Direction contract

THESIS: Turn `/tasks` into a crisp TickTick-inspired priority planner and Today Focus desk—distinguishing P1–P4 urgency at a glance via semantic completion rings, inline subtask checklists, tag filters, and one-click timetable/Pomodoro handoff—without noisy Kanban clutter or nested card boxes.

OWN-WORLD: Built strictly in Flow's Light (*The ANTs Academic System*, Slate `#f8fafc` ground, `#ffffff` cards, `#d97706` amber focus) and Dark (*Amber Academic Studio*, Obsidian `#0b0c0e` ground, `#18191e` cards, `#f59e0b` amber highlights), using `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals for `P1`–`P4` codes/durations/counts, `lucide-react` icons, and crisp 1px priority-tinted rings and borders (never >1px `border-left` stripes).

STORY: Opening `/tasks`, users see their quick-add entry bar (supporting `!P1`–`!P4`, `#tag`, `@today` shorthand or direct selectors), active tag & smart-list filters, priority-sorted task cards with expandable functional subtasks checklists, and a sticky Today Focus Panel showing daily focus load, pinned Today items, and direct Schedule-to-Timetable or Start-in-Pomodoro actions.

FIRST VIEWPORT: Top `FlowShellView` header (`Timetable` · `Tasks` · `Pomodoro`, `ThemeToggle`, `AppSwitcher`, `UserMenuView`), followed by the Task Planner toolbar (`All` / `Today` / `Upcoming` / `P1–P2` views, search, priority/due sort, `24h Workday` / `IAL Scholar` preset toggle), a responsive split workspace (`minmax(0,1fr)` main planner + `340px` sticky `TodayFocusPanelView`): main column leads with the Quick-Add Bar and interactive Tag Filter strip above priority-sorted TickTick-style task cards; right panel keeps Today's Focus queue, subtask/Pomodoro budget, and Telegram status pinned.

FORM: Split Task Planner + sticky Today Focus Panel inheriting Flow's `/timetable` architectural layout (shaped directly inside Flow's established Stitch design world); seed: none (unavailable).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
