# Quality Gates

## GitHub merge check

The `main` branch has an active repository ruleset named **Require Quality Checks on main** (ruleset ID `24953427`). It requires the GitHub Actions status check **Quality checks**. The ruleset only targets `refs/heads/main`, does not require the branch to be up to date, and has no bypass actors.

The workflow is `.github/workflows/quality.yml`. It runs formatting, lint, tests, and build for pull requests targeting `main` and pushes to `main`. To inspect the ruleset, open **Settings → Rules → Rulesets** in the GitHub repository. The Actions run for the pull request must report the exact status name `Quality checks` for merge to be allowed.

## Vercel production promotion check

**Status: not configured or verified.** The Vercel project is GitHub-connected, but this session could not inspect or change Deployment Checks: the Vercel CLI is not installed, and the dashboard requires sign-in. Vercel's documentation confirms that Deployment Checks can delay production alias assignment, but does not establish whether this feature is available to this project's Hobby plan. Do not treat production as gated until the setting below has been verified in the Vercel account.

To complete the gate, in the Vercel dashboard open the `markdown-previewer` project under the Hobby team, then:

1. Confirm the project is Git-connected and automatic production aliasing is enabled.
2. Confirm Deployment Checks are available on the current plan.
3. Open **Settings → Build and Deployment → Deployment Checks**, add a GitHub check, and select the Actions check named **Quality checks**.
4. Verify the check blocks production alias assignment until it passes. Vercel can still create the deployment artifact before the check completes.

If Deployment Checks are unavailable on Hobby, choose a supported deployment gate before claiming production is protected. The GitHub merge ruleset remains active independently of Vercel.

## Verification

- GitHub ruleset API: `GET /repos/lalitmee/markdown-previewer/rulesets/24953427`; verify it is active, targets `refs/heads/main`, and requires `Quality checks`.
- GitHub Actions: inspect a pull request targeting `main` and confirm the workflow's `Quality checks` job passes before merge.
- Vercel: after enabling the setting, inspect a production deployment with a pending/failed check and confirm custom-domain aliases are withheld; after success, confirm aliases are assigned.
