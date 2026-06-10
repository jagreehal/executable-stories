---
"executable-stories-cypress": patch
"executable-stories-formatters": patch
"executable-stories-init": patch
"executable-stories-jest": patch
"executable-stories-mcp": patch
"executable-stories-playwright": patch
"executable-stories-react": patch
---

chore: update dependencies

Routine dependency refresh via npm-check-updates (3-day publish cooldown). Notable changes:

- **executable-stories-init**: `commander` 14 → 15, `@clack/prompts` 1.3 → 1.5
- **executable-stories-react**: `marked` 15 → 18, `zod` 4.0 → 4.4; `react`/`react-dom` peer raised to `>=19.2.7`
- **executable-stories-mcp**: `zod` 4.0 → 4.4
- **executable-stories-formatters**: `yaml` 2.8 → 2.9
- Peer-minimum raises: `cypress >=15.16.0`, `jest >=30.4.2`, `@playwright/test >=1.60.0`, `autotel >=3.4.4`

Two adjustments applied so the workspace builds cleanly:
- `@types/estree` pinned to `1.0.9` via a pnpm override to dedupe with eslint 10.4.1 (a split `1.0.8`/`1.0.9` broke the eslint-plugin type-checks).
- `@vitejs/plugin-react` held at `^4.3.4` (its v6 requires vite 8; deferred to a separate vite 8 migration).

(Dev-tooling-only bumps — eslint, vitest, turbo, storybook, @types/node — are not released as they don't affect consumers.)
