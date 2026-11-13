---
name: continue
description: >-
  Resume incremental development of The ANTs ecosystem by building, testing, and verifying the single next component in progress.md for either Thaw (Full-Stack) or Zay (UI Prototypes).
  Activate whenever the user types /continue or asks to pick up the next queued task from progress.md.
---

# Continue Incremental Build (`/continue`)

Executes the strict **one-component-at-a-time** AI development loop for The ANTs monorepo across our dual-developer tracks (**Thaw Ye Zaw** & **Zay Lynn Htet**).

## Step-by-Step Runbook

1. **Identify Active Developer Track & Load Memory:**
   - Read [`AGENTS.md`](../../../AGENTS.md) and [`progress.md`](../../../progress.md).
   - Determine whether this session is for **`[THAW]`** (Full-Stack / Backend / Admin — read [`AGENTS.thaw.md`](../../../AGENTS.thaw.md)) or **`[ZYY]`** (UI Prototypes & Polishing — read [`AGENTS.zyy.md`](../../../AGENTS.zyy.md)) based on the user's prompt or current Git branch (`feat/*` vs `ui/*`). If ambiguous, ask via `ask_question` modal.
   - Locate the **single next `[ ]` item** for that developer under `## Next Up` in [`progress.md`](../../../progress.md).
   - Read the corresponding feature/schema section in [`spec.md`](../../../spec.md) and [`docs/design/README.md`](../../../docs/design/README.md).

2. **Scope Discipline (One Component Only):**
   - Work **strictly on the single next component/task** in your track (`[THAW]` or `[ZYY]`).
   - Never touch files locked to the other developer (see [`AGENTS.md`](../../../AGENTS.md)).
   - If there is any design, behavior, or requirement ambiguity for this component, **stop and call `ask_question` (pop-up modal)** to clarify before writing code.

3. **Implement Cleanly:**
   - **If `[ZYY]` (UI Prototype):** Build pure presentational `*View.tsx` components + `mocks/*.mock.ts` with Stitch Light/Dark semantic tokens (`Plus Jakarta Sans` + `JetBrains Mono`, `lucide-react` icons) and component tests.
   - **If `[THAW]` (Full-Stack):** Build D1 schema, Hono API, Server Actions, engines, or Smart Containers (`*Container.tsx`) wiring real data into `*View.tsx`, plus Vitest unit/API tests.

4. **Run the Strict Verification Gate:**
   - Execute `pnpm typecheck`
   - Execute `pnpm lint`
   - Execute `pnpm test`
   - Start/check the relevant local dev server (`pnpm dev:org`, `pnpm dev:study`, `pnpm dev:flow`, or `pnpm dev:api`) to confirm zero runtime/startup crashes.

5. **Request Manual Sign-Off & Update Session Docs:**
   - Present a concise summary of what was built, automated check results, and exact steps/URLs for manual testing.
   - **Wait for manual approval** before marking `[x]` in `progress.md` (while awaiting sign-off, mark it `[~]`; once approved, mark `[x]` and advance your track's `## Next Up`).
   - **Mandatory End-of-Session Rule:** Update [`progress.md`](../../../progress.md) (your track checklist + Session Log), [`spec.md`](../../../spec.md) (if contracts/routes evolved), and [`AGENTS.md`](../../../AGENTS.md) / role manual (if new patterns were established).
