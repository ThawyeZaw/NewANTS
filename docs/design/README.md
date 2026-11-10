# Stitch Design System — The ANTs Ecosystem

Canonical UI token and component design specifications for **The ANTs** (`the-ants.org`), **Scholar** (`scholar.the-ants.org`), and **Flow** (`flow.the-ants.org`).

Light and dark themes form **one paired semantic token system** mapped into `packages/ui/src/styles/tokens.css` and consumed across all three Next.js 16 applications.

| Theme | Aesthetic | Specification |
| :--- | :--- | :--- |
| **Light** | Modern Editorial Academic (`#f8fafc` Slate canvas, `#d97706` Amber 600 primary) | [`the_ants_academic_system.md`](./the_ants_academic_system.md) |
| **Dark** | Amber Academic Studio (`#0B0C0E` / `#121316` Obsidian canvas, `#F59E0B` Amber 500 primary) | [`amber_academic_studio.md`](./amber_academic_studio.md) |

## Non-Negotiable Token Rules
1. **Semantic classes only:** Components must use semantic Tailwind v4 tokens (`bg-background`, `bg-surface-card`, `border-border`, `text-foreground`, `text-foreground-muted`, `bg-primary`, `text-on-primary`, etc.) rather than hardcoded hex values so Light and Dark modes switch cleanly.
2. **Typography:**
   - **UI & Editorial Copy:** `Plus Jakarta Sans`
   - **Timers, Syllabus Codes, Scores, Durations & Metrics:** `JetBrains Mono` (`font-mono tabular-nums`)
3. **Icons:** `lucide-react` exclusively.
4. **Endorsement Styling:** Standalone product headers display **Scholar** and **Flow** cleanly with a subtle *"by The ANTs"* badge linking to `https://the-ants.org`.

