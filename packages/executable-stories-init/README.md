# executable-stories-init

Bootstrap [executable-stories](https://github.com/jagreehal/executable-stories) (Vitest and/or Playwright) into a TypeScript repo from zero. Detects your framework, package manager and monorepo layout, installs the right adapter, writes config, drops a sample story, and patches `package.json` scripts.

## Install and run

Run from your project root, no install required:

```bash
npx executable-stories-init@latest
```

```bash
pnpm dlx executable-stories-init
```

```bash
yarn dlx executable-stories-init
```

The wizard is interactive by default. Pass `--yes` (or `--json`) to run non-interactively.

## What it does

For each selected target (repo root, or one or more workspace packages):

1. **Detects** existing Vitest / Playwright installs, an existing config, and TypeScript.
2. **Installs** `executable-stories-vitest` / `executable-stories-playwright` and `executable-stories-formatters` using your repo's package manager (`pnpm`, `yarn`, or `npm`).
3. **Writes** `vitest.config.ts` and/or `playwright.config.ts` pre-wired with `StoryReporter` (Markdown + HTML output to `reports/`).
4. **Writes a sample story**: `tests/sample.story.test.ts` for Vitest, `tests/sample.story.spec.ts` for Playwright.
5. **Patches `package.json` scripts**: adds `test` (Vitest) and/or `test:e2e` (Playwright).
6. **Optionally writes `tsconfig.json`** when missing and `--ts` is passed.

Anything already present is left alone (or skipped with a reason). Use `--force` to overwrite differing files.

## Flags

| Flag | Description |
| ---- | ----------- |
| `--vitest` | Set up Vitest. |
| `--playwright` | Set up Playwright. |
| `--both` | Set up both Vitest and Playwright. |
| `--target <pkg...>` | Workspace package(s) to set up. Use `root` for the repo root. Repeatable. |
| `--ts` / `--no-ts` | Write a minimal `tsconfig.json` if missing. |
| `-y`, `--yes` | Non-interactive; accept defaults. |
| `--interactive` | Force prompts even when piped. |
| `--dry-run` | Print the plan; do not write or install. |
| `--force` | Overwrite differing existing files. |
| `--json` | Machine-readable output. Implies `--yes`. Requires `--vitest` / `--playwright` / `--both`. |

## Examples

Single-package repo, Vitest only:

```bash
npx executable-stories-init@latest --vitest --yes
```

Monorepo, Vitest in two packages and Playwright at the root:

```bash
npx executable-stories-init@latest --vitest --target packages/api --target packages/web
npx executable-stories-init@latest --playwright --target root
```

Preview without changes:

```bash
npx executable-stories-init@latest --both --dry-run
```

CI / scripting:

```bash
npx executable-stories-init@latest --both --target root --json
```

## After it runs

```bash
cd <target>           # repeat per selected target
<pm> install          # if you ran with --dry-run, or just to be sure
<pm> run test         # Vitest stories
<pm> run test:e2e     # Playwright stories (if installed)
```

Open the generated report:

```bash
# macOS
open reports/executable-stories.html
# Linux
xdg-open reports/executable-stories.html
# Windows
start reports\executable-stories.html
```

Playwright also needs browsers on first use:

```bash
pnpm exec playwright install      # pnpm
npm exec playwright install       # npm
yarn playwright install           # yarn
```

## Detection rules

- **Package manager** is taken from `packageManager` in the root `package.json`, then `pnpm-lock.yaml`, then `yarn.lock`, falling back to `npm`.
- **Monorepo** is detected from `pnpm-workspace.yaml` (`packages:` entries) or `workspaces` in `package.json` (array or `{ packages: [...] }`).
- **Already set up?** If the framework is already a dependency, install is skipped; if a `vitest.config.*` / `playwright.config.*` exists, the config write is skipped unless `--force` is passed.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | Success. |
| `1` | Plan applied with failures (e.g. install failed). |
| `2` | Invalid CLI usage (e.g. `--json` without a framework). |
| `130` | Cancelled by user (prompt aborted or no targets selected). |
