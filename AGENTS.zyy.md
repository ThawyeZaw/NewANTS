# AGENTS.zyy.md — Front-End Prototype & UI Polishing Manual (Zyy Linn Htet)

> Read [`AGENTS.md`](./AGENTS.md) first. This file defines **Zyy Linn Htet's** UI-Prototype-First scope and safety guardrails.

---

## 1. Mission & Role

You are pair-programming with **Zyy Linn Htet**, **Front-End & UI Polishing Lead** of The ANTs ecosystem.
Your workflow is **UI-Prototype-First**: you design, build, and polish interactive, high-craft UI prototypes across `the-ants.org` (Showcase), `flow.the-ants.org` (Productivity App), and `study.the-ants.org` (Study Tracker) using **typed props and realistic mock data**—so **Thaw Ye Zaw** can later wire real Cloudflare D1 / Hono API data into your views without either of you breaking the other's work.

---

## 2. What You Own (`ui/*` Branches)

| Area | Allowed Paths | How to Build |
| :--- | :--- | :--- |
| **Shared Design System & Primitives** | `packages/ui/src/**` | Semantic CSS variables (`tokens.css` Light + Amber Dark), `Button`, `Card`, `Badge`, `Input`, `Modal`, `Tabs`, 9-dot `AppSwitcher`, Navbar/Sidebar shells. |
| **Organization Showcase (`the-ants.org`)** | `apps/org/src/components/**`, `apps/org/src/app/(showcase)/**` | Landing hero, Mission, Founders/Tutors/Members showcase, Tutor weekly schedule view + Telegram QR modal, Activities (Tutoring, Student's Meet, Exam Venue Visit), Articles view, Hackathon Showcase. |
| **Flow Productivity UI Prototypes (`flow.the-ants.org`)** | `apps/flow/src/components/**/views/*View.tsx`, `apps/flow/src/mocks/**` | Sleek TickTick-style Day/Week/Month Timetable grid UI, Task Planner cards/lists, Today Focus panel, **Pomodoro Timer UI**, Reminder badges, Auth & Profile Settings UI views. |
| **Study Tracker UI Prototypes (`study.the-ants.org`)** | `apps/study/src/components/**/views/*View.tsx`, `apps/study/src/mocks/**` | Syllabus **Topic Tracker** checklist UI, Excel-style **Past Paper Matrix** UI, Edexcel Maths Suite unit selector UI, Exam Countdown cards, Notes/Flashcards/Quizzes UI, Auth & Profile Settings UI views. |
| **Shared Grade Calculator UI** | `packages/calculator/src/views/**` | Interactive Grade Calculator layout, sliders, and grade pills mounted on both `the-ants.org/calculator` and `study.the-ants.org/calculator`. |

---

## 3. Strict Guardrails (Paths You Must NEVER Edit)

To guarantee you never break the backend or cause Git merge conflicts with Thaw:
- ❌ **NEVER edit** `packages/db/**`, `apps/api/**`, `packages/auth-client/**`, or `packages/shared-types/**`.
- ❌ **NEVER edit** `**/actions/**`, `**/hooks/**`, `**/*Container.tsx`, or `apps/org/src/app/admin/**`.
- ❌ **NEVER import database clients (`@ants/db`) or server actions** inside `*View.tsx` components.

---

## 4. The "Mock-First Presentational View" Pattern

Every feature UI you build must follow this exact pattern:
1. Create a realistic mock data file in `src/mocks/<feature>.mock.ts`.
2. Build your presentational component in `src/components/<feature>/views/<Feature>View.tsx`:
   - Line 1 must be `'use client';`.
   - Define and export `export interface <Feature>ViewProps { ... }` with all data and event callbacks (`onAddTask?: ...`, `onToggleTopic?: ...`).
   - Default props to your mock data (`data = MOCK_DATA`) so the prototype works 100% interactively in `pnpm dev:org`, `pnpm dev:flow`, or `pnpm dev:study` before any backend exists!
3. Follow [`docs/design/the_ants_academic_system.md`](./docs/design/the_ants_academic_system.md) (Light) and [`docs/design/amber_academic_studio.md`](./docs/design/amber_academic_studio.md) (Amber Dark):
   - Semantic token classes only (no raw hex values in components).
   - **Plus Jakarta Sans** for UI copy; **JetBrains Mono** (`font-mono tabular-nums`) for timers, syllabus codes, scores, and durations.
   - **`lucide-react`** icons only.
4. **End-of-Session Rule:** Always run `pnpm typecheck` & `pnpm lint`, and update the **`[ZYY]`** section in [`progress.md`](./progress.md) at the end of every session.
5. **Verified Push:** Use **`/push`** to automatically verify, fix styling/type errors locally, and push cleanly to your `ui/*` branch.

