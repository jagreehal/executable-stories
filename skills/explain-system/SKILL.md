---
name: explain-system
description: Use when someone needs to understand a whole system or feature area rather than a single change — onboarding a new joiner, handing over ownership, briefing a stakeholder, or an agent orienting in an unfamiliar repo. Derives the explanation from what the suite verifiably does, so the document cannot describe behaviour the system does not have.
---

# Explain System

Onboarding documents are written by whoever understands the system least recently. They
describe an architecture that was true at the time, they get read once by each new joiner,
and nobody notices when they stop being true because nothing checks.

An explanation built from the run has a property that a hand-written one cannot: every
behavioural claim in it either cites a scenario that executed, or is visibly marked as
unverified. The reader can tell which parts of the document are load-bearing.

This is the sibling of `explain-change`. That one explains a diff to someone who was away
for a week. This one explains an area to someone who has never seen it.

## Agent guardrails

- **Derive the map from the run, not the folder structure.** A directory tree tells you how
  the code was filed. The scenario index tells you what it does, which is what the reader
  asked.
- **Never state a behaviour with no scenario behind it.** Write "not covered by a scenario"
  and leave the gap visible. A confident sentence about unverified behaviour is the exact
  failure this replaces.
- **Mark everything you inferred.** Any block you drew from reading code carries
  `authored: "agent"`, which renders as "AI-authored, not verified by a run".
- **Do not restate the scenarios in prose.** Embed them. A transcribed scenario is a second
  copy that will disagree with the first.

## Ground in artifacts, in this order

```bash
executable-stories format reports/raw-run.json --preset agent --output-dir reports --output-name index
executable-stories list reports/raw-run.json --list-format json
```

1. **Feature summary** for the shape: which areas exist and how healthy each is.
2. **Scenario index** for the behaviour: the capability map is the `capability:` tags, the
   flows are the `journey:` tags, and the scenario titles are the sentences the system can
   truthfully say about itself.
3. **Behavior manifest** for the seams: source files, tags, doc coverage, and debugger
   warnings, which is where the untested edges show.
4. **The code, last.** Only to explain *how* the verified behaviour is achieved. Reading it
   first is how you end up documenting an abstraction nobody exercises.

If the area has almost no scenarios, say so and stop. The honest output is "this area has
four scenarios covering login and nothing else; here is what I could verify and here is
what I could not", which is more useful than a plausible essay.

## Structure

Five sections. Intuition before detail throughout, and the reader who stops after section
two should still be able to say what the system does.

### 1. What it is for

One paragraph. The problem this area solves, in the domain's own vocabulary
(`spec-domain-language`). No architecture, no components, no nouns from the codebase that
a stakeholder would not recognise.

### 2. What it verifiably does

The capability map, grouped by `capability:` tag, one line per capability with its
scenario count and status. This is the section that cannot be written wrong, because it is
a projection of the run.

Then the two or three flows that matter, embedded rather than described:

```mdx
<StoryJourney id="guest-checkout" />
```

A journey page already renders the member scenarios in order with their screenshots and an
aggregate status. Nothing you write in prose will beat it.

### 3. How it hangs together

Now the code, and only what a reader needs to navigate it. Reach for a block rather than
prose for the shapes prose handles badly:

| Shape | Use |
| --- | --- |
| Flow, sequence, state machine | `story.mermaid({ code, title })` |
| Where things live | `story.custom({ type: 'file-tree', data })` |
| The records and their fields | `story.custom({ type: 'data-model', data })` |
| HTTP surface | `executable-stories import-openapi` |
| Example values | `story.state`, `story.table` |

```ts
story.custom({
  type: 'file-tree',
  data: {
    authored: 'agent',
    title: 'Checkout',
    files: [
      { path: 'src/checkout/guard.ts', note: 'eligibility rules' },
      { path: 'src/checkout/totals.ts', note: 'pricing' },
    ],
  },
});
```

Every one of these is drawn from reading code, so every one carries `authored: "agent"`.
Left unmarked, an inferred diagram sits beside an executed scenario looking equally
trustworthy, and the report quietly becomes a place where confident pictures of unverified
claims live.

### 4. The rules that are easy to get wrong

The invariants a newcomer will breach in their first week. Each one cites the scenario that
enforces it, so the reader can go and read the proof. An invariant with no scenario behind
it is the most valuable line in the document, because it is a gap somebody should close:

> Refunds never move the ledger balance twice. Enforced by
> *"refund is rejected when the payment was already reversed"*.
> **Not covered by a scenario**: refunds against a closed account. Behaviour unknown.

### 5. Where it is thin

Planned scenarios, `known-issue` tags, capabilities with no coverage, areas with failing
scenarios. Write this section from the artifacts and resist softening it. A new joiner who
knows which corners are unverified is far more useful in month one than one who trusts the
whole thing.

Optionally close with a short comprehension quiz, five multiple-choice questions at medium
difficulty, if the document is for onboarding rather than reference. Keep every option for
a question the same rough length so formatting leaks no clues.

## Where it goes

Same order of preference as any explainer:

1. **Docs site** (`living-docs-site`): `src/content/docs/explainers/<slug>.md`, with the
   explainer v1 frontmatter so it can be detected as stale. Copy `id`, `title`, and `hash`
   verbatim from the scenario index; always quote the hash.
2. **Attached to a story** via `story.section`, `story.mermaid`, and `story.html` when the
   explanation is about one capability and belongs next to it.
3. **A file in `reports/explainers/`** when there is no site. Never a global temp
   directory: an explanation of a system that lives in `/tmp` is a throwaway, and this one
   is meant to be read next year.

Then wire the staleness check, or none of the above matters:

```bash
executable-stories check-explainers reports/raw-run.json --explainers-dir story-docs/src/content/docs/explainers
```

Exit 5 when a cited scenario changed, was renamed, or vanished. That is the whole
difference between this document and the onboarding wiki it replaces.

## Style

Write like a well-edited engineering book: plain declarative sentences, sections that lead
into each other, no filler. The reader is a competent engineer who has never seen this
area. One long page with headings and a short table of contents; no tabs, no ASCII art,
and no interactive figure unless fiddling with it teaches something a static picture
cannot.

## Relationship to neighbouring skills

- `explain-change` explains a diff. Same evidence discipline, different scope. Link them
  when a change lands in an area this document covers.
- `living-docs-site` is where the document is published and how it stays checkable.
- `spec-domain-language` supplies the vocabulary; write the whole thing in it.
- `coverage-audit` produces section 5 in more depth when the gaps are the point.
- `executable-lessons` takes over when the reader needs to practise rather than read.
