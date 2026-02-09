---
title: Core types & constants
description: Shared types and constants re-exported from framework packages
---

Shared types and constants for story metadata are **re-exported from each framework package** (`executable-stories-jest`, `executable-stories-vitest`, `executable-stories-playwright`, `executable-stories-cypress`). The `executable-stories-formatters` package exports canonical and raw types (e.g. `RawRun`, `TestRunResult`) used for report generation. There is no separate `@executable-stories/core` package — import from your framework package or from formatters as needed.

## Importing types

Import metadata types and constants from the package for your test runner:

```typescript
import type { StepKeyword, StoryMeta, StoryStep } from 'executable-stories-vitest';
import { STORY_META_KEY } from 'executable-stories-vitest';
```

Same pattern for Jest, Playwright, or Cypress: use `executable-stories-jest`, `executable-stories-playwright`, or `executable-stories-cypress`.

## Types

### StepKeyword

The five BDD keywords for step labels:

```typescript
type StepKeyword = 'Given' | 'When' | 'Then' | 'And' | 'But';
```

### StepMode

Step execution mode for docs rendering:

```typescript
type StepMode = 'normal' | 'skip' | 'only' | 'todo' | 'fails' | 'concurrent';
```

### DocPhase

Tracks when the doc entry was added:

```typescript
type DocPhase = 'static' | 'runtime';
```

### DocEntry

Union type for all documentation entry kinds. Each entry has **`kind`** and **`phase`**:

```typescript
type DocEntry =
  | { kind: 'note'; text: string; phase: DocPhase }
  | { kind: 'tag'; names: string[]; phase: DocPhase }
  | { kind: 'kv'; label: string; value: unknown; phase: DocPhase }
  | {
      kind: 'code';
      label: string;
      content: string;
      lang?: string;
      phase: DocPhase;
    }
  | {
      kind: 'table';
      label: string;
      columns: string[];
      rows: string[][];
      phase: DocPhase;
    }
  | { kind: 'link'; label: string; url: string; phase: DocPhase }
  | { kind: 'section'; title: string; markdown: string; phase: DocPhase }
  | { kind: 'mermaid'; code: string; title?: string; phase: DocPhase }
  | { kind: 'screenshot'; path: string; alt?: string; phase: DocPhase }
  | { kind: 'custom'; type: string; data: unknown; phase: DocPhase };
```

### StoryStep

Metadata for a single step:

```typescript
interface StoryStep {
  keyword: StepKeyword;
  text: string;
  mode?: StepMode;
  docs?: DocEntry[];
}
```

### StoryMeta

Metadata for a complete story (attached to test metadata, used by reporters):

```typescript
interface StoryMeta {
  scenario: string;
  steps: StoryStep[];
  tags?: string[];
  tickets?: string[];
  meta?: Record<string, unknown>;
  suitePath?: string[];
  docs?: DocEntry[];
  sourceOrder?: number;
}
```

### StoryOptions

Options when calling `story.init()`:

```typescript
interface StoryOptions {
  tags?: string[];
  ticket?: string | string[];
  meta?: Record<string, unknown>;
}
```

### StoryDocs

Inline documentation options passed as the second argument to step markers (`story.given(text, docs)`, etc.):

```typescript
interface StoryDocs {
  note?: string;
  tag?: string | string[];
  kv?: Record<string, unknown>;
  code?: { label: string; content: string; lang?: string };
  json?: { label: string; value: unknown };
  table?: { label: string; columns: string[]; rows: string[][] };
  link?: { label: string; url: string };
  section?: { title: string; markdown: string };
  mermaid?: { code: string; title?: string };
  screenshot?: { path: string; alt?: string };
  custom?: { type: string; data: unknown };
}
```

## Constants

### STEP_KEYWORDS

Array of all valid step keywords (exported where applicable):

```typescript
const STEP_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'] as const;
```

### KEYWORD_ALIASES

Mapping from alias names to their canonical keywords:

```typescript
const KEYWORD_ALIASES = {
  arrange: 'Given',
  act: 'When',
  assert: 'Then',
  setup: 'Given',
  context: 'Given',
  execute: 'When',
  action: 'When',
  verify: 'Then',
  check: 'Then',
} as const;
```

### KeywordAlias

Type for valid alias keys:

```typescript
type KeywordAlias = keyof typeof KEYWORD_ALIASES;
// "arrange" | "act" | "assert" | "setup" | "context" | "execute" | "action" | "verify" | "check"
```

### STORY_META_KEY

Key used to store `StoryMeta` in test metadata (e.g. `task.meta.story` in Vitest):

```typescript
const STORY_META_KEY = 'story';
```

## Usage

Import types and constants from your framework package:

```typescript
import type {
  DocEntry,
  StepKeyword,
  StoryDocs,
  StoryMeta,
  StoryOptions,
  StoryStep,
} from 'executable-stories-vitest';
import { STORY_META_KEY } from 'executable-stories-vitest';

function processStep(step: StoryStep): void {
  console.log(`${step.keyword} ${step.text}`);
}
```

## Framework packages vs formatters

- **Framework packages** export metadata types (`StoryMeta`, `StoryStep`, `DocEntry`, `StoryDocs`, `StoryOptions`, etc.) and **constants** such as `STORY_META_KEY`. They also implement the runtime story API (`story.init`, `story.given`, etc.).
- **executable-stories-formatters** exports **raw and canonical** types (`RawRun`, `TestRunResult`, `FormatterOptions`, etc.) for programmatic report generation. Use it when building custom pipelines or the CLI.
