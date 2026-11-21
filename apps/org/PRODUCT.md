# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary users:** IGCSE, AS/A-Level, and Pearson Edexcel IAL students, parents, peer tutors, hackathon participants, and educational community partners visiting `the-ants.org`.
- **Core situation:** Visitors arrive to explore The ANTs mission, launch the guest-accessible Grade Calculator (`/calculator`), inspect verified tutors' live weekly teaching schedules, reach tutors via Telegram QR, browse community activity galleries, or read study essays.

## Product Purpose

**The ANTs** (`the-ants.org`) is a 100% public organization showcase and guest-accessible academic gateway linking directly to **Study** (`study.the-ants.org`), **Flow** (`flow.the-ants.org`), and external hackathon registration portals. Success means a visitor immediately understands what The ANTs builds, can calculate IGCSE/IAL grades without signing in, and can inspect a tutor's weekly `Sun–Sat` slots and scan/launch a prefilled Telegram inquiry in seconds.

## Positioning

Unlike generic tutoring directories or gated course marketplaces, `the-ants.org` blends transparent public academic tools (`/calculator`), structured live tutor availability matrices with zero-friction Telegram QR handoff, and editorial study guides without forcing student login walls.

## Operating Context

- **Pure Public Showcase:** Zero student login, user profile management, or paywalls live on `the-ants.org` (except protected `/admin` CMS reserved for `[THAW-2.3]`).
- **UI-Prototype-First Separation:** Every showcase page renders pure `'use client'` presentational `*View.tsx` components with exported `*ViewProps` and realistic mock fixtures (`src/mocks/*.mock.ts`) so full-stack D1/R2 containers (`[THAW-2.2]`) wire seamlessly later.

## Capabilities and Constraints

- **Implemented (`[ZYY-1.3]` + `[ZYY-2.1]`–`[ZYY-2.4]`):**
  - `/` (`OrgHomeLandingView`): Asymmetric editorial opening & interactive ecosystem orbit map, documentary tutoring photograph paired with Mission Pillars, widescreen 4-chapter `<OrgProductsVideoView />` (`Study`, `Flow`, `/calculator`, and `Telegram QR & Bot` with quick-launch bar), Founders & Tutors carousel, and Community Activities timeline (including the hackathon).
  - `/calculator`: Guest-accessible shared `@ants/calculator` (`GradeCalculatorView`).
  - `/team` & `/team/[username]`: Filterable 2-column Founders, Tutors, Contributors & Alumni showcase, interactive `Sun–Sat × 08:00–21:00` weekly tutor availability drawer (`TutorAvailabilityDrawerView` wrapping `@ants/ui` `TutorSlotPainterView`), and deterministic client-side SVG Telegram QR Inquiry Modal (`TelegramInquiryModalView` + `lib/qr.ts`).
  - `/activities`, `/activities/[slug]`, `/articles`, `/articles/[slug]` (with `/hackathon` redirecting to `/activities`): Category-filtered documentary photo galleries (`Tutoring`, `Student's Meet`, `Exam Venue Visit`, `Hackathon` using `public/images/org/*.jpg` rendered cleanly via `EditorialArtworkView`) with keyboard-accessible lightbox (`ActivityGalleryLightboxView`), curated hackathon recap + 4-phase schedule + external registration links, and pure typographic `68ch` article index & reader with sticky Table of Contents.
  - `/cms` (`OrgCmsStudioView` + section editors): 4-section editorial Content Studio (`Home Page`, `Team & Tutors` with Sun–Sat `<TutorSlotPainterView />`, `Activities & Hackathon` with documentary galleries, and `Articles` with section/callout/code/checklist editor) backed by `localStorage` (`ants-org-cms-v1`) + JSON backup Export/Import, live-updating all public showcase views while keeping `/admin/**` reserved for `[THAW-2.3]`.
- **Architectural Constraints:** Showcase `*View.tsx` components must never import `@ants/db`, server actions, or live API fetchers. Live D1 persistence and R2 media URLs remain deferred to `[THAW-2.2]` and `[THAW-2.3]`.

## Brand Commitments

- **Paired Stitch Design System (`@ants/ui/styles/tokens.css`):** Light (*The ANTs Academic System*) + Dark (*Amber Academic Studio*), semantic classes only (zero raw hex values in TSX), `Plus Jakarta Sans` for UI & editorial prose, `JetBrains Mono` (`font-mono tabular-nums`) for data/metrics/codes/dates, and `lucide-react` icons exclusively.

## Product Principles

1. **Calm editorial clarity:** Generous spacing, `68ch` reading measure, and clear typographic hierarchy over marketing fluff.
2. **Zero-login public utility:** Grade calculation, tutor slot inspection, and Telegram QR inquiries work instantly for guests.
3. **Contract-pure prototyping:** Pure TypeScript filtering/QR utilities and explicit `*ViewProps` keep full-stack wiring effortless.

