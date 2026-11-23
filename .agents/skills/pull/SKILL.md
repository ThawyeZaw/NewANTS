---
name: pull
description: >-
  Sync the local branch with origin, proactively resolve merge conflicts and post-pull errors (dependencies, local D1 migrations, typecheck, lint, and tests), and leave the workspace clean and verified before starting work.
  Activate whenever the user types /pull or asks to pull latest changes from origin/GitHub.
---

# Safe Sync & Auto-Heal Pull (`/pull`)

Keeps the local repository synchronized with `origin` and leaves the monorepo error-free before **Thaw Ye Zaw** (`feat/*` or `main`) or **Zay Lynn Htet** (`ui/*`) begins coding.

---

## Sync & Auto-Heal Pipeline

```text
1. Inspect Git Remote, Active Branch & Working Tree
   ↳ [Dirty working tree] → Auto-stash (-u) safely before pulling
          ↓
2. Fetch & Pull Latest Changes from origin
   ↳ [main] → git pull --no-edit origin main
   ↳ [feat/* or ui/*] → Pull origin/<branch> (if exists) + merge origin/main
          ↓
3. Proactively Resolve Merge Conflicts (Ownership-Aware)
   ↳ [Conflicts found] → Resolve per AGENTS.md boundaries → Verify zero markers → Complete merge
          ↓
4. Restore Stashed Local Changes (if stashed)
   ↳ [Pop conflicts] → Resolve cleanly & re-verify zero conflict markers
          ↓
5. Sync Local Environment
   ↳ [package.json / pnpm-lock.yaml changed] → pnpm install
   ↳ [packages/db/migrations/** changed] → pnpm db:migrate:local
   ↳ [Stale .next cache errors] → pnpm clean:next
          ↓
6. Run Post-Pull Health & Auto-Fix Gate
   ↳ Typecheck (pnpm typecheck) → Fix locally → Retry
   ↳ Lint (pnpm lint) → Auto-fix / resolve → Retry
   ↳ Tests (pnpm test) → Debug & fix → Retry
          ↓
7. Report Clean Ready-to-Work Summary Table
```

---

## Step-by-Step Execution Runbook

### Step 1: Inspect Git State & Protect Local Changes
1. Inspect active branch, working tree, remotes, and starting commit SHA:
   ```powershell
   git rev-parse --abbrev-ref HEAD
   git rev-parse --short HEAD
   git status --short
   git remote -v
   ```
   - If no `origin` remote is configured, prompt the user to configure their GitHub `origin` remote URL and stop.
2. Fetch and prune remote refs:
   ```powershell
   git fetch --prune origin
   ```
3. Check for uncommitted or untracked work (`git status --porcelain`):
   - If the working tree has local changes, safely stash them before pulling so merges stay clean:
     ```powershell
     git stash push -u -m "auto-stash before /pull"
     ```
   - Record that a stash was created so it is restored after pulling.

---

### Step 2: Pull from `origin` & Stay Current with `main`
1. Record the starting SHA (`$beforeSha = git rev-parse --short HEAD`) to track pulled commits and changed files.
2. Pull according to the active branch:
   - **If on `main`:**
     ```powershell
     git pull --no-edit origin main
     ```
   - **If on `feat/*`, `ui/*`, or another feature branch:**
     1. Check whether `origin/<current-branch>` exists and pull it if present:
        ```powershell
        git show-ref --verify --quiet "refs/remotes/origin/<current-branch>"
        if ($LASTEXITCODE -eq 0) {
          git pull --no-edit origin <current-branch>
        }
        ```
     2. Check if `origin/main` has commits missing from `HEAD`, and merge `origin/main` when behind:
        ```powershell
        $behindMain = [int](git rev-list --count HEAD..origin/main)
        if ($behindMain -gt 0) {
          git merge --no-edit origin/main
        }
        ```
3. If Step 1 stashed local changes (and there are no unresolved merge conflicts blocking pop), restore them once the pull/merge finishes:
   ```powershell
   git stash pop
   ```
   - If Step 2 produced merge conflicts, resolve and complete the merge in Step 3 **first**, then run `git stash pop` and resolve any pop conflicts using the same rules in Step 3.

---

### Step 3: Proactively Resolve Merge Conflicts (Ownership-Aware)
If any pull, merge, or `git stash pop` reports conflicts:
1. List all conflicted paths:
   ```powershell
   git diff --name-only --diff-filter=U
   ```
2. Resolve each conflicted file strictly following [`AGENTS.md`](../../../AGENTS.md) dual-developer ownership rules:
   - **Backend Locked Paths** (`packages/db/**`, `apps/api/**`, `packages/auth-client/**`, `packages/shared-types/**`, `**/actions/**`, `**/hooks/**`, `**/*Container.tsx`, `apps/org/src/app/admin/**`):
     - Preserve **Thaw's** authoritative backend changes when pulling onto `ui/*` branches.
   - **Presentational UI Views** (`**/views/*View.tsx`, `packages/ui/src/**`, `apps/org/src/components/**`):
     - Preserve **Zay's** visual Tailwind styling while keeping any newly added optional props or updated TypeScript contracts intact.
   - **Shared Documentation** (`progress.md`, `spec.md`, `AGENTS.md`, `AGENTS.thaw.md`, `AGENTS.zyy.md`):
     - Merge both developers' checklist updates (`[ ]`, `[~]`, `[x]`) and `Session History Log` entries chronologically without dropping either `[THAW]` or `[ZYY]` updates.
   - **Lockfiles (`pnpm-lock.yaml`)**:
     - Never hand-edit conflict markers in `pnpm-lock.yaml`. Accept one side and regenerate cleanly:
       ```powershell
       git checkout --theirs pnpm-lock.yaml
       pnpm install
       ```
3. **Escalate genuine ambiguity:** If a conflict reflects an incompatible design decision or business-logic contradiction that cannot be safely inferred from code and `spec.md`, stop and clarify with the user via the `ask_question` modal before committing.
4. Verify zero leftover conflict markers across the repository and complete the merge:
   ```powershell
   git diff --check
   git grep -n -E "^(<<<<<<<|=======|>>>>>>>)" -- .
   ```
   - If clean (zero markers), stage resolved files (`git add <resolved-files>`).
   - If `.git/MERGE_HEAD` exists, commit the merge resolution:
     ```powershell
     if (Test-Path .git/MERGE_HEAD) {
       git commit --no-edit
     }
     ```
   - Note: If `git stash pop` left the stash entry intact due to conflicts, drop that auto-stash entry (`git stash drop`) only after verifying all stashed edits are safely applied and conflict-free.

---

### Step 4: Post-Pull Environment Sync
Inspect files changed across the pulled range (`git diff --name-only $beforeSha HEAD` or `git diff --name-only ORIG_HEAD HEAD` if `ORIG_HEAD` exists):
1. **Dependencies (`package.json` or `pnpm-lock.yaml` changed):**
   ```powershell
   pnpm install
   ```
2. **Database Migrations (`packages/db/migrations/**` changed):**
   ```powershell
   pnpm db:migrate:local
   ```
   - If local Wrangler D1 is not initialized yet on this machine, warn cleanly in the final summary instead of failing destructively.

---

### Step 5: Proactive Health Check & Error Cleanup Gate
Run the verification suite in order and fix detected errors before handing the workspace back to the developer:

1. **TypeScript Typecheck:**
   ```powershell
   pnpm typecheck
   ```
   - If stale Next.js generated types (`.next/types`) cause errors after pulling route changes, run `pnpm clean:next` and re-run `pnpm typecheck`.
   - Fix any remaining type mismatches, imports, or optional `*ViewProps` defaults locally until exit code `0`.

2. **Lint Check:**
   ```powershell
   pnpm lint
   ```
   - Run auto-fix where appropriate or fix remaining lint violations manually until clean.

3. **Test Suite:**
   ```powershell
   pnpm test
   ```
   - Debug failing assertions or outdated fixtures and re-run until all tests pass.

4. **Respect Ownership Boundaries While Fixing Errors:**
   - **On `ui/*` branches (Zay):** If a post-pull error originates inside Thaw-locked backend paths (`packages/db/**`, `apps/api/**`, `packages/auth-client/**`, `packages/shared-types/**`, `**/actions/**`, `**/hooks/**`, `**/*Container.tsx`, `apps/org/src/app/admin/**`), **do NOT edit locked files** — stop and report the exact failing file and compiler/test output so Thaw can fix it on `feat/*`/`main`.
   - **On `feat/*` or `main` (Thaw):** Do not overwrite Zay's visual Tailwind styling inside `*View.tsx` when resolving prop or contract updates.

---

### Step 6: Report Summary to User
Present a concise summary table:
- **Active branch:** `<branch-name>`
- **Commits pulled:** `<before-sha> → <after-sha>` (or `Already up to date`)
- **Conflicts resolved:** List of conflicted files and how each was resolved (or `None`)
- **Environment sync:** Whether `pnpm install`, `pnpm db:migrate:local`, or `pnpm clean:next` ran
- **Verification results:**
  - `Typecheck` (`pnpm typecheck`): `PASS`
  - `Lint` (`pnpm lint`): `PASS`
  - `Tests` (`pnpm test`): `PASS`
- **Status:** Ready to start working (or exact blocker if a locked-file error requires teammate action).
