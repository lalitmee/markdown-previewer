# Formatting, Lint, and CI Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consistent local formatting/lint checks and require GitHub CI before merging or promoting a Vercel production deployment.

**Architecture:** Prettier formats supported source files; ESLint checks `src/`; Husky and lint-staged run targeted fixes before commits. One GitHub Actions workflow runs formatting, lint, tests, and build, and its stable check becomes the merge and Vercel production-promotion gate.

**Tech Stack:** Yarn Classic (existing v1 lockfile), Prettier, ESLint flat config, `eslint-plugin-react-hooks`, Husky, lint-staged, GitHub Actions, Vercel Deployment Checks.

**Spec:** `docs/superpowers/specs/2026-10-13-ci-quality-gates-design.md`

## Global Constraints

- “Use the existing Yarn lockfile; do not introduce a second package-manager lockfile.”
- “Do not run tests in the pre-commit hook; CI is the authoritative full test/build gate.”
- “CI must not need repository secrets to run formatting, lint, tests, or build.”
- “This gate blocks production promotion; Vercel may still build and create a deployment before the check completes.”
- “If the Hobby plan does not support the Vercel gate, stop and present the supported alternative rather than silently claiming deployments are gated.”

## Review Focus

- Existing source formatting drift: normalize only supported application source and ensure `format:check` passes without touching generated files or unrelated docs.
- Unsupported ESLint syntax/globals: JSX and browser globals must lint while real unused/invalid code still fails.
- Staged-file behavior: the hook must format staged JS/JSX/CSS, lint JS/JSX, and not run the test suite.
- Pull requests from forks: CI must run without secrets or write permissions.
- Vercel check availability/status identity: do not enable a gate that references a missing status or claim Hobby production promotion is gated unless verified.

---

### Task 1: Add local formatting, lint, and commit hooks

**Files:**
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `eslint.config.js`
- Create: `.husky/pre-commit`
- Modify: `package.json`
- Modify: `yarn.lock`
- Format: supported tracked application JS/JSX/CSS under `src/`

**Interfaces:**
- Produces: `yarn format:check`, `yarn lint`, and a Husky pre-commit hook using lint-staged.

- [ ] **Step 1: Define formatter/linter scripts and config**

Add Prettier, ESLint, `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, Husky, and lint-staged as dev dependencies. Configure ESLint flat config for `src/**/*.{js,jsx}`, JSX parsing, browser globals, recommended JS rules, and React Hooks recommended rules. Add `format:check` for the scoped source/config files and `lint` for `src/`.

- [ ] **Step 2: Install and lock dependencies with Yarn Classic**

Run: `yarn install`
Expected: `yarn.lock` is updated; no `package-lock.json` is created.

- [ ] **Step 3: Format existing in-scope source and add staged-file hooks**

Add lint-staged rules that run `prettier --write` on staged JS/JSX/CSS and `eslint --fix` on staged JS/JSX. Configure `postinstall: husky` and `.husky/pre-commit`; keep tests out of the hook.

- [ ] **Step 4: Verify the staged-file hook commands**

Run: `yarn lint-staged --diff HEAD`
Expected: changed supported source is formatted and JS/JSX is linted; no test command runs.

- [ ] **Step 5: Verify formatting, lint, and application tests/build**

Run: `yarn format:check && yarn lint && yarn test && yarn build`
Expected: all commands exit 0.

- [ ] **Step 6: Commit local tooling**

```bash
git add package.json yarn.lock .prettierrc.json .prettierignore eslint.config.js .husky/pre-commit src
git commit -m "chore: add formatting and lint hooks"
```

### Task 2: Add the required GitHub Actions check

**Files:**
- Create: `.github/workflows/quality.yml`

**Interfaces:**
- Consumes: Task 1 scripts `format:check`, `lint`, `test`, and `build`.
- Produces: one stable Actions job/check name, `Quality checks`, for PR and Vercel selection.

- [ ] **Step 1: Add a read-only workflow for pull requests and `main` pushes**

Use `pull_request` and `push` to `main`, grant only `contents: read`, install the existing Yarn v1 lockfile with frozen-lockfile behavior, and run `yarn format:check`, `yarn lint`, `yarn test`, and `yarn build` in that order on Node 22.

- [ ] **Step 2: Run the same check sequence locally**

Run: `yarn format:check && yarn lint && yarn test && yarn build`
Expected: all commands exit 0, matching the workflow sequence.

- [ ] **Step 3: Commit the workflow**

```bash
git add .github/workflows/quality.yml
git commit -m "ci: require quality checks on pull requests"
```

### Task 3: Configure and document required merge/deployment gates

**Files:**
- Create: `docs/deployment/quality-gates.md`
- External settings: GitHub branch protection/ruleset for `main`; Vercel Deployment Checks for the connected Hobby project.

**Interfaces:**
- Consumes: Task 2 stable Actions check `Quality checks`.
- Produces: required merge check and, if supported by the current Hobby project, required Vercel production-promotion check; a runbook records actual configuration and verification.

- [ ] **Step 1: Inspect existing GitHub branch rules and Vercel project capability/settings**

Read existing settings before changing them. Confirm the Vercel project is GitHub-connected, production aliasing is enabled, and Deployment Checks are available on the Hobby plan. Do not overwrite unrelated branch protection or Vercel settings.

- [ ] **Step 2: Enable required GitHub merge check**

Require the `Quality checks` status on pull requests targeting `main`, preserving any existing required checks and protections. Verify the check name matches the workflow job exactly.

- [ ] **Step 3: Enable Vercel production-promotion gate if supported**

Require the same successful GitHub Actions check under Vercel Deployment Checks. Verify a failed/pending check prevents production alias promotion; note that the deployment artifact may still be created. If Hobby does not support this, stop before claiming it is gated and report supported alternatives to the user.

- [ ] **Step 4: Document configured state and operator verification**

In `docs/deployment/quality-gates.md`, record the check name, the GitHub and Vercel dashboard locations, required settings, failure behavior, and how to verify future changes. Clearly mark any dashboard action that could not be completed.

- [ ] **Step 5: Commit gate runbook**

```bash
git add docs/deployment/quality-gates.md
git commit -m "docs: explain required quality gates"
```

### Task 4: Final verification

**Files:**
- Verify: workflow, formatter/linter configs, staged hook, and deployment runbook.

- [ ] **Step 1: Run the complete local CI sequence**

Run: `yarn format:check && yarn lint && yarn test && yarn build`
Expected: all commands exit 0.

- [ ] **Step 2: Verify GitHub/Vercel gate configuration**

Confirm `Quality checks` is required by the `main` branch rule. If Vercel gate support was confirmed, verify the same check is selected and production aliasing waits for success; otherwise confirm the limitation and alternative are accurately documented without claiming deployment gating.

- [ ] **Step 3: Check the final diff**

Run: `git diff --check && git status --short`
Expected: no whitespace errors and no unintended files.
