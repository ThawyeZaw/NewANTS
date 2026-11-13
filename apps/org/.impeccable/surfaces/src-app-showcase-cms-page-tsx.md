---
version: 1
slug: "src-app-showcase-cms-page-tsx"
primary_target: "src/app/(showcase)/cms/page.tsx"
related_targets: ["src/components/cms/views/OrgCmsStudioView.tsx"]
---

# Surface Brief — Organization Content Management Studio (`/cms`)

- **Scope & Mode:** `Operate` — Pure `'use client'` presentational CMS studio views (`OrgCmsStudioView`, `CmsHomeEditorView`, `CmsTeamEditorView`, `CmsActivitiesEditorView`, `CmsArticlesEditorView`) in `apps/org/src/components/cms/views/`, mounted at `apps/org/src/app/(showcase)/cms/page.tsx` (`/cms`), backed by `localStorage` (`ants-org-cms-v1`) and live-synchronized with `/`, `/team`, `/team/[username]`, `/activities`, `/activities/[slug]`, `/articles`, and `/articles/[slug]`. Keeps `apps/org/src/app/admin/**` untouched for `[THAW-2.3]`.
- **Audience & Job:** Organization admins and content editors managing public showcase content across Home (hero, mission, products, featured tutors, recent timeline), Team & Tutors (bio, roles, subjects, Sun–Sat weekly schedule brush painter), Activities & Hackathon (event recaps, 4-phase schedules, external links, documentary photo galleries), and Articles (editorial metadata, typographic cover stamps, structured sections, callouts, code blocks, checklists).
- **Constraints:** Paired Stitch semantic tokens (`@ants/ui/styles/tokens.css` Light + Amber Dark), `Plus Jakarta Sans` UI/copy, `JetBrains Mono` (`font-mono tabular-nums`) for slugs, timestamps, counts, and code stamps, `lucide-react` icons only, zero kickers above headings, zero >1px side stripes, single-declaration 1px borders, and zero `@ants/db` or server action imports.

## Direction contract

THESIS: Deliver a calm, restrained 4-section editorial Content Studio (`/cms`) where every change to Home, Team, Activities, and Articles persists immediately to `localStorage` and updates the live public showcase pages without touching backend code or breaking `[THAW-2.3]` boundaries.

OWN-WORLD: Built strictly in The ANTs paired tokens—Light (*The ANTs Academic System*) and Dark (*Amber Academic Studio*)—using `Plus Jakarta Sans`, `JetBrains Mono` tabular numerals for slugs/timestamps/counts/formulas, `lucide-react` icons, crisp 1px borders (`--border`), and `--surface-card`/`--surface-inset` workspace layering.

STORY: Opening `/cms`, the editor switches between `Home Page`, `Team & Tutors`, `Activities`, and `Articles` in the studio rail, selects or creates an entry, edits structured fields (including Sun–Sat tutor slot painting, documentary gallery photos, and article sections), exports/imports JSON backups, toggles the Simulated Admin vs. Role-Gate Preview, and clicks `View Live` to inspect the updated public page immediately.

FIRST VIEWPORT: Top `OrgNavbarView`, compact studio header bar (`Content Studio` heading, live saved status, `Simulated Admin` / `Role Gate` preview toggle, `Import` / `Export JSON`, `Reset Defaults`, `View Live` link), and a 2-tier desktop workspace (`220px` left section sidebar with sliding indicator + `minmax(0,1fr)` split item browser & structured editor panel).

FORM: Multi-section `Operate` Editorial Content Studio (`/cms`) integrated into `apps/org`'s established Stitch Academic system.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, verification gates, and mandatory session documentation updates.
