# executable-stories-react

## 0.1.16

### Patch Changes

- Updated dependencies [99072d1]
  - executable-stories-formatters@0.17.0

## 0.1.15

### Patch Changes

- Updated dependencies [31cce46]
  - executable-stories-formatters@0.16.0

## 0.1.14

### Patch Changes

- Updated dependencies [e3f8c5b]
  - executable-stories-formatters@0.15.1

## 0.1.13

### Patch Changes

- Updated dependencies [424b22c]
  - executable-stories-formatters@0.15.0

## 0.1.12

### Patch Changes

- Updated dependencies [6374d1b]
  - executable-stories-formatters@0.14.0

## 0.1.11

### Patch Changes

- Updated dependencies [e75d26f]
  - executable-stories-formatters@0.13.0

## 0.1.10

### Patch Changes

- Updated dependencies [46c17b9]
  - executable-stories-formatters@0.12.0

## 0.1.9

### Patch Changes

- bed366d: chore: update dependencies

  Routine dependency refresh via npm-check-updates (3-day publish cooldown). Notable changes:
  - **executable-stories-init**: `commander` 14 → 15, `@clack/prompts` 1.3 → 1.5
  - **executable-stories-react**: `marked` 15 → 18, `zod` 4.0 → 4.4; `react`/`react-dom` peer raised to `>=19.2.7`
  - **executable-stories-mcp**: `zod` 4.0 → 4.4
  - **executable-stories-formatters**: `yaml` 2.8 → 2.9
  - Peer-minimum raises: `cypress >=15.16.0`, `jest >=30.4.2`, `@playwright/test >=1.60.0`, `autotel >=3.4.4`

  Also migrated the workspace build/test tooling to **vite 8** (`vite: ^8` pnpm override; `@vitejs/plugin-react` 4 → 6). vitest 4.1.8 and storybook-vite 10.4.2 already support vite 8, and the astro example/docs apps build cleanly on it. `@types/estree` is pinned to `1.0.9` via a pnpm override to dedupe with eslint 10.4.1 (a split `1.0.8`/`1.0.9` otherwise breaks the eslint-plugin type-checks).

  (Dev-tooling-only bumps — eslint, vitest, turbo, storybook, @types/node, vite — are not released as they don't affect consumers of the published packages.)

- Updated dependencies [bed366d]
  - executable-stories-formatters@0.11.4

## 0.1.6

### Patch Changes

- Updated dependencies [c6890c9]
  - executable-stories-formatters@0.11.1

## 0.1.5

### Patch Changes

- Updated dependencies [00854ee]
  - executable-stories-formatters@0.11.0

## 0.1.4

### Patch Changes

- Updated dependencies [f790128]
  - executable-stories-formatters@0.10.0

## 0.1.3

### Patch Changes

- Updated dependencies [203692c]
  - executable-stories-formatters@0.9.0

## 0.1.2

### Patch Changes

- Updated dependencies [7f1f13d]
  - executable-stories-formatters@0.8.0

## 0.1.1

### Patch Changes

- Updated dependencies [6c87c1f]
  - executable-stories-formatters@0.7.15
