# Nested Doc Entries & Ticket URLs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doc entries can have children for intentional grouping; tickets render as hyperlinks in HTML.

**Architecture:** Add optional `children?: DocEntry[]` to every doc entry variant. Doc methods return their entry AND push to the array; parents strip children from the flat array via reference identity. Tickets change from `string[]` to `NormalizedTicket[]` (string | object with url). All formatters, adapters, language packages, and schemas updated.

**Tech Stack:** TypeScript (formatters + JS adapters), Go, Rust, Python, Kotlin/JUnit5, C#/xUnit. TDD throughout. .NET and Java tasks use devcontainer.

**Spec:** `docs/superpowers/specs/2026-03-31-nested-doc-entries-design.md`

---

## Phase 1: Schema & Core Types (formatters package)

### Task 1: Add `children` to DocEntry in JSON Schema

**Files:**
- Modify: `packages/executable-stories-formatters/schemas/raw-run.schema.json:244-380`
- Test: `packages/executable-stories-formatters/test/acl/validate.test.ts` (schema validation tests)

- [ ] **Step 1: Write failing test — schema accepts children**

Add a test in `packages/executable-stories-formatters/test/acl/validate.test.ts`:

```ts
it("accepts doc entries with children", () => {
  const run = createMinimalRun({
    story: {
      scenario: "nested docs",
      steps: [],
      docs: [
        {
          kind: "note",
          text: "parent",
          phase: "runtime",
          children: [
            { kind: "kv", label: "Amount", value: "$49", phase: "runtime" },
          ],
        },
      ],
    },
  });
  expect(() => assertValidRun(run)).not.toThrow();
});
```

Note: `createMinimalRun` is a helper that wraps a test case into a valid `RawRun` structure. Check the existing test file for the exact helper — it may be `createRawRun` or similar. Use whatever the file already uses.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "accepts doc entries with children"`
Expected: FAIL — `additionalProperties: false` rejects `children`

- [ ] **Step 3: Update JSON schema to allow children on every DocEntry variant**

In `packages/executable-stories-formatters/schemas/raw-run.schema.json`, add to every object in the `DocEntry.oneOf` array:

```json
"children": {
  "type": "array",
  "items": { "$ref": "#/$defs/DocEntry" },
  "description": "Nested child doc entries for grouping."
}
```

Add this property to all 10 variants (note, tag, kv, code, table, link, section, mermaid, screenshot, custom). Do NOT add it to `required` — it is optional.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "accepts doc entries with children"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/schemas/raw-run.schema.json packages/executable-stories-formatters/test/acl/validate.test.ts
git commit -m "feat(schema): add optional children field to DocEntry"
```

### Task 2: Add `children` to DocEntry TypeScript type

**Files:**
- Modify: `packages/executable-stories-formatters/src/types/story.ts:28-39`

- [ ] **Step 1: Write failing type test**

Create `packages/executable-stories-formatters/test/types/doc-entry-children.test.ts`:

```ts
import { describe, it, expectTypeOf } from "vitest";
import type { DocEntry } from "../../src/types/story";

describe("DocEntry children", () => {
  it("accepts children on note", () => {
    const entry: DocEntry = {
      kind: "note",
      text: "parent",
      phase: "runtime",
      children: [{ kind: "kv", label: "a", value: 1, phase: "runtime" }],
    };
    expectTypeOf(entry).toMatchTypeOf<DocEntry>();
  });

  it("children is optional", () => {
    const entry: DocEntry = { kind: "note", text: "no children", phase: "runtime" };
    expectTypeOf(entry).toMatchTypeOf<DocEntry>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "DocEntry children"`
Expected: FAIL — type error, `children` not in type

- [ ] **Step 3: Add children to every DocEntry variant**

In `packages/executable-stories-formatters/src/types/story.ts`, replace the DocEntry type:

```ts
/** Union type for all documentation entry kinds */
export type DocEntry =
  | { kind: "note"; text: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "tag"; names: string[]; phase: DocPhase; children?: DocEntry[] }
  | { kind: "kv"; label: string; value: unknown; phase: DocPhase; children?: DocEntry[] }
  | { kind: "code"; label: string; content: string; lang?: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "table"; label: string; columns: string[]; rows: string[][]; phase: DocPhase; children?: DocEntry[] }
  | { kind: "link"; label: string; url: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "section"; title: string; markdown: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "mermaid"; code: string; title?: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "screenshot"; path: string; alt?: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "custom"; type: string; data: unknown; phase: DocPhase; children?: DocEntry[] };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "DocEntry children"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/types/story.ts packages/executable-stories-formatters/test/types/doc-entry-children.test.ts
git commit -m "feat(types): add optional children to DocEntry"
```

### Task 3: Add NormalizedTicket type and update StoryMeta.tickets

**Files:**
- Modify: `packages/executable-stories-formatters/src/types/story.ts:73-92`

- [ ] **Step 1: Write failing type test**

Create `packages/executable-stories-formatters/test/types/ticket-types.test.ts`:

```ts
import { describe, it, expectTypeOf } from "vitest";
import type { NormalizedTicket, StoryMeta } from "../../src/types/story";

describe("NormalizedTicket type", () => {
  it("accepts string id with optional url", () => {
    const t: NormalizedTicket = { id: "JIRA-123" };
    expectTypeOf(t).toMatchTypeOf<NormalizedTicket>();
  });

  it("accepts string id with url", () => {
    const t: NormalizedTicket = { id: "PAY-1042", url: "https://linear.app/PAY-1042" };
    expectTypeOf(t).toMatchTypeOf<NormalizedTicket>();
  });

  it("StoryMeta.tickets uses NormalizedTicket", () => {
    const meta: StoryMeta = {
      scenario: "test",
      steps: [],
      tickets: [{ id: "JIRA-123" }, { id: "PAY-1", url: "https://example.com" }],
    };
    expectTypeOf(meta.tickets).toEqualTypeOf<NormalizedTicket[] | undefined>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "NormalizedTicket"`
Expected: FAIL — type not found

- [ ] **Step 3: Add NormalizedTicket and update StoryMeta**

In `packages/executable-stories-formatters/src/types/story.ts`, add before `StoryMeta`:

```ts
/** A ticket reference with an optional direct URL */
export interface NormalizedTicket {
  /** Ticket identifier (e.g., "JIRA-123", "PAY-1042") */
  id: string;
  /** Direct URL to the ticket (overrides ticketUrlTemplate) */
  url?: string;
}
```

Update the `tickets` field in `StoryMeta`:

```ts
  /** Ticket/issue references (normalized to array of objects) */
  tickets?: NormalizedTicket[];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "NormalizedTicket"`
Expected: PASS

- [ ] **Step 5: Fix any type errors caused by the tickets change**

Run: `cd packages/executable-stories-formatters && pnpm type-check`

This will surface all places that assume `tickets: string[]`. Fix each one:
- `src/formatters/markdown.ts` — update ticket rendering to use `.id` and `.url`
- `src/converters/acl/` — update canonicalization if it touches tickets
- `test/stubs.ts` — update `createStoryMeta()` to use `{ id: "JIRA-xxx" }`

For each fix, update the code to handle `NormalizedTicket` objects. Don't fix formatters rendering yet — that's Task 5/6.

- [ ] **Step 6: Run full test suite**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run`
Expected: PASS (all existing tests, possibly with updated stubs)

- [ ] **Step 7: Commit**

```bash
git add packages/executable-stories-formatters/src/types/story.ts packages/executable-stories-formatters/test/types/ticket-types.test.ts
git add -u  # any files fixed for type errors
git commit -m "feat(types): add NormalizedTicket type, update StoryMeta.tickets"
```

### Task 4: Update JSON schema for ticket objects

**Files:**
- Modify: `packages/executable-stories-formatters/schemas/raw-run.schema.json:165-169`

- [ ] **Step 1: Write failing schema validation test**

In the schema validation test file, add:

```ts
it("accepts ticket objects with id and url", () => {
  const run = createMinimalRun({
    story: {
      scenario: "ticket urls",
      steps: [],
      tickets: [
        { id: "JIRA-123" },
        { id: "PAY-1042", url: "https://linear.app/PAY-1042" },
      ],
    },
  });
  expect(() => assertValidRun(run)).not.toThrow();
});

it("still accepts string tickets for backward compat at schema level", () => {
  const run = createMinimalRun({
    story: {
      scenario: "string tickets",
      steps: [],
      tickets: ["JIRA-123"],
    },
  });
  expect(() => assertValidRun(run)).not.toThrow();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "ticket objects"`
Expected: FAIL — schema rejects objects in tickets array

- [ ] **Step 3: Update schema tickets field**

In `raw-run.schema.json`, replace the `tickets` property in `StoryMeta`:

```json
"tickets": {
  "type": "array",
  "items": {
    "oneOf": [
      { "type": "string" },
      {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "url": { "type": "string" }
        },
        "required": ["id"],
        "additionalProperties": false
      }
    ]
  },
  "description": "Ticket/issue references. Each item is either a string ID or an object with id and optional url."
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "ticket"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/schemas/raw-run.schema.json packages/executable-stories-formatters/test/acl/validate.test.ts
git commit -m "feat(schema): tickets accept string or {id, url} objects"
```

## Phase 2: Formatter Rendering

### Task 5: HTML formatter — render children with left border

**Files:**
- Modify: `packages/executable-stories-formatters/src/formatters/html/renderers/doc-entries.ts`
- Modify: `packages/executable-stories-formatters/src/formatters/html/renderers/index.ts:72-79`
- Test: `packages/executable-stories-formatters/test/formatters/html/renderers/doc-entries.test.ts`

- [ ] **Step 1: Write failing test — renderDocEntry with children**

In `packages/executable-stories-formatters/test/formatters/html/renderers/doc-entries.test.ts`, add:

```ts
describe("children rendering", () => {
  it("renders children inside doc-children container", () => {
    const html = renderDocEntry(
      {
        kind: "note",
        text: "Parent note",
        phase: "runtime",
        children: [
          { kind: "kv", label: "Amount", value: "$49", phase: "runtime" },
          { kind: "kv", label: "Currency", value: "USD", phase: "runtime" },
        ],
      },
      baseDeps,
    );
    expect(html).toContain("doc-children");
    expect(html).toContain("Parent note");
    expect(html).toContain("Amount");
    expect(html).toContain("Currency");
  });

  it("renders no children container when children absent", () => {
    const html = renderDocEntry(
      { kind: "note", text: "Solo note", phase: "runtime" },
      baseDeps,
    );
    expect(html).not.toContain("doc-children");
  });

  it("renders recursive children", () => {
    const html = renderDocEntry(
      {
        kind: "note",
        text: "Grandparent",
        phase: "runtime",
        children: [
          {
            kind: "note",
            text: "Parent",
            phase: "runtime",
            children: [
              { kind: "kv", label: "Leaf", value: "value", phase: "runtime" },
            ],
          },
        ],
      },
      baseDeps,
    );
    // Two levels of nesting
    const matches = html.match(/doc-children/g);
    expect(matches?.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "children rendering"`
Expected: FAIL — no `doc-children` in output

- [ ] **Step 3: Update renderDocEntry to render children**

In `packages/executable-stories-formatters/src/formatters/html/renderers/doc-entries.ts`, update the `renderDocEntry` function:

```ts
export function renderDocEntry(entry: DocEntry, deps: DocEntryDeps): string {
  let html: string;
  switch (entry.kind) {
    case "note":
      html = renderDocNote(entry, deps);
      break;
    case "tag":
      html = renderDocTag(entry, deps);
      break;
    case "kv":
      html = renderDocKv(entry, deps);
      break;
    case "code":
      html = renderDocCode(entry, deps);
      break;
    case "table":
      html = renderDocTable(entry, deps);
      break;
    case "link":
      html = renderDocLink(entry, deps);
      break;
    case "section":
      html = renderDocSection(entry, deps);
      break;
    case "mermaid":
      html = renderDocMermaid(entry, deps);
      break;
    case "screenshot":
      html = renderDocScreenshot(entry, deps);
      break;
    case "custom":
      html = renderDocCustom(entry, deps);
      break;
    default:
      html = "";
  }

  if (entry.children && entry.children.length > 0) {
    const childrenHtml = entry.children
      .map((child) => renderDocEntry(child, deps))
      .join("");
    html += `<div class="doc-children">${childrenHtml}</div>`;
  }

  return html;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "children rendering"`
Expected: PASS

- [ ] **Step 5: Add CSS for doc-children**

Find the CSS file. It's generated in `packages/executable-stories-formatters/src/formatters/html/styles.ts` (the `CSS_STYLES` constant). Add:

```css
.doc-children {
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 2px solid var(--border-color, #e2e8f0);
  margin-top: 0.25rem;
}
```

Read the styles file first to find the right location and the existing CSS variable names.

- [ ] **Step 6: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/renderers/doc-entries.ts packages/executable-stories-formatters/src/formatters/html/styles.ts packages/executable-stories-formatters/test/formatters/html/renderers/doc-entries.test.ts
git commit -m "feat(html): render doc entry children with left-border grouping"
```

### Task 6: HTML formatter — render tickets as hyperlinks

**Files:**
- Modify: `packages/executable-stories-formatters/src/formatters/html/renderers/scenario.ts`
- Modify: `packages/executable-stories-formatters/src/formatters/html/renderers/index.ts` (add ticketUrlTemplate to options)
- Test: `packages/executable-stories-formatters/test/formatters/html/renderers/scenario.test.ts`

- [ ] **Step 1: Write failing tests — ticket rendering in HTML**

In `packages/executable-stories-formatters/test/formatters/html/renderers/scenario.test.ts`, add:

```ts
describe("ticket rendering", () => {
  it("renders ticket as plain span without template", () => {
    const tc = createTestCase({
      story: { scenario: "test", steps: [], tickets: [{ id: "JIRA-123" }] },
    });
    const html = renderScenario({ tc, metrics: undefined }, deps);
    expect(html).toContain("JIRA-123");
    expect(html).toContain("ticket");
  });

  it("renders ticket as link with ticketUrlTemplate", () => {
    const depsWithTemplate = {
      ...deps,
      ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
    };
    const tc = createTestCase({
      story: { scenario: "test", steps: [], tickets: [{ id: "JIRA-123" }] },
    });
    const html = renderScenario({ tc, metrics: undefined }, depsWithTemplate);
    expect(html).toContain('href="https://jira.example.com/browse/JIRA-123"');
    expect(html).toContain("JIRA-123");
  });

  it("renders ticket with explicit url (overrides template)", () => {
    const depsWithTemplate = {
      ...deps,
      ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
    };
    const tc = createTestCase({
      story: {
        scenario: "test",
        steps: [],
        tickets: [{ id: "PAY-1042", url: "https://linear.app/PAY-1042" }],
      },
    });
    const html = renderScenario({ tc, metrics: undefined }, depsWithTemplate);
    expect(html).toContain('href="https://linear.app/PAY-1042"');
    expect(html).not.toContain("jira.example.com");
  });
});
```

Note: Check the existing test file for the exact `createTestCase` helper and `deps` object pattern. Use whatever the file already uses.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "ticket rendering"`
Expected: FAIL — no ticket rendering in HTML

- [ ] **Step 3: Add ticketUrlTemplate to HTML options**

In `packages/executable-stories-formatters/src/formatters/html/renderers/index.ts`, add to `HtmlFormatterOptions`:

```ts
/** URL template for ticket links. Use {ticket} as placeholder. */
ticketUrlTemplate?: string;
```

Wire it through `normalizeOptions` and into `scenarioDeps`:

```ts
ticketUrlTemplate: opts.ticketUrlTemplate,
```

- [ ] **Step 4: Add ticket rendering to scenario.ts**

In `packages/executable-stories-formatters/src/formatters/html/renderers/scenario.ts`, add a `renderTickets` helper and call it in the scenario header (after tags):

```ts
function renderTicket(
  ticket: NormalizedTicket,
  template: string | undefined,
  escapeHtml: (s: string) => string,
): string {
  const url = ticket.url ?? (template ? template.replace("{ticket}", ticket.id) : undefined);
  if (url) {
    return `<a class="tag ticket-tag" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ticket.id)}</a>`;
  }
  return `<span class="tag ticket-tag">${escapeHtml(ticket.id)}</span>`;
}
```

Add `ticketUrlTemplate` to `RenderScenarioDeps` and render tickets in the scenario header HTML.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "ticket rendering"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -u packages/executable-stories-formatters/src/formatters/html/
git add packages/executable-stories-formatters/test/formatters/html/renderers/scenario.test.ts
git commit -m "feat(html): render tickets as hyperlinks with ticketUrlTemplate support"
```

### Task 7: Markdown formatter — render children indented

**Files:**
- Modify: `packages/executable-stories-formatters/src/formatters/markdown.ts`
- Test: `packages/executable-stories-formatters/test/formatters/markdown.test.ts`

- [ ] **Step 1: Write failing test — markdown children**

In `packages/executable-stories-formatters/test/formatters/markdown.test.ts`, add:

```ts
describe("doc entry children", () => {
  it("renders children indented under parent note", () => {
    const run = createTestRunWithDocs([
      {
        kind: "note",
        text: "Payment processed",
        phase: "runtime",
        children: [
          { kind: "kv", label: "Amount", value: "$49", phase: "runtime" },
          { kind: "kv", label: "Currency", value: "USD", phase: "runtime" },
        ],
      },
    ]);
    const result = formatter.format(run);
    expect(result).toContain("> Payment processed");
    expect(result).toContain("  - **Amount:** $49");
    expect(result).toContain("  - **Currency:** USD");
  });
});
```

Note: Check the existing test file for the helper to create a run with docs. Adapt accordingly.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "doc entry children"`
Expected: FAIL

- [ ] **Step 3: Update renderDocEntry in markdown formatter**

In `packages/executable-stories-formatters/src/formatters/markdown.ts`, modify the `renderDocEntry` method to accept an `indent` parameter (default `""`) and recursively render children with increased indent:

```ts
private renderDocEntry(entry: DocEntry, indent = ""): string {
  // ... existing switch logic, prepending indent to each line ...

  if (entry.children && entry.children.length > 0) {
    const childIndent = indent + "  ";
    const childrenMd = entry.children
      .map((child) => this.renderDocEntry(child, childIndent))
      .join("\n");
    result += "\n" + childrenMd;
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "doc entry children"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/markdown.ts packages/executable-stories-formatters/test/formatters/markdown.test.ts
git commit -m "feat(markdown): render doc entry children with indentation"
```

### Task 8: Markdown formatter — update ticket rendering for NormalizedTicket

**Files:**
- Modify: `packages/executable-stories-formatters/src/formatters/markdown.ts:357-367`
- Test: `packages/executable-stories-formatters/test/formatters/markdown.test.ts`

- [ ] **Step 1: Write failing test — ticket objects in markdown**

```ts
it("should render ticket with explicit url", () => {
  const run = createTestRun({
    tickets: [{ id: "PAY-1042", url: "https://linear.app/PAY-1042" }],
  });
  const result = formatter.format(run);
  expect(result).toContain("[PAY-1042](https://linear.app/PAY-1042)");
});

it("should prefer explicit url over template", () => {
  const formatterWithTemplate = new MarkdownFormatter({
    ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
  });
  const run = createTestRun({
    tickets: [{ id: "PAY-1042", url: "https://linear.app/PAY-1042" }],
  });
  const result = formatterWithTemplate.format(run);
  expect(result).toContain("linear.app");
  expect(result).not.toContain("jira.example.com");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "ticket with explicit url"`
Expected: FAIL

- [ ] **Step 3: Update ticket rendering in markdown.ts**

Replace the ticket rendering block (around lines 357-367) with:

```ts
if (tc.story.tickets && tc.story.tickets.length > 0) {
  const ticketTemplate = this.options.ticketUrlTemplate;
  const ticketLinks = tc.story.tickets.map((t) => {
    const url = t.url ?? (ticketTemplate ? ticketTemplate.replace("{ticket}", t.id) : undefined);
    return url ? `[${t.id}](${url})` : `\`${t.id}\``;
  });
  meta.push(`Tickets: ${ticketLinks.join(", ")}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "ticket"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/markdown.ts packages/executable-stories-formatters/test/formatters/markdown.test.ts
git commit -m "feat(markdown): support NormalizedTicket objects with explicit urls"
```

### Task 9: Wire ticketUrlTemplate through CLI and options

**Files:**
- Modify: `packages/executable-stories-formatters/src/types/options.ts` (add to HTML options)
- Modify: `packages/executable-stories-formatters/src/cli.ts` (add `--html-ticket-url-template` flag)

- [ ] **Step 1: Add ticketUrlTemplate to resolved HTML options**

Read `packages/executable-stories-formatters/src/types/options.ts` to find the HTML section in `ResolvedFormatterOptions`. Add `ticketUrlTemplate?: string` to the HTML options block, mirroring how it exists for markdown.

- [ ] **Step 2: Add CLI flag**

Read `packages/executable-stories-formatters/src/cli.ts` to see the existing flag pattern. Add `--html-ticket-url-template` following the same pattern as `--html-no-mermaid` etc.

- [ ] **Step 3: Run existing tests**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/executable-stories-formatters/src/types/options.ts packages/executable-stories-formatters/src/cli.ts
git commit -m "feat(cli): add --html-ticket-url-template flag"
```

## Phase 3: JS Adapter — Vitest (reference implementation)

### Task 10: Vitest — doc methods return DocEntry and accept children

**Files:**
- Modify: `packages/executable-stories-vitest/src/story-api.ts`
- Test: `packages/executable-stories-vitest/src/__tests__/story-api.test.ts`

- [ ] **Step 1: Write failing tests**

In `packages/executable-stories-vitest/src/__tests__/story-api.test.ts`, add:

```ts
describe("doc method return values", () => {
  it("note() returns its DocEntry", () => {
    story.init(task);
    const entry = story.note("test note");
    expect(entry).toEqual({ kind: "note", text: "test note", phase: "runtime" });
  });

  it("kv() returns its DocEntry", () => {
    story.init(task);
    const entry = story.kv({ label: "key", value: "val" });
    expect(entry).toEqual({ kind: "kv", label: "key", value: "val", phase: "runtime" });
  });
});

describe("doc entry children", () => {
  it("note() with children attaches them and deduplicates", () => {
    story.init(task);
    const child = story.kv({ label: "Amount", value: "$49" });
    story.note("Payment", [child]);

    const meta = getStoryMeta(task);
    // Only note in flat array (child deduplicated)
    expect(meta.docs).toHaveLength(1);
    expect(meta.docs[0].kind).toBe("note");
    expect(meta.docs[0].children).toHaveLength(1);
    expect(meta.docs[0].children[0]).toBe(child);
  });
});
```

Note: Check the existing test file for the exact `task` mock and `getStoryMeta` helper. Adapt accordingly.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/executable-stories-vitest && pnpm test -- --run -t "doc method return"`
Expected: FAIL — methods return `void`

- [ ] **Step 3: Update doc methods to return DocEntry**

In `packages/executable-stories-vitest/src/story-api.ts`, update each doc method. Example for `note`:

```ts
function note(text: string, children?: DocEntry[]): DocEntry {
  const ctx = getContext();
  const entry: DocEntry = { kind: 'note', text, phase: 'runtime' };

  if (children && children.length > 0) {
    entry.children = children;
    // Deduplicate: remove children from flat array
    const childSet = new Set(children);
    const docs = ctx.currentStep ? ctx.currentStep.docs : ctx.meta.docs;
    if (docs) {
      const filtered = docs.filter((d) => !childSet.has(d));
      if (ctx.currentStep) {
        ctx.currentStep.docs = filtered;
      } else {
        ctx.meta.docs = filtered;
      }
    }
  }

  if (ctx.currentStep) {
    ctx.currentStep.docs ??= [];
    ctx.currentStep.docs.push(entry);
  } else {
    ctx.meta.docs ??= [];
    ctx.meta.docs.push(entry);
  }

  return entry;
}
```

Apply the same pattern to all doc methods: `kv`, `json`, `code`, `table`, `link`, `section`, `mermaid`, `screenshot`, `tag`, `custom`.

Extract the deduplication + attach logic into a helper to avoid repetition:

```ts
function attachDoc(entry: DocEntry, children?: DocEntry[]): DocEntry {
  const ctx = getContext();
  if (children && children.length > 0) {
    entry.children = children;
    const childSet = new Set(children);
    if (ctx.currentStep) {
      ctx.currentStep.docs = (ctx.currentStep.docs ?? []).filter((d) => !childSet.has(d));
    } else {
      ctx.meta.docs = (ctx.meta.docs ?? []).filter((d) => !childSet.has(d));
    }
  }
  if (ctx.currentStep) {
    ctx.currentStep.docs ??= [];
    ctx.currentStep.docs.push(entry);
  } else {
    ctx.meta.docs ??= [];
    ctx.meta.docs.push(entry);
  }
  return entry;
}
```

Then each doc method becomes:

```ts
function note(text: string, children?: DocEntry[]): DocEntry {
  return attachDoc({ kind: 'note', text, phase: 'runtime' }, children);
}

function kv(options: KvOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({ kind: 'kv', label: options.label, value: options.value, phase: 'runtime' }, children);
}
// ... etc for all doc methods
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-vitest && pnpm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-vitest/src/story-api.ts packages/executable-stories-vitest/src/__tests__/story-api.test.ts
git commit -m "feat(vitest): doc methods return DocEntry and accept children"
```

### Task 11: Vitest — step markers accept children

**Files:**
- Modify: `packages/executable-stories-vitest/src/story-api.ts:388-436`
- Test: `packages/executable-stories-vitest/src/__tests__/story-api.test.ts`

- [ ] **Step 1: Write failing test**

```ts
describe("step children", () => {
  it("given() accepts children as second param", () => {
    story.init(task);
    const child = story.kv({ label: "Card", value: "Visa" });
    story.given("a valid payment method", [child]);

    const meta = getStoryMeta(task);
    const step = meta.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs[0].kind).toBe("kv");
    // Child should not be in story-level docs
    expect(meta.docs ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-vitest && pnpm test -- --run -t "step children"`
Expected: FAIL

- [ ] **Step 3: Update step marker to accept DocEntry[] as second param**

In the `createStepMarker` function, add a new overload:

```ts
function stepMarker(text: string, children: DocEntry[]): void;
function stepMarker(text: string, docs?: StoryDocs): void;
function stepMarker<T>(text: string, body: () => T): T;
function stepMarker<T>(text: string, docsOrBodyOrChildren?: StoryDocs | (() => T) | DocEntry[]): T | void {
  const ctx = getContext();
  const isCallback = typeof docsOrBodyOrChildren === 'function';
  const isChildren = Array.isArray(docsOrBodyOrChildren);

  // ... existing keyword resolution ...

  let stepDocs: DocEntry[] = [];
  if (isChildren) {
    // Attach children directly as step docs; deduplicate from story-level
    stepDocs = docsOrBodyOrChildren;
    const childSet = new Set(docsOrBodyOrChildren);
    ctx.meta.docs = (ctx.meta.docs ?? []).filter((d) => !childSet.has(d));
  } else if (!isCallback && docsOrBodyOrChildren) {
    stepDocs = convertStoryDocsToEntries(docsOrBodyOrChildren as StoryDocs);
  }

  const step: StoryStep = {
    id: `step-${ctx.stepCounter++}`,
    keyword: resolvedKeyword,
    text,
    docs: stepDocs,
    ...(isCallback ? { wrapped: true } : {}),
  };

  // ... rest unchanged ...
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-vitest && pnpm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-vitest/src/story-api.ts packages/executable-stories-vitest/src/__tests__/story-api.test.ts
git commit -m "feat(vitest): step markers accept DocEntry[] children"
```

### Task 12: Vitest — update ticket normalization for objects

**Files:**
- Modify: `packages/executable-stories-vitest/src/story-api.ts` (normalizeTickets)
- Modify: `packages/executable-stories-vitest/src/types.ts` (StoryOptions.ticket type)
- Test: `packages/executable-stories-vitest/src/__tests__/story-api.test.ts`

- [ ] **Step 1: Write failing test**

```ts
describe("ticket objects", () => {
  it("normalizes ticket object with url", () => {
    story.init(task, {
      ticket: { id: "PAY-1042", url: "https://linear.app/PAY-1042" },
    });
    const meta = getStoryMeta(task);
    expect(meta.tickets).toEqual([{ id: "PAY-1042", url: "https://linear.app/PAY-1042" }]);
  });

  it("normalizes mixed string and object tickets", () => {
    story.init(task, {
      ticket: ["JIRA-100", { id: "PAY-1042", url: "https://linear.app/PAY-1042" }],
    });
    const meta = getStoryMeta(task);
    expect(meta.tickets).toEqual([
      { id: "JIRA-100" },
      { id: "PAY-1042", url: "https://linear.app/PAY-1042" },
    ]);
  });

  it("normalizes plain string ticket to object", () => {
    story.init(task, { ticket: "JIRA-123" });
    const meta = getStoryMeta(task);
    expect(meta.tickets).toEqual([{ id: "JIRA-123" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-vitest && pnpm test -- --run -t "ticket objects"`
Expected: FAIL

- [ ] **Step 3: Update types and normalizeTickets**

In `packages/executable-stories-vitest/src/types.ts`, update:

```ts
import type { NormalizedTicket } from "executable-stories-formatters";

export type TicketInput = string | { id: string; url?: string };

export interface StoryOptions {
  tags?: string[];
  ticket?: TicketInput | TicketInput[];
  meta?: Record<string, unknown>;
  traceUrlTemplate?: string;
}
```

In `packages/executable-stories-vitest/src/story-api.ts`, update `normalizeTickets`:

```ts
function normalizeTickets(ticket: TicketInput | TicketInput[] | undefined): NormalizedTicket[] | undefined {
  if (!ticket) return undefined;
  const arr = Array.isArray(ticket) ? ticket : [ticket];
  return arr.map((t) => (typeof t === "string" ? { id: t } : t));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-vitest && pnpm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-vitest/src/story-api.ts packages/executable-stories-vitest/src/types.ts packages/executable-stories-vitest/src/__tests__/story-api.test.ts
git commit -m "feat(vitest): tickets accept string or {id, url} objects"
```

## Phase 4: JS Adapters — Jest, Playwright, Cypress

### Task 13: Jest — doc methods return DocEntry, accept children, ticket objects

**Files:**
- Modify: `packages/executable-stories-jest/src/story-api.ts`
- Modify: `packages/executable-stories-jest/src/types.ts`
- Test: `packages/executable-stories-jest/src/__tests__/story-api.test.ts`

Apply the exact same changes as Vitest (Tasks 10-12) to the Jest adapter:

- [ ] **Step 1: Write failing tests** — doc return values, children, deduplication, ticket objects
- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/executable-stories-jest && pnpm test -- --run -t "doc method return|children|ticket objects"`

- [ ] **Step 3: Implement changes**

Same pattern as Vitest:
1. Extract `attachDoc` helper that returns entry and deduplicates children
2. Update all doc methods to call `attachDoc` and return `DocEntry`
3. Update `createStepMarker` to accept `DocEntry[]`
4. Update `normalizeTickets` and `StoryOptions.ticket` type for objects
5. Export `TicketInput` type

Key difference from Vitest: Jest's step markers use `expect.getState()` not task. The step creation pattern is the same though.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-jest && pnpm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-jest/src/story-api.ts packages/executable-stories-jest/src/types.ts packages/executable-stories-jest/src/__tests__/story-api.test.ts
git commit -m "feat(jest): doc methods return DocEntry, accept children, ticket objects"
```

### Task 14: Playwright — doc methods return DocEntry, accept children, ticket objects

**Files:**
- Modify: `packages/executable-stories-playwright/src/story-api.ts`
- Modify: `packages/executable-stories-playwright/src/types.ts`
- Test: `packages/executable-stories-playwright/src/__tests__/story-api.test.ts`

Apply the exact same changes as Vitest (Tasks 10-12) to the Playwright adapter:

- [ ] **Step 1: Write failing tests** — doc return values, children, deduplication, ticket objects
- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/executable-stories-playwright && pnpm test -- --run -t "doc method return|children|ticket objects"`

- [ ] **Step 3: Implement changes**

Same pattern as Vitest. Key Playwright differences:
- Steps accept Playwright fixtures as callback args — the `DocEntry[]` overload must not conflict
- `story.init` has flexible param ordering — ensure ticket normalization works in all overloads

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-playwright && pnpm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-playwright/src/story-api.ts packages/executable-stories-playwright/src/types.ts packages/executable-stories-playwright/src/__tests__/story-api.test.ts
git commit -m "feat(playwright): doc methods return DocEntry, accept children, ticket objects"
```

### Task 15: Cypress — doc methods return DocEntry, accept children, ticket objects

**Files:**
- Modify: `packages/executable-stories-cypress/src/story-api.ts`
- Modify: `packages/executable-stories-cypress/src/types.ts`
- Test: `packages/executable-stories-cypress/src/__tests__/story-api.test.ts`

Apply the exact same changes as Vitest (Tasks 10-12) to the Cypress adapter:

- [ ] **Step 1: Write failing tests** — doc return values, children, deduplication, ticket objects
- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/executable-stories-cypress && pnpm test -- --run -t "doc method return|children|ticket objects"`

- [ ] **Step 3: Implement changes**

Same pattern as Vitest. Cypress differences:
- Uses `Cypress.currentTest` not task
- `getAndClearMeta()` exports context for the support file — ensure children survive serialization

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-cypress && pnpm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-cypress/src/story-api.ts packages/executable-stories-cypress/src/types.ts packages/executable-stories-cypress/src/__tests__/story-api.test.ts
git commit -m "feat(cypress): doc methods return DocEntry, accept children, ticket objects"
```

## Phase 5: Language Packages

### Task 16: Go — add children to DocEntry and ticket objects

**Files:**
- Modify: `packages/executable-stories-go/doc.go`
- Modify: `packages/executable-stories-go/types.go`
- Modify: `packages/executable-stories-go/story.go`
- Test: `packages/executable-stories-go/story_test.go`

- [ ] **Step 1: Write failing tests**

In `packages/executable-stories-go/story_test.go`, add:

```go
func TestDocEntryChildren(t *testing.T) {
	coll := es.NewCollector()
	s := es.Init(t, "nested docs", es.WithCollector(coll))

	child := s.Kv("Amount", "$49")
	s.Note("Payment", child)

	// Verify JSON output has children
	tc := coll.TestCases()[0]
	docs := tc.Story.Docs
	if len(docs) != 1 {
		t.Fatalf("expected 1 top-level doc, got %d", len(docs))
	}
	children, ok := docs[0]["children"].([]es.DocEntry)
	if !ok || len(children) != 1 {
		t.Fatal("expected 1 child on note")
	}
}

func TestTicketObjects(t *testing.T) {
	coll := es.NewCollector()
	s := es.Init(t, "ticket urls",
		es.WithCollector(coll),
		es.WithTicketURL("PAY-1042", "https://linear.app/PAY-1042"),
	)
	_ = s

	tc := coll.TestCases()[0]
	tickets := tc.Story.Tickets
	if len(tickets) != 1 {
		t.Fatalf("expected 1 ticket, got %d", len(tickets))
	}
}
```

Note: Check the existing Go test patterns — `es.NewCollector()` and `es.WithCollector(coll)` may not exist. Adapt to whatever pattern the tests use. The Go tests may need to read JSON output instead.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-go && go test -v -run TestDocEntryChildren`
Expected: FAIL

- [ ] **Step 3: Implement changes**

**doc.go** — Update all entry factory functions to optionally accept children:

```go
// noteEntry creates a DocEntry of kind "note" with optional children.
func noteEntry(text string, children ...DocEntry) DocEntry {
	entry := DocEntry{
		"kind":  "note",
		"text":  text,
		"phase": "runtime",
	}
	if len(children) > 0 {
		entry["children"] = children
	}
	return entry
}
```

Apply to all factory functions. Each takes variadic `...DocEntry` as last param.

**story.go** — Update the public doc methods to accept and pass children:

```go
func (s *S) Note(text string, children ...DocEntry) DocEntry {
	entry := noteEntry(text, children...)
	s.attachDoc(entry, children)
	return entry
}
```

Add `attachDoc` method that pushes to the right array and deduplicates:

```go
func (s *S) attachDoc(entry DocEntry, children []DocEntry) {
	if len(children) > 0 {
		childSet := make(map[*DocEntry]bool)
		// ... reference-based dedup
	}
	// ... push to s.docs or s.currentStep.Docs
}
```

Note: Go uses `map[string]any` for DocEntry, so reference identity works on the map pointer. However, since Go copies maps by reference, dedup via pointer comparison works only if entries are not copied. Check the existing pattern — if entries are appended by value, the dedup approach needs adjustment. An alternative: use a "claimed" flag in the entry, e.g., `entry["_parent"] = true`, then filter on that.

**types.go** — Update ticket types:

```go
// TicketEntry can be a string or an object with id and url.
// For JSON serialization, use the Ticket struct when url is needed.
type Ticket struct {
	ID  string `json:"id"`
	URL string `json:"url,omitempty"`
}
```

Update `StoryMeta.Tickets` to `[]any` to support both strings and objects, or use a custom type with MarshalJSON. The simplest approach: change to `[]Ticket` and always normalize strings to `Ticket{ID: s}`.

Add `WithTicketURL` option:

```go
func WithTicketURL(id, url string) Option {
	return func(s *S) {
		s.tickets = append(s.tickets, Ticket{ID: id, URL: url})
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-go && go test -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-go/
git commit -m "feat(go): doc entry children and ticket URL objects"
```

### Task 17: Rust — add children to DocEntry and ticket objects

**Files:**
- Modify: `packages/executable-stories-rust/src/doc_entry.rs`
- Modify: `packages/executable-stories-rust/src/types.rs`
- Modify: `packages/executable-stories-rust/src/story.rs`
- Test: `packages/executable-stories-rust/tests/story_api_test.rs`

- [ ] **Step 1: Write failing test**

In `packages/executable-stories-rust/tests/story_api_test.rs`, add:

```rust
#[test]
fn doc_entry_with_children_serializes() {
    let child = DocEntry::kv("Amount", serde_json::json!("$49"));
    let parent = DocEntry::note("Payment").with_children(vec![child]);
    let json = serde_json::to_value(&parent).unwrap();
    assert_eq!(json["kind"], "note");
    assert!(json["children"].is_array());
    assert_eq!(json["children"][0]["kind"], "kv");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-rust && cargo test doc_entry_with_children_serializes`
Expected: FAIL — `with_children` not found

- [ ] **Step 3: Implement changes**

**doc_entry.rs** — The `DocEntry` wraps a `HashMap<String, serde_json::Value>`. Add:

```rust
impl DocEntry {
    /// Add children to this doc entry.
    #[must_use]
    pub fn with_children(mut self, children: Vec<DocEntry>) -> Self {
        if !children.is_empty() {
            let child_values: Vec<serde_json::Value> = children
                .into_iter()
                .map(|c| serde_json::to_value(c).unwrap())
                .collect();
            self.0.insert("children".to_string(), serde_json::Value::Array(child_values));
        }
        self
    }
}
```

**types.rs** — Add Ticket struct:

```rust
#[derive(Clone, Serialize)]
pub struct Ticket {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
```

Update `StoryMeta` to use `Vec<Ticket>` for tickets.

**story.rs** — Update doc methods to return `DocEntry`:

```rust
pub fn note(&mut self, text: &str) -> DocEntry {
    let entry = DocEntry::note(text);
    self.attach_doc(entry.clone());
    entry
}
```

Add `with_ticket_url` method:

```rust
pub fn with_ticket_url(id: &str, url: &str) -> Ticket {
    Ticket { id: id.to_string(), url: Some(url.to_string()) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-rust && cargo test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-rust/
git commit -m "feat(rust): doc entry children and ticket URL objects"
```

### Task 18: Python (pytest) — add children to doc entries and ticket objects

**Files:**
- Modify: `packages/executable-stories-pytest/src/executable_stories/_types.py`
- Modify: `packages/executable-stories-pytest/src/executable_stories/_story_api.py`
- Test: `packages/executable-stories-pytest/tests/test_story_api.py`

- [ ] **Step 1: Write failing test**

In `packages/executable-stories-pytest/tests/test_story_api.py`, add:

```python
def test_note_with_children():
    story.init("nested docs")
    child = story.kv("Amount", "$49")
    parent = story.note("Payment", children=[child])

    assert parent["kind"] == "note"
    assert len(parent["children"]) == 1
    assert parent["children"][0]["kind"] == "kv"


def test_ticket_object_with_url():
    story.init("ticket test", ticket=[{"id": "PAY-1042", "url": "https://linear.app/PAY-1042"}])
    meta = story._get_meta()
    assert meta["tickets"] == [{"id": "PAY-1042", "url": "https://linear.app/PAY-1042"}]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-pytest && python -m pytest tests/test_story_api.py -k "test_note_with_children" -v`
Expected: FAIL

- [ ] **Step 3: Implement changes**

**_types.py** — Add `children` to each TypedDict:

```python
class NoteDoc(TypedDict):
    kind: str
    text: str
    phase: str
    children: NotRequired[list["DocEntry"]]

# Same for all other doc types...

class TicketDoc(TypedDict):
    id: str
    url: NotRequired[str]
```

**_story_api.py** — Update doc methods to return the entry and accept children:

```python
def note(self, text: str, children: list | None = None) -> dict:
    entry: dict = {"kind": "note", "text": text, "phase": "runtime"}
    if children:
        entry["children"] = children
        self._dedup_children(children)
    self._attach_doc(entry)
    return entry
```

Update `normalizeTickets` to handle objects:

```python
def _normalize_tickets(self, ticket):
    if ticket is None:
        return None
    if not isinstance(ticket, list):
        ticket = [ticket]
    return [{"id": t} if isinstance(t, str) else t for t in ticket]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-pytest && python -m pytest tests/ -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-pytest/
git commit -m "feat(pytest): doc entry children and ticket URL objects"
```

### Task 19: JUnit5 (Kotlin) — add children and ticket objects (devcontainer)

**Requires:** devcontainer at `/Users/jreehal/dev/js/executable-stories/.devcontainer`

**Files:**
- Modify: `packages/executable-stories-junit5/src/main/kotlin/dev/executablestories/junit5/DocEntry.kt`
- Modify: `packages/executable-stories-junit5/src/main/kotlin/dev/executablestories/junit5/StoryMeta.kt`
- Modify: `packages/executable-stories-junit5/src/main/kotlin/dev/executablestories/junit5/Story.kt`
- Test: `packages/executable-stories-junit5/src/test/kotlin/dev/executablestories/junit5/StoryApiTest.kt`

- [ ] **Step 1: Write failing test**

```kotlin
@Test
fun `doc entry with children serializes correctly`() {
    val child = DocEntry.kv("Amount", "$49")
    val parent = DocEntry.note("Payment", listOf(child))
    val json = objectMapper.writeValueAsString(parent)
    assertTrue(json.contains("\"children\""))
    assertTrue(json.contains("\"Amount\""))
}

@Test
fun `ticket object with url`() {
    Story.init("ticket test", ticket = listOf(Ticket("PAY-1042", "https://linear.app/PAY-1042")))
    val meta = Story.getMeta()
    assertEquals("PAY-1042", meta.tickets?.first()?.id)
    assertEquals("https://linear.app/PAY-1042", meta.tickets?.first()?.url)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-junit5 && ./gradlew test --tests "*doc entry with children*"`
Expected: FAIL

- [ ] **Step 3: Implement changes**

**DocEntry.kt** — Add children parameter to factory methods. DocEntry uses mutable maps, so add:

```kotlin
companion object {
    fun note(text: String, children: List<DocEntry>? = null): DocEntry {
        val entry = DocEntry()
        entry["kind"] = "note"
        entry["text"] = text
        entry["phase"] = "runtime"
        if (!children.isNullOrEmpty()) entry["children"] = children
        return entry
    }
    // ... same for all other factory methods
}
```

**StoryMeta.kt** — Add `Ticket` data class and update tickets type:

```kotlin
data class Ticket(
    val id: String,
    val url: String? = null
)
```

**Story.kt** — Update doc methods to return DocEntry, accept children, update ticket handling.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-junit5 && ./gradlew test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-junit5/
git commit -m "feat(junit5): doc entry children and ticket URL objects"
```

### Task 20: xUnit (C#) — add children and ticket objects (devcontainer)

**Requires:** devcontainer at `/Users/jreehal/dev/js/executable-stories/.devcontainer`

**Files:**
- Modify: `packages/executable-stories-xunit/ExecutableStories.Xunit/DocEntry.cs`
- Modify: `packages/executable-stories-xunit/ExecutableStories.Xunit/StoryMeta.cs`
- Modify: `packages/executable-stories-xunit/ExecutableStories.Xunit/Story.cs`
- Test: `packages/executable-stories-xunit/ExecutableStories.Xunit.Tests/StoryApiTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
[Fact]
public void DocEntryWithChildrenSerializes()
{
    var child = DocEntry.Kv("Amount", "$49");
    var parent = DocEntry.Note("Payment", new[] { child });
    var json = JsonSerializer.Serialize(parent);
    Assert.Contains("children", json);
    Assert.Contains("Amount", json);
}

[Fact]
public void TicketObjectWithUrl()
{
    Story.Init(ticket: new[] { new Ticket("PAY-1042", "https://linear.app/PAY-1042") });
    var meta = Story.GetMeta();
    Assert.Equal("PAY-1042", meta.Tickets[0].Id);
    Assert.Equal("https://linear.app/PAY-1042", meta.Tickets[0].Url);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-xunit && dotnet test --filter "DocEntryWithChildrenSerializes"`
Expected: FAIL

- [ ] **Step 3: Implement changes**

**DocEntry.cs** — Add children parameter to factory methods:

```csharp
public static DocEntry Note(string text, DocEntry[]? children = null)
{
    var entry = new DocEntry
    {
        ["kind"] = "note",
        ["text"] = text,
        ["phase"] = "runtime"
    };
    if (children is { Length: > 0 })
        entry["children"] = children;
    return entry;
}
```

**StoryMeta.cs** — Add Ticket record and update Tickets property:

```csharp
public record Ticket(string Id, string? Url = null);
```

**Story.cs** — Update doc methods to return DocEntry, accept children, update ticket handling.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-xunit && dotnet test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-xunit/
git commit -m "feat(xunit): doc entry children and ticket URL objects"
```

## Phase 6: Schema Examples & Validation

### Task 21: Update schema example JSON files

**Files:**
- Modify: `packages/executable-stories-formatters/schemas/examples/full.json`
- Modify: `packages/executable-stories-formatters/schemas/examples/junit5.json`
- Modify: `packages/executable-stories-formatters/schemas/examples/go.json`
- Modify: `packages/executable-stories-formatters/schemas/examples/dotnet.json`
- Modify: `packages/executable-stories-formatters/schemas/examples/rust.json`
- Modify: `packages/executable-stories-formatters/schemas/examples/pytest.json`

- [ ] **Step 1: Add children example to full.json**

In one test case in `full.json`, add a story-level doc entry with children:

```json
{
  "kind": "note",
  "text": "Payment details",
  "phase": "runtime",
  "children": [
    { "kind": "kv", "label": "Amount", "value": "$49.00", "phase": "runtime" },
    { "kind": "kv", "label": "Currency", "value": "USD", "phase": "runtime" }
  ]
}
```

- [ ] **Step 2: Add ticket object examples**

In each example file, update at least one `tickets` array to include an object:

```json
"tickets": [
  { "id": "JIRA-123" },
  { "id": "PAY-1042", "url": "https://linear.app/PAY-1042" }
]
```

- [ ] **Step 3: Run schema validation**

Run: `cd packages/executable-stories-formatters && pnpm test -- --run -t "validate"`
Expected: PASS — all examples validate against updated schema

- [ ] **Step 4: Commit**

```bash
git add packages/executable-stories-formatters/schemas/examples/
git commit -m "docs(schema): add children and ticket object examples"
```

## Phase 7: Integration & Quality Gate

### Task 22: Run full quality gate

- [ ] **Step 1: Build all packages**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any issues)

- [ ] **Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS (fix any issues)

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Run full quality gate**

Run: `pnpm quality`
Expected: PASS

- [ ] **Step 6: Commit any fixes**

```bash
git add -u
git commit -m "fix: resolve lint and type-check issues from nested doc entries"
```

### Task 23: Update example apps

**Files:**
- Modify: `apps/vitest-example/` — add a story test using children
- Modify: `apps/jest-example/` — add a story test using children
- Modify: `apps/playwright-example/` — add a story test using children

- [ ] **Step 1: Add example story with nested docs to vitest-example**

Find an existing story test file and add a new test demonstrating children:

```ts
it('processes a payment with nested docs', ({ task }) => {
  story.init(task, {
    ticket: [{ id: 'PAY-1042', url: 'https://linear.app/PAY-1042' }],
  });

  story.note('Payment processed successfully.', [
    story.kv({ label: 'Amount', value: '$49.00' }),
    story.kv({ label: 'Currency', value: 'USD' }),
    story.kv({ label: 'Method', value: 'Visa •••• 4242' }),
  ]);

  story.given('a customer with items in their cart');
  story.when('they confirm the purchase');
  story.then('the payment is authorised');

  expect(true).toBe(true);
});
```

- [ ] **Step 2: Run example app tests**

Run: `cd apps/vitest-example && pnpm test -- --run`
Expected: PASS

- [ ] **Step 3: Repeat for jest-example and playwright-example**

Add similar example tests adapted to each framework's API.

- [ ] **Step 4: Commit**

```bash
git add apps/vitest-example/ apps/jest-example/ apps/playwright-example/
git commit -m "docs(examples): add nested doc entry and ticket URL examples"
```

### Task 24: Verify rendered output in live demo

- [ ] **Step 1: Update the live demo test**

In `/Users/jreehal/dev/js/executable-stories-live-demo/src/demo.story.test.ts`, update to use children:

```ts
story.note(
  'A customer completes checkout and a payment is processed successfully.',
  [
    story.kv({ label: 'Amount', value: '$49.00' }),
    story.kv({ label: 'Currency', value: 'USD' }),
    story.kv({ label: 'Method', value: 'Visa •••• 4242' }),
  ],
);
```

- [ ] **Step 2: Run live demo and verify HTML output**

Run the live demo with hot reload and verify:
- Children render indented under their parent note with a left border
- Tickets render as hyperlinks if URL provided
- No duplicate entries in the flat output

- [ ] **Step 3: Commit (in live-demo repo)**

```bash
cd /Users/jreehal/dev/js/executable-stories-live-demo
git add src/demo.story.test.ts
git commit -m "demo: use nested doc entries"
```

### Task 25: Final quality gate

- [ ] **Step 1: Run pnpm quality from repo root**

Run: `pnpm quality`
Expected: PASS

- [ ] **Step 2: Verify no regressions**

Run: `pnpm test -- --run`
Expected: All tests pass, no regressions

- [ ] **Step 3: Final commit if needed**

Clean up any remaining issues and commit.
