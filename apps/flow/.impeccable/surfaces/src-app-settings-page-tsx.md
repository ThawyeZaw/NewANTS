---
version: 1
slug: "src-app-settings-page-tsx"
primary_target: "src/app/settings/page.tsx"
related_targets: ["src/app/[handle]/page.tsx","src/components/account/views/FlowSettingsPageView.tsx","src/components/account/views/FlowProfilePageView.tsx"]
---

# Surface Brief — Shared User Profile & Account/Telegram Settings (`[ZYY-3.4]`)

- **Scope & Mode:** `Operate` — Shared presentational views in `@ants/ui` (`TutorSlotPainterView`, `TelegramConnectCardView`, `AccountSettingsView`, `UserProfileView`) mounted inside `apps/flow` at `/settings` (`apps/flow/src/app/settings/page.tsx`) and `/@[username]` (`apps/flow/src/app/[handle]/page.tsx`), sharing local state via `ants-account-profile-v1` and syncing Telegram linking into `ants-flow-timetable-v1`.
- **Audience & Job:** Students, verified tutors, contributors, and makers configuring their public ANTs portfolio, painting weekly Sun–Sat tutoring hours via drag brush, toggling section visibility, and linking `@TheANTsFlowBot` via `/start` code for 5-minute Cron alerts.
- **Constraints:** Preserve the established Stitch Academic design system (`@ants/ui/styles/tokens.css` Light + Amber Dark, `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals, `lucide-react` icons exclusively, `>=4.5:1` contrast including `text-foreground-muted` placeholders and `text-on-primary-tint` small amber labels). Pure `'use client'` views in `@ants/ui` with zero `next/*` or `@ants/db` imports. Code-led build path.

## Direction contract

THESIS: Unify cross-app identity settings and public academic/tutor showcase (`/settings` and `/@[username]`) inside one restrained two-mode studio—turning weekly availability editing into a direct tactile Sun–Sat brush grid paired with an explicit `/start` Telegram handshake rather than generic toggle lists.

OWN-WORLD: Built strictly in The ANTs paired tokens—Light (*The ANTs Academic System*: `#f8fafc` ground, `#ffffff` cards, `#d97706` amber, `#059669` emerald available state) and Dark (*Amber Academic Studio*: `#0b0c0e` ground, `#18191e` cards, `#f59e0b` amber, `#10b981` emerald available state)—with `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals for hours/handles/codes/streaks, `lucide-react` icons, and crisp 1px borders without kickers, nested cards, or >1px side stripes.

STORY: Opening `/settings`, the user edits identity/portfolio metadata, switches brushes (`Available`, `Flexible`, `Erase`) to click-and-drag across Sun–Sat hour slots with live preview, generates or verifies a `/start ANT-XXXX` Telegram bot connection with per-channel alerts, toggles public visibility, and hops directly to `/@[username]` where visitors inspect portfolio projects, certifications, and bookable tutor hours.

FIRST VIEWPORT: Top `FlowShellView` header (`Timetable` · `Tasks` · `Pomodoro`, `ThemeToggle`, Settings shortcut, `AppSwitcher`, `UserMenuView`), followed by a compact header row (`Account & Profile Settings` / public handle, demo persona switcher, `View Public Profile` link), segmented section tabs (`Profile & Portfolio`, `Tutor Schedule`, `Telegram Bot`, `Visibility & Roles`), and an asymmetric two-column desktop workspace (`minmax(0,1fr)` active editor panel + `340px` live account/Telegram & completeness summary rail).

FORM: Dual-route `Operate` Settings Desk (`/settings`) + Structured Academic Portfolio Showcase (`/@[username]`) sharing a unified `@ants/ui` component library inside Flow's established Stitch system; seed:799e37072be2cf56.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
