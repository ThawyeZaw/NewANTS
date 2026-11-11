---
name: Flow by The ANTs
description: Dual-theme academic productivity studio pairing Stitch Slate Light and Obsidian Amber Dark tokens across Timetable, Tasks, Pomodoro, and Account views.
colors:
  light-background: "#f8fafc"
  light-surface-card: "#ffffff"
  light-surface-inset: "#f1f5f9"
  light-foreground: "#0f172a"
  light-foreground-muted: "#475569"
  light-border: "#e2e8f0"
  light-primary: "#d97706"
  light-primary-solid: "#b45309"
  light-primary-tint: "#fef3c7"
  light-on-primary-tint: "#92400e"
  light-success: "#059669"
  light-success-tint: "#ecfdf5"
  light-on-success-tint: "#065f46"
  light-destructive: "#e11d48"
  dark-background: "#0b0c0e"
  dark-surface-card: "#18191e"
  dark-surface-inset: "#121316"
  dark-foreground: "#e3e2e6"
  dark-foreground-muted: "#d8c3ad"
  dark-primary: "#f59e0b"
  dark-primary-hover: "#ffc174"
  dark-on-primary: "#0b0c0e"
  dark-on-primary-tint: "#fde68a"
  dark-success: "#10b981"
  dark-on-success-tint: "#6ee7b7"
  dark-destructive: "#f43f5e"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label-mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    fontFeature: "\"tnum\""
rounded:
  control: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.light-primary-solid}"
    textColor: "{colors.light-surface-card}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.light-surface-card}"
    textColor: "{colors.light-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  card-default:
    backgroundColor: "{colors.light-surface-card}"
    textColor: "{colors.light-foreground}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.light-surface-card}"
    textColor: "{colors.light-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
---

# Design System: Flow by The ANTs

## Overview

**Creative North Star: "The Editorial Obsidian & Amber Sanctuary"**

Flow translates The ANTs' paired Stitch aesthetic (*The ANTs Academic System* in Light mode and *Amber Academic Studio* in Dark mode) into an `Operate` workspace built for high-frequency planning, deep Pomodoro execution, weekly tutoring availability painting, and public member portfolios. Surfaces prioritize calm scannability over chrome: crisp cool-slate sheets (`#f8fafc` / `#ffffff`) hold daytime study clarity, while warm obsidian surfaces (`#0b0c0e` / `#18191e`) pair with amber accents (`#f59e0b`) for late-night revision sessions without glare.

User-selectable accent presets (`amber`, `ocean`, `forest`, `rose`, `violet`) override `--primary`, `--primary-hover`, `--primary-tint`, and `--on-primary-tint` via `[data-accent]` attributes while automatically preserving `--primary-solid` accessible contrast on solid fills.

**Key Characteristics:**
- Paired semantic CSS custom properties toggled explicitly via `data-theme="light" | "dark"` so theme switching works deterministically across components without OS media-query lock-in.
- Tactile, direct-manipulation surfaces (15-minute Timetable dragging, `P1`–`P4` completion rings, `Sun–Sat` availability brush painting) built with standard accessible HTML/ARIA controls.
- Strict flat hierarchy: outer section cards own `1px` structural borders, while internal lists, telemetry strips, and switch tables use hairline horizontal/vertical dividers (`border-subtle`) or flat inset wells rather than nested card boxes.

## Colors

Semantic palette split across Light (*Editorial Academic*) and Dark (*Amber Studio*) surfaces, reserving vibrant accent fills strictly for primary actions, selected brushes, and verified states.

### Primary
- **Scholar Amber Fill (`--primary-solid`)**: Light `#b45309` with `#ffffff` ink (`>=5.0:1` contrast across small and medium buttons); Dark `#f59e0b` with `#0b0c0e` ink (`~9.5:1`). Used for active section tabs, primary CTAs, avatar badges, and checked switches.
- **Amber Accent (`--primary`)**: Light `#d97706`, Dark `#f59e0b`. Used for focus borders, progress bars, inline brand highlights, and focus rings (`rgba(217,119,6,0.18)` Light / `rgba(245,158,11,0.45)` Dark).
- **Amber Tint Well (`--primary-tint` / `--on-primary-tint`)**: Light `#fef3c7` with `#92400e` ink; Dark `rgba(245,158,11,0.12)` with `#fde68a` ink. Used for `Flexible` tutor slots, category badges, and non-competing secondary inquiry actions.

### Secondary
- **Verified Emerald (`--success` / `--success-tint` / `--on-success-tint`)**: Light `#059669` / `#ecfdf5` / `#065f46`; Dark `#10b981` / `rgba(16,185,129,0.14)` / `#6ee7b7`. Reserved strictly for `Available` tutoring cells, linked Telegram channels, and verified academic credentials.

### Tertiary
- **Urgency Rose (`--destructive` / `--destructive-tint` / `--on-destructive-tint`)**: Light `#e11d48` / `#fff1f2` / `#9f1239`; Dark `#f43f5e` / `rgba(244,63,94,0.14)` / `#fda4af`. Reserved strictly for `P1` urgency markers, exam countdown deadlines, and destructive remove actions.

### Neutral
- **Ground & Card Surfaces**: Light `#f8fafc` ground / `#ffffff` card / `#f1f5f9` inset; Dark `#0b0c0e` obsidian ground / `#18191e` card / `#121316` inset.
- **Ink & Structural Rules**: Light `#0f172a` ink / `#475569` secondary ink / `#e2e8f0` hairline borders; Dark `#e3e2e6` ink / `#d8c3ad` warm sand secondary ink / `rgba(255,255,255,0.08)` borders.

### Named Rules
- **The Solid-Fill Contrast Rule.** Never render white `12px` button text directly on `#d97706` or fade disabled primary buttons with raw opacity; use `--primary-solid` (`#b45309` Light / `#f59e0b` Dark) when enabled and neutral inset surface (`--surface-inset` + `--foreground-muted`) when disabled.
- **The One Primary Action Rule.** Limit each route viewport to a single solid `--primary-solid` CTA for a given intent so companion links or grid actions degrade cleanly to `--primary-tint` chips or outlined controls.

## Typography

**Display & Body Font:** `Plus Jakarta Sans` (with system `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif` fallback; user-selectable to `Inter` or `Lora` via `[data-font]` in Flow Appearance Settings)
**Label / Data Font:** `JetBrains Mono` (`font-mono tabular-nums`, reserved strictly for clock hours, countdowns, syllabus/voucher codes, handles, XP/streak metrics, and day/date stamps)

**Character:** Crisp geometric sans-serif headings with balanced line-wrapping paired with tabular monospace instrumentation for scannable academic metrics.

### Hierarchy
- **Display / Page Header** (`700`, `20px–24px`, `line-height: 1.2`, `-0.02em`): Workspace headings (`Account & Profile Settings`, `/@[username]` member name).
- **Card Title** (`600`, `16px`, `line-height: 1.35`, `-0.01em`): Card section headings across settings editors, slot grids, and portfolio blocks.
- **Body & Form Labels** (`400–600`, `12px–14px`, `line-height: 1.5–1.6`): Prose descriptions (capped at readable width), bio text, switch explanations, and form inputs.
- **Monospace Instrumentation** (`500–700`, `10px–18px`, `tabular-nums`): Slot timestamps (`08:00`, `12:00 PM`), `/start ANT-XXXX` tokens, `@username` handles, XP counters, and countdowns.

### Named Rules
- **The Prose-Never-Mono Rule.** Apply `JetBrains Mono` strictly to clock times, codes, handles, and numeric measurements—never to UI tips, role labels, relative update prose (`Updated 3d ago`), or input placeholders.

## Layout

Split workspace shell (`FlowShellView`) anchored by a sticky 56px top navigation bar (`Timetable`, `Tasks`, `Pomodoro`, ThemeToggle, `/settings` shortcut, 9-dot `AppSwitcher`, `UserMenuView`), collapsing workspace links into a secondary row under `<768px`.

- **Split Desk Composition (`/tasks`, `/timetable`, `/settings`, `/@[username]`):** Main column (`minmax(0, 1fr)`) paired with a sticky right rail (`320px` on profiles, `340px` on tasks/settings at `>=1280px` `xl:`), collapsing cleanly to a single full-width stack below `1280px` with zero horizontal page overflow at `390px`.
- **Responsive Grids:** Interactive `Sun–Sat × 08:00–21:00` availability grid fits all 7 weekdays side-by-side even on `390px` viewports using a `54px` (`68px` `>=640px`) single-line hour gutter and `32px` (`36px` `>=640px`) cells.

## Elevation & Depth

Surfaces rely primarily on sharp `1px` contrast borders (`--border`) and subtle ground-to-card luminance separation (`#f8fafc` -> `#ffffff` Light, `#0b0c0e` -> `#18191e` Dark) with restrained shadow tiers:

- **Tier 1 (`--shadow-tier-1`):** `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)` (Light) / `0 2px 8px rgba(0, 0, 0, 0.35)` (Dark) — standard cards, active segmented buttons.
- **Tier 2 (`--shadow-tier-2`):** Interactive/elevated hover lift and Obsidian subtle amber edge illumination (`rgba(245, 158, 11, 0.12)`).
- **Tier 3 (`--shadow-tier-3`):** Modals and dropdown menus (`UserMenuView`, `AppSwitcher`, `BlockEditorModalView`).

## Shapes

Controlled geometric corners scaling consistently with hierarchy:
- **Pills (`9999px`):** Status badges, role tags, `UserMenuView` trigger pill, switch tracks.
- **Containers (`12px`):** Outer `Card` containers, telemetry ledger strips, grouped segmented bars.
- **Controls (`8px` / `6px`):** Primary/Secondary buttons (`8px`), compact small buttons and painted availability slots (`6px`), standard text inputs and selects (`8px`).

## Components

### Buttons
- **Primary:** `--primary-solid` fill (`#b45309` Light, `#f59e0b` Dark), `#ffffff` / `#0b0c0e` label, `8px` (`md`) or `6px` (`sm`) radius, active press scale (`0.98`), subtle shadow.
- **Disabled State:** Neutral `--surface-inset` background, `--border` outline, and `--foreground-muted` text (`opacity: 1`) for unambiguous disabled clarity.
- **Outline / Secondary / Ghost:** Semantic `--border` outlines or subtle inset hover fills without heavy tint glare.

### Cards & Lists
- Outer `Card` encloses `--surface-card` with `1px solid var(--border)` and `12px` radius; `CardHeader` stacks `action` badges below descriptions on `<640px` so mobile descriptions keep full width.
- Internal item lists (portfolio rows, certifications, preference toggles, visibility rows, persona switchers) divide with `1px solid var(--border-subtle)` horizontal rules—never bordered sub-cards inside a card.

### Inputs & Switches
- Inputs sit cleanly on `--surface-card` with `1px` `--border`, crisp placeholder contrast (`--foreground-muted`, `>=4.5:1`), and amber focus outline (`--primary`) + translucent halo (`--ring`).
- Toggle switches expose `role="switch"` with accessible keyboard focus ring and distinct `--primary` checked state.

### Tutor Slot-Painter & Telegram Handshake
- `TutorSlotPainterView` uses `pointerdown` baseline snapshotting + `pointermove` `document.elementFromPoint` hit-testing + `touch-none` inside a flat inset well (`--surface-inset`) for `Sun–Sat × 08:00–21:00` drag painting, paired with preset pills and `24H`/`12H` toggle.
- `TelegramConnectCardView` presents three progressive flat inset states (`unlinked` -> `pending` `/start ANT-XXXX` -> `connected` test-ping preview) above divided notification switches and lead-time selectors (`5m`–`30m`).

## Do's and Don'ts

### Do:
- **Do** validate button and placeholder contrast independently under both `Light` and `Dark` themes (and all five `[data-accent]` presets).
- **Do** use flat horizontal/vertical dividers (`border-subtle`) or flat tint/inset bands (`--surface-inset`) inside `Card` sections.
- **Do** use `lucide-react` stroke icons (`12px–16px`) for remove (`<X />`), status, and action glyphs.

### Don't:
- **Don't** nest bordered `surface-card` containers inside parent `Card` blocks or render 4 isolated icon+number KPI boxes where one hairline-divided telemetry strip serves cleanly.
- **Don't** apply Tailwind `dark:` utilities inside tokens/components without `@custom-variant dark` — always consume CSS custom properties from `packages/ui/src/styles/tokens.css`.
- **Don't** import `@ants/db`, `next/*` (inside `@ants/ui`), or server actions inside pure presentational `*View.tsx` components.

