---
name: explain-change
description: Use when the user asks for a rich explanation of a code change, diff, branch, or PR in a repo that uses executable-stories. Produces an explainer that is part of the living documentation — grounded in run artifacts, published next to the stories, and finished with a comprehension quiz — instead of a throwaway HTML file.
---

# Explain Change

Make a rich explanation of a code change that becomes **part of the executable-stories
output**, not a file that rots in `/tmp`.

The reason to explain a change is participation, not verification: the reader needs
enough understanding to have the next idea. Correctness is already the test run's job.
That split tells you what an explainer here must be:

- **Grounded in executed behaviour.** Every claim about what the system does cites a
  scenario that actually ran. The run artifacts are your source of truth, not the diff
  and never your own memory of the code.
- **Published where the stories live.** The explainer lands in the docs site or the
  report, carries provenance frontmatter, and can be detected as stale when the
  behaviour it explains changes.

## Ground in artifacts first

Before writing a word:

1. Read the run artifacts, not the tests: `reports/index.story-report.json` (StoryReport
   v1) or the raw run JSON. `executable-stories list <raw-run.json> --list-format json`
   gives you the scenario index.
2. If a previous run exists, run `executable-stories compare` (`--format changelog`) to
   get the **behavioural diff**: which scenarios appeared, changed, or disappeared. This
   is what the explainer explains — the code diff is supporting material, not the spine.
3. Read the code diff last, to explain *how* the behaviour change was achieved.

If a claim about behaviour has no covering scenario, say so explicitly in the explainer
("not covered by a scenario") — that gap is itself useful information.

## Where the explainer goes

Pick the first target that exists, in this order:

1. **Scaffolded Astro docs site** (a directory containing `executable-stories.config.mjs`,
   usually `story-docs/`): write markdown with frontmatter to
   `src/content/docs/explainers/YYYY-MM-DD-<slug>.md`. The site's `authoredDocsLoader`
   picks it up with zero configuration and Starlight renders it with full typography.
2. **Story doc entries**: attach the explanation to the story test(s) covering the change
   using `story.section({ title, markdown })` for prose, `story.mermaid` for diagrams,
   and `story.html` for interactive figures and the quiz. It then renders in the HTML
   report and every other format.
3. **Standalone fallback** (no site, no suitable story): a single self-contained HTML
   file in `reports/explainers/YYYY-MM-DD-<slug>.html`, checked into the reports output,
   never a global temp directory.

### Frontmatter contract (explainer v1)

```yaml
---
title: Isometric rendering for the garden view
description: Why the top-down painter became an isometric projector, with evidence.
explainer:
  version: 1
  generated: 2026-07-13
  runId: <runId from the run JSON>
  commit: <git sha explained>
  branch: <branch>
  scenarios:
    - id: garden-renders-rocks-in-isometric-projection
      title: Garden renders rocks in isometric projection
      hash: "9f2c1a0d4e5b6a70"
    - id: z-order-follows-world-y-coordinate
      title: Z-order follows world Y coordinate
      hash: "04d1e2f3a4b5c6d7"
---
```

`title` and `description` are what Starlight needs; the `explainer` block is the
machine-readable provenance contract (JSON Schema: `explainer-v1.json` in
executable-stories-formatters). Copy `id`, `title`, and `hash` verbatim from the
scenario index — generate it with
`executable-stories format <raw-run.json> --format scenario-index-json`; each item
carries the content `hash`. Never invent these values. Always quote the hash in
YAML (`hash: "9f2c1a0d4e5b6a70"`) — an all-digit hash would otherwise parse as a
number and fail validation.

The hash pins the scenario's content (title + steps, not status), which makes the
explainer self-checking:

- **CI**: `executable-stories check-explainers <raw-run.json> --explainers-dir <dir>`
  exits 5 when any explainer cites a scenario that changed, was renamed, or vanished.
  Wire it next to the test run so stale explainers surface like failing tests.
- **Docs site**: the scaffolded site injects a fresh/stale banner (with story-page
  deep links) into every explainer page automatically.

When an explainer goes stale, regenerate it (or mark it superseded) and restamp the
hashes. Date-prefix the filename so explainers sort by time.

## Structure

Four sections, in this order. Intuition before details throughout.

1. **Background.** Explain the existing system relevant to this change. Explore the
   surrounding code broadly for this. Write a deep background a newcomer can follow and
   mark it skippable, then a narrow background directly relevant to the change.
2. **Intuition.** The essence of the change, before any code: concrete examples with toy
   data, the one-sentence "goal of this change", diagrams. A reader who stops here
   should still be able to say what changed and why.
3. **Literate walkthrough.** A high-level tour of the code changes, grouped and ordered
   for understanding (not file order), with prose before each group saying what to look
   for. Then the evidence: link each behavioural claim to the scenario that proves it,
   with its status from the run. Use the docs site's story deep-links where available.
4. **Quiz.** Five interactive multiple-choice questions, medium difficulty: hard enough
   that you must have understood the substance, no gotchas. On click, say whether the
   answer was correct and give one sentence of feedback. Keep every option for a
   question the same length (roughly equal word and character count) so formatting leaks
   no clues. The working norm: don't send the change for review until you can pass the
   quiz cold.

## Code Diff evidence (annotated patch in the Evidence Review)

When the change ships through the Evidence Review report, the literate walkthrough can
carry the patch itself as **Code Diff evidence**: annotated hunks connected to the
scenarios that prove them. The raw diff is a supporting appendix, never the first
section. Follow this sequence exactly:

1. Read the scenarios from the run artifacts, then run `compare` (behaviour first).
2. Only after you understand the behaviour change, collect the patch:
   `git diff --histogram <base>...<head> > changes.patch`.
3. Write an annotation sidecar covering only the teaching-relevant hunks, ordered by
   concept. Each annotation names the file, a substring unique to **one changed line**
   (the assembler converts it to a content anchor), prose, and the scenario IDs that
   prove the behaviour claim:

   ```json
   {
     "title": "Quantity-aware totals",
     "annotations": [
       {
         "file": "src/cart/totals.ts",
         "match": "item.price * item.quantity",
         "label": "Core calculation",
         "text": "Totals now multiply by quantity.",
         "scenarioIds": ["quantity-multiplies-the-line-total"]
       }
     ]
   }
   ```

4. Feed both into the review:
   `executable-stories review <raw-run.json> --changed-files <files> --patch changes.patch --code-diff sidecar.json`.
   Add `--strict-code-diff` in CI so orphaned anchors and unverified scenario
   references fail the gate instead of rotting.
5. A hunk with no `scenarioIds` renders visibly as "not covered by a scenario" — leave
   it that way rather than citing a scenario that doesn't prove it.
6. Then write the quiz.

Anchors are content-based, so a regenerated patch relocates them; an annotation whose
lines were rewritten shows as **orphaned** rather than silently moving. Treat an
orphaned annotation like a stale explainer: rewrite it against the current patch.

## Narrative blocks

An explainer needs a few shapes that prose handles badly: which files moved, what a
record looks like now, how the pieces talk. Each has a home already, so don't invent
markup for them:

| Shape                  | Use                                               |
| ---------------------- | ------------------------------------------------- |
| Flow, sequence, state  | `story.mermaid({ code, title })`                   |
| Files touched          | `story.custom({ type: "file-tree", data })`        |
| Record / schema shape  | `story.custom({ type: "data-model", data })`       |
| Annotated code         | `story.code`, or Code Diff evidence for a patch    |
| HTTP surface           | `executable-stories import-openapi`                |
| Before/after values    | `story.state`, `story.table`                       |

`file-tree` and `data-model` render in every report surface with no setup. Directories
are derived from the paths, so pass a flat list:

```ts
story.custom({
  type: "file-tree",
  data: {
    authored: "agent",
    files: [
      { path: "src/cart/totals.ts", change: "modified", note: "quantity-aware" },
      { path: "src/cart/line-item.ts", change: "added" },
    ],
  },
});

story.custom({
  type: "data-model",
  data: {
    authored: "agent",
    name: "LineItem",
    fields: [
      { name: "quantity", type: "number", change: "added", note: "defaults to 1" },
      { name: "totalPence", type: "number", change: "renamed", note: "was total" },
    ],
  },
});
```

`change` accepts `added`, `modified`, `removed`, `renamed`; anything else is dropped.
A malformed block renders as its raw data with "unrecognised shape" rather than
disappearing, so a bad payload surfaces instead of hiding.

### Mark what you wrote

Set `authored: "agent"` on every block you produce from a diff. It renders as
"AI-authored, not verified by a run".

This matters more than it looks. A scenario in this report earned its place by
executing; a block you drew from reading a diff did not. Left unmarked, the two sit
side by side looking equally trustworthy, and the report quietly becomes a place where
confident pictures of unverified claims live. Nothing can detect the difference after
the fact, which is why you declare it as you write.

Anything that asserts what the system *does* still needs a scenario citation. If none
covers it, say "not covered by a scenario" and leave the gap visible.

## Diagrams and interactive figures

- No ASCII art. Reach for a narrative block first (above); build diagrams from simple
  HTML and CSS (or `story.mermaid` when attaching to a story) for anything they don't
  cover. Pick one or two diagram families and reuse them across the
  explainer so cases stay comparable. System/data-flow diagrams must include example
  data.
- Interactive figures are allowed where fiddling genuinely teaches something a static
  picture can't (drag a value, scrub a timeline). Used elsewhere they are slop; when in
  doubt, stay static.
- All HTML/JS must be self-contained vanilla code with no external requests. In the
  report context, interactive content belongs in `story.html` (it renders in a sandboxed
  iframe). In markdown pages, inline HTML blocks are fine; keep scripts small.
- Code blocks in inline-HTML diagrams must preserve newlines: use `<pre>`, or give a
  styled container `white-space: pre-wrap`. Before finishing, scan every code block in
  generated HTML and confirm this.

## Writing style

Write with the clarity and flow of a well-edited engineering book: plain declarative
sentences, smooth transitions between sections, no filler. The reader is a competent
teammate who was away while the change happened. One long page with section headings
and a small table of contents at the top; no tabs.

## Relationship to neighbouring skills

- `spec-evidence-review` owns review receipts (claim + typed evidence for a reviewer).
  An explainer teaches; a review receipt adjudicates. Link one from the other when both
  exist for the same change.
- `executable-lessons` owns durable, runnable lessons for learning a topic over time. If
  the reader keeps failing the same quiz territory, that's a signal to author a lesson
  there instead of a longer explainer.
