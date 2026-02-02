---
title: Output modes
description: Colocated vs aggregated Markdown, output rules, and file naming
---

The reporter can write docs in three ways: **colocated** (one file next to each test file), **aggregated** (one combined file), or **mixed** (different rules per path).

## Modes at a glance

| Mode | Description | Config |
| ---- | ----------- | ------ |
| **Colocated** (default) | One `.docs.md` file next to each test file | *no config needed* |
| **Aggregated** | All scenarios in one file, grouped by source | `output: "docs/user-stories.md"` |
| **Mixed** | Different rules for different paths | `output: [{ include: "src/**", mode: "colocated" }, { include: "e2e/**", mode: "aggregated", outputFile: "docs/e2e.md" }]` |

## Output configuration

The `output` option accepts either a **string** (single aggregated file path) or an **array of rules**:

```ts
interface OutputRule {
  /** Glob pattern(s) to match test files */
  include: string | string[];
  /** "aggregated": combine matched scenarios into one file; "colocated": write docs next to each test file */
  mode: "aggregated" | "colocated";
  /** For aggregated mode: output file path */
  outputFile?: string;
  /** For colocated mode: file extension. Default: ".docs.md" */
  extension?: string;
}
```

## Colocated (default)

With no `output` config (or explicit colocated rules), the reporter writes one Markdown file next to each test file.

**Jest example:**

```ts
// jest.config.ts
reporters: ["default", ["jest-executable-stories/reporter", {
  output: [{ include: "**/*.story.test.ts", mode: "colocated" }],
}]]
// login.story.test.ts → login.story.docs.md (next to test file)
```

**Vitest:** Use `new StoryReporter({ output: [{ include: "**/*.story.test.ts", mode: "colocated" }] })`.

**Playwright:** Use `["playwright-executable-stories/reporter", { output: [{ include: "**/*.story.spec.ts", mode: "colocated" }] }]`.

## Aggregated

Single file containing all scenarios, grouped by source file.

**Jest:**

```ts
reporters: ["default", ["jest-executable-stories/reporter", { output: "docs/user-stories.md" }]],
```

**Vitest:** `new StoryReporter({ output: "docs/user-stories.md" })`.

**Playwright:** `["playwright-executable-stories/reporter", { output: "docs/user-stories.md" }]`.

Use `groupBy: "none"` in reporter options for a flat list without file groupings.

## Mixed rules

Apply different modes to different paths. **First matching rule wins** — put specific rules before general ones.

**Example: features colocated, e2e aggregated**

**Jest:**

```ts
reporters: ["default", ["jest-executable-stories/reporter", {
  output: [
    { include: "src/features/**", mode: "colocated", extension: ".docs.md" },
    { include: "e2e/**", mode: "aggregated", outputFile: "docs/e2e-stories.md" },
    { include: "**/*", mode: "aggregated", outputFile: "docs/other-stories.md" },
  ],
}]],
```

**Vitest:** Same structure with `new StoryReporter({ output: [ ... ] })`.

**Playwright:** Same structure in the reporter array.

**Explicit behavior:** If you provide `output` rules, only those rules apply. **Unmatched files are ignored.** Add a catch-all rule (e.g. `{ include: "**/*", mode: "aggregated", outputFile: "docs/other.md" }`) if you want a fallback.

## Colocated file naming

The reporter strips known test extensions and appends the configured extension:

| Test file | Extension | Output |
| --------- | --------- | ------ |
| `login.story.test.ts` | `.docs.md` (default) | `login.story.docs.md` |
| `login.story.test.ts` | `.md` | `login.story.md` |
| `login.test.ts` | `.docs.md` | `login.docs.md` |
| `checkout.spec.ts` | `.docs.md` | `checkout.docs.md` |

Same logic for Vitest (`.test.ts`, `.spec.ts`) and Playwright (`.spec.ts`).

## Framework-specific defaults

- **Jest:** If you don't provide any `output` rules, the default is **colocated** next to each test file.
- **Vitest:** If you don't provide any `output` rules, all scenarios go to the default aggregated file `docs/user-stories.md`. Use an explicit colocated rule if you want colocated by default.
- **Playwright:** If you don't provide any `output` rules, all scenarios are written as **colocated** `.docs.md` files.

See each package's README or reference (Vitest/Jest/Playwright reporter options) for the exact default in your framework.
