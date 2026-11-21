---
version: 1
slug: "src-app-login-page-tsx"
primary_target: "src/app/login/page.tsx"
related_targets: ["src/app/signup/page.tsx","src/components/auth/views/FlowAuthPageView.tsx"]
---

# Surface Brief — Unified Cross-Subdomain Authentication Studio (`/login` & `/signup`)

- **Scope & Mode:** `Operate` — Shared presentational authentication system in `@ants/ui` (`AuthFormView`, `AuthStudioView`, `WorkspaceAuthGateView`, `lib/auth.ts`) mounted at `/login` and `/signup` in both `apps/flow` (`localhost:3002`) and `apps/study` (`localhost:3001`), plus Guest vs. Authenticated Access Matrix gates across `FlowShellView`, `StudyShellView`, `FlowSettingsPageView`, and `StudySettingsPageView`.
- **Audience & Job:** Students, verified tutors, contributors, and general productivity users signing in or creating a single `.the-ants.org` account that syncs across `Flow` (24h Timetable, P1–P4 Tasks, Pomodoro, `@TheANTsFlowBot` reminders) and `Study` (IGCSE & IAL Topic Tracker, `WMA11-SET` Modular Maths, Past Paper UMS Matrix, Exam Countdowns), while keeping `/pomodoro` and `/calculator` 100% usable without login.
- **Constraints:** Preserve the established Stitch Academic design system (`@ants/ui/styles/tokens.css` Light + Amber Dark, `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals, `lucide-react` icons exclusively, `>=4.5:1` contrast including `bg-primary-solid` primary buttons and `text-foreground-muted` placeholders). Pure `'use client'` views in `@ants/ui` with zero `next/*` or `@ants/db` imports. Code-led build path.

## Direction contract

THESIS: Frame authentication as a transparent cross-subdomain studio threshold—pairing an app-contextual editorial capability ledger and explicit no-login guest tool shortcuts (`/pomodoro`, `/calculator`) on the left with a high-precision, zero-friction credential and demo-persona workbench on the right.

OWN-WORLD: Built strictly in The ANTs paired tokens—Light (*The ANTs Academic System*: `#f8fafc` ground, `#ffffff` cards, `#b45309` solid amber primary, `#059669` emerald verified state) and Dark (*Amber Academic Studio*: `#0b0c0e` ground, `#18191e` cards, `#f59e0b` amber primary, `#10b981` emerald verified state)—with `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals for `@username` handles, `.the-ants.org` cookies, syllabus codes, and password strength scores, `lucide-react` icons, and crisp 1px hairline dividers without kickers, nested cards, or >1px side stripes.

STORY: Visiting `/login` or `/signup` on `Flow` or `Study`, the user sees what their unified `.the-ants.org` session unlocks across both apps (plus direct guest links to `/pomodoro` and `/calculator`), switches smoothly between Sign In and Create Account via a gliding segmented tab, tests multi-role personas (`@zaylynnhtet`, `@thawyezaw`, `@minkhant`) in one click or registers a live-validated `@username` with primary focus track selection, and redirects straight to their requested workspace with cross-port cookie + `localStorage` persistence.

FIRST VIEWPORT: Slim top studio bar (`BrandHeaderBadge`, workspace return link, `ThemeToggle`, 9-dot `AppSwitcher`), followed by an asymmetric two-column desktop split (`lg:grid-cols-[1.05fr_0.95fr]`): left editorial column with app-specific headline, hairline-divided 3-row capability ledger, `.the-ants.org` SSO status bar, and Guest-Ready tools strip; right workbench card with gliding `Sign In` / `Create Account` tabs, 1-click Demo Persona pills, Google/GitHub OAuth buttons, live-validated inputs, password strength meter, and primary submit CTA.

FORM: Asymmetric Split-Screen `Operate` Authentication Studio (`/login`, `/signup`) paired with inline `WorkspaceAuthGateView` (`gate` and `banner` variants) enforcing the Spec Guest vs. Authenticated Access Matrix; seed:799e37072be2cf56.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
