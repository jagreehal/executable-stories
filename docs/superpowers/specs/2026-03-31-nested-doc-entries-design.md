# Nested Doc Entries & Ticket URL Improvements

**Date:** 2026-03-31
**Status:** Draft
**Breaking change:** Yes (no external users)

## Problem

Doc entries render as flat siblings. When a user writes:

```ts
story.note('A customer completes checkout and payment is processed.');
story.kv({ label: 'Amount', value: '$49.00' });
story.kv({ label: 'Currency', value: 'USD' });
story.kv({ label: 'Method', value: 'Visa •••• 4242' });
```

The HTML output places each entry at the same level. Nothing connects the KVs to the note. The user intended a group — the renderer produces a guess.

A secondary problem: tickets render as plain text in HTML even though the Markdown formatter already supports `ticketUrlTemplate` for hyperlinks. Users also lack a way to provide a URL directly per ticket.

## Design

### Part 1: Nested Doc Entries

#### API Change

Every doc method (`note`, `kv`, `code`, `json`, `table`, `link`, `section`, `mermaid`, `screenshot`, `custom`, `tag`) changes in two ways:

1. **Returns** its `DocEntry` (currently returns `void`)
2. **Accepts an optional final parameter**: `DocEntry[]` — children

```ts
// Standalone (unchanged behavior, now also returns the entry)
story.note('Payment processed.');

// With children
story.note('Payment processed.', [
  story.kv({ label: 'Amount', value: '$49.00' }),
  story.kv({ label: 'Currency', value: 'USD' }),
  story.kv({ label: 'Method', value: 'Visa •••• 4242' }),
]);

// Steps accept children too
story.given('a valid payment method', [
  story.kv({ label: 'Card', value: 'Visa •••• 4242' }),
  story.code({ label: 'Request', content: '...', lang: 'json' }),
]);

// Recursive nesting
story.section({ title: 'Payment Details', markdown: '...' }, [
  story.table({ label: 'Line items', columns: ['Item', 'Price'], rows: [['Widget', '$39']] }),
  story.note('All amounts in USD', [
    story.kv({ label: 'Tax rate', value: '8.5%' }),
  ]),
]);
```

#### Data Model

`DocEntry` gains an optional `children` field on every variant:

```ts
type DocEntry =
  | { kind: "note"; text: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "kv"; label: string; value: unknown; phase: DocPhase; children?: DocEntry[] }
  | { kind: "code"; label: string; content: string; lang?: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "table"; label: string; columns: string[]; rows: string[][]; phase: DocPhase; children?: DocEntry[] }
  | { kind: "link"; label: string; url: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "section"; title: string; markdown: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "mermaid"; code: string; title?: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "screenshot"; path: string; alt?: string; phase: DocPhase; children?: DocEntry[] }
  | { kind: "custom"; type: string; data: unknown; phase: DocPhase; children?: DocEntry[] }
  | { kind: "tag"; names: string[]; phase: DocPhase; children?: DocEntry[] }
```

#### Deduplication

Doc methods always push to the flat array AND return the entry. When a parent receives children, it strips those children from the flat array so they appear only nested under the parent. No duplicates in rendered output.

**Mechanism:** Each `DocEntry` gets an internal identity (object reference). The parent's push logic filters the flat array, removing any entry whose reference matches a child. This happens at the adapter level in the story API — formatters receive a clean tree.

#### StoryStep Children

Steps (`given`, `when`, `then`, `and`, `but` and aliases) accept an optional `DocEntry[]` as a final parameter:

```ts
story.given('a customer with items in their cart', [
  story.kv({ label: 'Items', value: 3 }),
  story.kv({ label: 'Total', value: '$49.00' }),
]);
```

These entries attach to `StoryStep.docs` as children of that step. The same deduplication applies.

#### HTML Rendering

Children render with a left-border grouping — subtle indent, no heavy card nesting. CSS:

```css
.doc-children {
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 2px solid var(--border-color, #e2e8f0);
}
```

The `renderDocEntry` function calls itself recursively for children, wrapping them in a `.doc-children` container.

#### Markdown Rendering

Children render indented under their parent. Each child gains one level of indentation (2 spaces for list items, extra `>` for blockquotes).

#### Other Formatters

- **JUnit XML:** Children serialized as nested properties within the parent's test case properties
- **Cucumber JSON/HTML/Messages:** Children mapped to embedded doc strings or nested step arguments where the format supports it; flattened with parent prefix where it does not

### Part 2: Ticket URL Improvements

#### HTML Formatter: Use ticketUrlTemplate

The HTML formatter renders tickets as `<a>` tags when `ticketUrlTemplate` is configured, matching the Markdown formatter's existing behavior:

```html
<!-- With template: "https://jira.example.com/browse/{ticket}" -->
<a href="https://jira.example.com/browse/PAY-1042" target="_blank" rel="noopener noreferrer">PAY-1042</a>

<!-- Without template -->
<span class="ticket">PAY-1042</span>
```

#### Ticket API: Accept Objects

The `ticket` option accepts strings, objects, or a mix:

```ts
type TicketInput = string | { id: string; url: string };

interface StoryOptions {
  ticket?: TicketInput | TicketInput[];
  // ...existing fields
}
```

Examples:

```ts
// String (existing, uses template if configured)
story.init(task, { ticket: 'PAY-1042' });

// Object with explicit URL (ignores template)
story.init(task, { ticket: { id: 'PAY-1042', url: 'https://linear.app/team/PAY-1042' } });

// Mixed
story.init(task, { ticket: [
  'JIRA-100',
  { id: 'PAY-1042', url: 'https://linear.app/team/PAY-1042' },
] });
```

#### Normalized Type

Internally, tickets normalize to:

```ts
interface NormalizedTicket {
  id: string;
  url?: string;
}
```

The `StoryMeta.tickets` field changes from `string[]` to `NormalizedTicket[]`. All formatters update to use this type.

#### Rendering Priority

1. If the ticket has an explicit `url`, use it
2. Else if `ticketUrlTemplate` is configured, generate the URL
3. Else render as plain text

## Scope

### Packages Affected

**JS Adapters (story API + types):**
- `executable-stories-vitest`
- `executable-stories-jest`
- `executable-stories-playwright`
- `executable-stories-cypress`

**Language Packages (story API + types):**
- `executable-stories-go`
- `executable-stories-rust`
- `executable-stories-pytest`
- `executable-stories-junit5`
- `executable-stories-xunit`

**Formatters:**
- `executable-stories-formatters` (HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages)

**Example Apps:**
- `vitest-example`, `jest-example`, `playwright-example`, `cypress-example`

**Docs Site:**
- Update API documentation for all adapters

### Tests

Every package needs tests covering:
- Doc methods return `DocEntry`
- Children parameter accepted and attached
- Deduplication removes children from flat array
- Recursive nesting works
- HTML renders children with left-border grouping
- Markdown renders children indented
- Ticket objects render as hyperlinks in HTML and Markdown
- Ticket string + template renders as hyperlinks in HTML
- Mixed ticket arrays (strings and objects) normalize correctly
- Backward compatibility: standalone calls without children still work

## Non-Goals

- Drag-and-drop reordering of doc entries in HTML
- Collapsible/expandable children in HTML (could add later)
- Max nesting depth enforcement (trust the user)
