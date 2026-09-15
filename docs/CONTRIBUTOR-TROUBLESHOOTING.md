# ZLife Contributor Troubleshooting

Use this guide when the normal zero-cost contributor setup does not work. The goal is to fix the local development environment without asking for Ziepher Tech production credentials or enabling paid providers.

## Supported setup

Start from a clean clone or fork and follow `CONTRIBUTING.md`:

1. Copy `.env.example` to `.env.local`.
2. Keep `ZLIFE_DEV_MODE=true`.
3. Keep the default mock providers enabled.
4. Run `npm ci`.
5. Run `npm run smoke:contributor`.
6. Run `npm run check` before opening a Pull Request.

## Node or npm version mismatch

The repository defines the supported Node version in its project files and CI. If `npm run smoke:contributor`, typecheck, lint, tests, or the build behave differently from CI, check your local Node and npm versions first.

Useful checks:

```bash
node --version
npm --version
```

If the Node major version differs from the repository-supported version, switch Node versions using your normal version manager, then remove generated dependency state and run `npm ci` again.

Do not change the repository's Node requirement just to make one local machine pass unless the project intentionally changes its supported runtime through a reviewed PR.

## `npm ci` fails

`npm ci` expects `package.json` and `package-lock.json` to agree and is designed for a clean, reproducible dependency install.

If it fails after previous local experiments:

```bash
rm -rf node_modules
npm ci
```

On Windows PowerShell, remove `node_modules` with the normal PowerShell command or File Explorer, then run `npm ci` again.

If `npm ci` reports a lockfile mismatch, do not regenerate or rewrite the lockfile unless your actual contribution intentionally changes dependencies. First confirm your branch is current and that `package.json` and `package-lock.json` came from the same commit.

## `.env.example` and `.env.local`

Create the local environment file from the repository example:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

For the default contributor path:

- keep `ZLIFE_DEV_MODE=true`;
- keep AI, email, SMS, payment, and notification mocks enabled;
- leave production/provider secrets blank unless you are using your own development-only provider account for a task that genuinely requires it.

Never ask for or copy Ziepher Tech production keys into a contributor environment.

## `npm run smoke:contributor` fails

The smoke test is intentionally local and zero-cost. It checks the contributor configuration before deeper development work.

If it fails:

1. Read the exact failure message.
2. Confirm you copied `.env.example` correctly.
3. Confirm `ZLIFE_DEV_MODE=true`.
4. Confirm mock providers are still enabled.
5. Confirm production/provider secret fields that should be blank are still blank.
6. Confirm the supported Node version is active.
7. Run `npm ci` again if dependency state may be stale.

Do not solve a smoke-test failure by adding real Stripe, OpenAI, Supabase service-role, Resend, Twilio, Vercel, or other production credentials.

## `npm run check` fails

`npm run check` is the pre-PR validation path. Fix the first real failure rather than bypassing the check.

Typical categories are:

- typecheck failure: inspect the TypeScript error and the referenced file;
- lint failure: fix the reported rule violation rather than disabling the rule globally;
- test failure: determine whether the implementation is wrong or an existing expectation needs to be updated because the intended behavior changed;
- build failure: reproduce locally and inspect the first build error before changing configuration.

If your change intentionally alters behavior, update the relevant regression test in the same PR so the new expectation is explicit.

## Mock-provider expectations

The default contributor environment should be able to exercise ordinary UI, forms, dashboards, navigation, workflows, and deterministic tests without paid network calls.

A contribution should not require production credentials simply to render or test a normal feature. When a provider boundary is involved, prefer an existing mock/dev adapter or add a deterministic development-safe boundary if that is part of the feature.

## When your branch is behind `main`

Before opening a PR, update your branch from the current `main` using your normal Git workflow. Resolve conflicts in your branch, rerun `npm ci` if dependencies changed, then run:

```bash
npm run smoke:contributor
npm run check
```

Do not force-push `main` or bypass repository checks to make a PR appear current.

## What to include when asking for help

When opening an issue for contributor setup trouble, include:

- operating system;
- Node version;
- npm version;
- the command that failed;
- the first relevant non-secret error output;
- whether the failure occurs on a clean clone/fork;
- whether `npm run smoke:contributor` passes.

Remove secrets, tokens, customer information, private URLs, and credentials before posting logs.

## Safety boundary

Contributor troubleshooting must never require Ziepher Tech production access. Do not request or share production customer data, Supabase service-role keys, Vercel production tokens, Stripe live secrets, paid AI credentials, email/SMS credentials, DNS credentials, or other protected provider access.
