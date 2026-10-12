# Formatting, Lint, and CI Gates

## Goal

Keep application CSS and JavaScript consistently formatted, catch common lint issues before commit, and require the repository's checks to pass before pull requests merge or a Vercel production deployment is promoted.

## Current behavior

- `package.json` defines `dev`, `build`, `preview`, and `test`; there are no format or lint scripts.
- The repository has `yarn.lock`, but no npm lockfile, Git hooks, or GitHub Actions workflow.
- Vercel is connected to the GitHub repository. No deployment check is currently configured by this change.

## Design

### Local formatting and lint

- Use Prettier as the single formatter for tracked application JavaScript, JSX, and CSS, with an explicit repository configuration and ignore file.
- Use ESLint for JavaScript and JSX in `src/`, including the existing React Hooks rules and browser globals. Expose a `lint` script and a non-mutating `format:check` script.
- Add Husky and lint-staged. A pre-commit hook formats staged supported files and applies ESLint autofixes to staged JavaScript/JSX; hook failures prevent the commit. The hook does not run the full test suite.
- Format the existing in-scope source once so the committed baseline passes the same checks as future changes. Avoid reformatting generated assets, dependencies, or unrelated documentation.

### Continuous integration

- Add one GitHub Actions workflow for pull requests and pushes to `main`.
- The workflow installs from the existing Yarn lockfile and runs, in order, `format:check`, `lint`, `test`, and `build` on a supported Node LTS release.
- Keep the workflow's required status check name stable and documented. Configure GitHub branch protection/rulesets so pull requests targeting `main` cannot merge unless this check passes.

### Vercel production gate

- Configure Vercel Deployment Checks to require the successful GitHub Actions status before assigning production aliases/promoting the deployment.
- This gate blocks production promotion; Vercel may still build and create a deployment before the check completes.
- The Vercel project must remain GitHub-connected and automatic production aliasing must be enabled. Confirm Deployment Checks are available for the project's Hobby plan before relying on them.
- GitHub branch protection and Vercel Deployment Checks are external project settings; repository files alone do not enable them. Record the exact dashboard steps and verify the selected check name after the workflow exists. If the Hobby plan does not support the Vercel gate, stop and present the supported alternative rather than silently claiming deployments are gated.

## Scope and constraints

- Use the existing Yarn lockfile; do not introduce a second package-manager lockfile.
- Add only the formatter, linter, Git-hook tooling, and React Hooks lint integration required by this design.
- Do not run tests in the pre-commit hook; CI is the authoritative full test/build gate.
- Do not change app behavior, Vercel domains, secrets, or deployment configuration unrelated to check gating.
- CI must not need repository secrets to run formatting, lint, tests, or build.

## Acceptance criteria

1. Supported source CSS/JavaScript/JSX passes `format:check`; staged supported files are formatted automatically at commit time.
2. `lint` reports ESLint errors in `src/` and exits nonzero on violations; the hook applies only safe configured autofixes.
3. GitHub Actions runs formatting, lint, tests, and production build on pull requests and pushes to `main`.
4. GitHub branch protection/rulesets require the stable CI check before merging to `main`.
5. Vercel Deployment Checks require that same successful GitHub check before production alias promotion, if supported on the connected Hobby project; deployment creation itself may occur earlier.
6. The external GitHub and Vercel settings are documented with verification steps, and unsupported Vercel plan capability is surfaced rather than treated as configured.
7. Existing app tests pass and the production build succeeds after the one-time formatting baseline and lint configuration are applied.
