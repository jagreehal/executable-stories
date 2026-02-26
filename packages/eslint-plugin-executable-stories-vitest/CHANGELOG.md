# eslint-plugin-executable-stories-vitest

## 2.1.1

### Patch Changes

- 43572f6: Updated tag html display

## 2.1.0

### Minor Changes

- 1dc53b3: - **ESLint plugins (Jest, Playwright, Vitest):** Use `context.sourceCode` instead of deprecated `context.getSourceCode()` for ESLint 9 compatibility.
  - **Dependency updates** across packages and example apps.

## 2.0.0

### Patch Changes

- Updated dependencies [14ae91e]
  - eslint-config-executable-stories@0.2.0

## 1.2.0

### Minor Changes

- ab652d1: - **Repository metadata:** Add or fix repository metadata in each package for correct monorepo deployment (npm, changelog, docs links).
  - **OpenTelemetry:** Integrate OpenTelemetry support across adapter packages for trace links and observability.
  - **HTML report:** Step parameter highlighting — quoted strings and standalone numbers in step text are now visually highlighted in the HTML report for readability.
  - **Documentation:** Update READMEs and docs to describe HTML report features (step params, syntax highlighting, Mermaid, Markdown), fix formatters CLI flag docs (use `--html-no-*` disable flags; features are on by default), and add step parameter highlighting to the formatters API reference.

## 1.1.0

### Minor Changes

- 4df97de: Add or fix `repository.directory` in each package for correct monorepo metadata and deployment (npm, changelog, docs links).

## 1.0.0

### Minor Changes

- bc9b2fe: ESLint config and plugins: minor updates for story-based API and conventions.

### Patch Changes

- Updated dependencies [bc9b2fe]
  - eslint-config-executable-stories@0.1.0
