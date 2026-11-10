---
name: askmefirst
description: >-
  Clarify requirements and intent via interactive pop-up modals before writing or modifying code.
  Activate whenever the user types /askmefirst or asks to clarify requirements in modals before implementing.
---

# Ask Me First (`/askmefirst`)

Enforces a strict **Clarify Before Implementing** workflow using interactive pop-up modals (`ask_question` tool).

## Mandatory Protocol

1. **Read Context Silently First:**
   - Read [`AGENTS.md`](../../../AGENTS.md), [`progress.md`](../../../progress.md), and the relevant section of [`spec.md`](../../../spec.md) (plus [`docs/design/README.md`](../../../docs/design/README.md) if the task touches UI).
   - Inspect any directly referenced files in the workspace to ground your questions in real project state.

2. **Zero Premature Implementation:**
   - **DO NOT** create, edit, scaffold, or delete any implementation code while clarifying.

3. **Ask High-Signal Questions in Pop-Up Modals (`ask_question`):**
   - Call the `ask_question` tool to present clear, concise multiple-choice questions in pop-up modals.
   - Cover ambiguities across **user intent, UX/interaction details, edge cases, data/auth rules, and component scope**.
   - Always place a sensible recommended choice first, prefixed with `(Recommended)`.
   - Keep questions focused (typically 3–6 sharp questions; ask a brief follow-up modal if an answer opens a sub-decision).

4. **Confirm & Execute Cleanly:**
   - Once the user answers the modal(s), briefly confirm the agreed component scope and proceed (unless the user asked to stop after planning).
   - Follow all verification and end-of-session documentation update rules in [`AGENTS.md`](../../../AGENTS.md) (`progress.md`, `spec.md`, `AGENTS.md`).

