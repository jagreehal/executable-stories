---
title: Core types & constants
description: Shared types and constants from @executable-stories/core
---

The `@executable-stories/core` package provides shared types and constants used across all framework packages. This is the single source of truth for metadata types that get serialized to documentation.

## Installation

The core package is automatically installed as a dependency of each framework package. You typically don't need to install it directly, but you can if you need to reference the types in your own code:

```bash
pnpm add -D @executable-stories/core
```

## Types

### StepKeyword

The five BDD keywords for step labels:

```typescript
type StepKeyword = "Given" | "When" | "Then" | "And" | "But";
```

### DocEntry

Union type for all documentation entry kinds that can be attached to steps:

```typescript
type DocEntry =
  | { type: "note"; text: string }
  | { type: "tag"; name: string; value?: string }
  | { type: "kv"; key: string; value: string }
  | { type: "code"; code: string; language?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "link"; url: string; text?: string }
  | { type: "section"; title: string; entries: DocEntry[] }
  | { type: "mermaid"; code: string }
  | { type: "screenshot"; path: string; alt?: string }
  | { type: "custom"; name: string; data: unknown };
```

### StoryStep

Metadata for a single step (serialized result):

```typescript
interface StoryStep {
  keyword: StepKeyword;
  text: string;
  status?: "passed" | "failed" | "skipped" | "todo" | "pending";
  duration?: number;
  docs: DocEntry[];
}
```

### StoryMeta

Metadata for a complete story (serialized result):

```typescript
interface StoryMeta {
  title: string;
  steps: StoryStep[];
  tags?: string[];
  ticket?: string;
  meta?: Record<string, unknown>;
  status?: "passed" | "failed" | "skipped" | "todo";
  duration?: number;
}
```

### StoryOptions

Options when defining a story:

```typescript
interface StoryOptions {
  tags?: string[];
  ticket?: string;
  meta?: Record<string, unknown>;
}
```

## Constants

### STEP_KEYWORDS

Array of all valid step keywords:

```typescript
const STEP_KEYWORDS = ["Given", "When", "Then", "And", "But"] as const;
```

### KEYWORD_ALIASES

Mapping from alias names to their canonical keywords:

```typescript
const KEYWORD_ALIASES = {
  arrange: "Given",
  act: "When",
  assert: "Then",
  setup: "Given",
  context: "Given",
  execute: "When",
  action: "When",
  verify: "Then",
  check: "Then",
} as const;
```

### KeywordAlias

Type for valid alias keys:

```typescript
type KeywordAlias = keyof typeof KEYWORD_ALIASES;
// "arrange" | "act" | "assert" | "setup" | "context" | "execute" | "action" | "verify" | "check"
```

## Usage

Import types for your own code:

```typescript
import type { StepKeyword, DocEntry, StoryStep, StoryMeta, StoryOptions } from "@executable-stories/core";
import { STEP_KEYWORDS, KEYWORD_ALIASES } from "@executable-stories/core";

// Use in type annotations
function processStep(step: StoryStep): void {
  console.log(`${step.keyword} ${step.text}`);
}

// Use constants for validation
function isValidKeyword(keyword: string): keyword is StepKeyword {
  return STEP_KEYWORDS.includes(keyword as StepKeyword);
}
```

## Framework-specific vs Core

The core package exports **metadata types** (what gets serialized to docs) and **constants** (keyword aliases). It does **not** export:

- Runtime APIs (`StepsApi` with fluent modifiers like `.skip()`, `.fixme()`)
- Framework-specific behaviors
- Anything that would constrain how frameworks implement their APIs

Each framework package (`vitest-executable-stories`, `jest-executable-stories`, `playwright-executable-stories`) defines its own runtime types with framework-specific modifiers:

| Framework | Runtime Modifiers |
|-----------|-------------------|
| Vitest | `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` |
| Jest | `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` |
| Playwright | `.skip`, `.only`, `.fixme`, `.fail`, `.slow`, `.todo` |

The core types are re-exported from each framework package, so you can also import them directly:

```typescript
// These are equivalent:
import type { StepKeyword } from "@executable-stories/core";
import type { StepKeyword } from "vitest-executable-stories";
import type { StepKeyword } from "jest-executable-stories";
import type { StepKeyword } from "playwright-executable-stories";
```
