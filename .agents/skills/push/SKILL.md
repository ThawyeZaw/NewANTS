---
name: push
description: >-
  Verify code health and push changes to the appropriate Git branch. Runs typecheck, lint, and tests; automatically fixes any detected issues locally first; and only pushes when all checks pass with zero errors.
  Activate whenever the user types /push or asks to commit/push current work to GitHub.
---

# Safe Verified Push (`/push`)

Enforces a zero-error verification gate before pushing code to GitHub for both developers:
- **Thaw Ye Zaw:** pushes to `feat/<feature-name>` (or `main` if on main)
- **Zyy Linn Htet:** pushes strictly to `ui/<feature-name>`

---

## Verification Pipeline

```text
1. Inspect Git Branch & Status
          ↓
2. Run Typecheck (pnpm typecheck)
   ↳ [Fail] → Analyze & fix TypeScript errors locally → Retry
          ↓
3. Run Lint (pnpm lint)
   ↳ [Fail] → Run linter auto-fix or manually resolve → Retry
          ↓
4. Run Vitest Tests (pnpm test)
   ↳ [Fail] → Debug & resolve failing tests locally → Retry
          ↓
5. Check Ownership Boundary Violations
   ↳ [ZYY on ui/* touching locked paths] → Stop & report
          ↓
6. Update session tracking in progress.md / spec.md
          ↓
7. Git Commit & Push to Remote Branch
```

---

## Step-by-Step Execution Runbook

### Step 1: Detect Active Branch & Ownership Scope
1. Check current branch:
   ```powershell
   git rev-parse --abbrev-ref HEAD
   ```
2. Determine developer and branch prefix:
   - If on `main` and committing directly (or creating a feature branch), verify with the user if they want to push to `main` or a `feat/*` / `ui/*` branch.
   - If **Zyy** (`ui/*` branch): Ensure **zero** modifications in `packages/db/**`, `apps/api/**`, `**/actions/**`, or `**/*Container.tsx`. If found, warn and remove or revert before pushing.
   - If **Thaw** (`feat/*` or `main`): Ensure visual Tailwind styling inside `*View.tsx` hasn't been broken.

### Step 2: Automated Verification Gate (Fail-Fast & Auto-Fix)

Run checks in order. **Never push if any check fails.**

#### 1. TypeScript Typecheck
```powershell
pnpm typecheck
```
- **If errors are found:**
  1. Inspect the exact compiler output and file lines.
  2. Modify and fix the type definitions, imports, or missing props locally.
  3. Re-run `pnpm typecheck` until it exits with code 0.

#### 2. Lint Check
```powershell
pnpm lint
```
- **If lint errors are found:**
  1. Attempt automated lint fixes where applicable (`pnpm lint --fix` or equivalent).
  2. Fix any remaining syntax or rule violations manually.
  3. Re-run `pnpm lint` until it passes cleanly.

#### 3. Test Suite
```powershell
pnpm test
```
- **If any test fails:**
  1. Locate the failing assertion and debug the root cause.
  2. Fix the implementation or update outdated test fixtures.
  3. Re-run `pnpm test` until all tests pass.

---

### Step 3: Synchronize Session Documentation
Before staging code:
1. Verify `progress.md` reflects current status (`[~]` ready for review or `[x]` approved).
2. If new routes, schema columns, or contracts were created, confirm `spec.md` is updated.

---

### Step 4: Stage, Commit & Push
1. Check git status to ensure only relevant files are staged:
   ```powershell
   git status
   ```
2. Stage modified and newly created files:
   ```powershell
   git add .
   ```
3. Formulate a semantic conventional commit message:
   - `feat(scope): ...`
   - `fix(scope): ...`
   - `ui(scope): ...`
   - `docs(scope): ...`
4. Commit:
   ```powershell
   git commit -m "<type>(<scope>): <concise description>"
   ```
5. Check if remote origin is configured:
   ```powershell
   git remote -v
   ```
   - If no remote origin exists, prompt the user to add their GitHub repo URL.
   - If origin exists, push to the upstream branch:
     ```powershell
     git push -u origin <current-branch>
     ```

---

### Step 5: Report Summary to User
Provide:
- Current branch name pushed.
- Verification results table (Typecheck: PASS, Lint: PASS, Tests: PASS).
- Git commit hash and message.
- Upstream GitHub PR link or branch URL.
