---
name: executable-lessons
description: Use when teaching a technical or coding topic (onboarding, katas, LeetCode-style practice, a library, a pattern) and you want each lesson to be runnable and self-proving. Authors lessons as executable story tests so the lesson, the test, and the living documentation are one artifact. Companion to the `teach` skill: teach owns the pedagogy (mission, progression, references) and this skill owns the verification layer.
---

# Executable Lessons

A technical lesson is an **executable story first, a rich HTML page second.**

The thing the learner makes pass is the lesson's source of truth. Prose teaches. The
assertion proves. When the two are one artifact, the documentation cannot drift. Break
the code and the lesson goes red in the report.

**Core principle:** If you cannot run a coding lesson to verify the learner got it, it is
a blog post. Make the assertion the spine and hang the teaching on it.

## When this applies

Use this when success means *code that behaves a certain way*: katas, interview practice,
onboarding to a real codebase, learning a library or pattern.

Skip it for pure-knowledge or non-code topics (history, theory, yoga). Those stay as
`teach`'s HTML lessons. The split maps onto `teach`'s own three parts:

- **Knowledge** → `story.section` / `story.code` / `story.mermaid` / `story.link` (cited prose)
- **Skill** → the `Given`/`When`/`Then` exercise and its assertion. A quiz cannot do this for code.
- **Wisdom** → `story.link` to communities where the learner tests the skill for real

## Agent guardrails

- Framework-native only. No feature files, no Gherkin parsing, no step regex, no world object. A lesson is an ordinary `it()` / `test()` with story metadata.
- The assertion is the truth. `story.html()` is **optional richer presentation** (a generated tutorial shell), never the primary source of truth.
- Vitest: `story.init(task)` inside `it(..., ({ task }) => ...)`; never import a top-level `then`.
- Jest: `story.init()` inside `it(...)`; steps as `story.given(...)` or top-level `given(...)`.
- Playwright: `story.init(testInfo)` (or `story.init({ page }, testInfo)` when callbacks need fixtures).
- Other adapters: see each `*-story-api` skill. Pick the language the learner is learning in.

## Interoperate with teach, don't reinvent it

Treat the directory as a `teach` workspace and keep its files:

```
MISSION.md            why the learner is here; grounds every lesson (teach)
lessons/              one runnable lesson per file (this skill)
  0001-<slug>.story.test.ts
reference/            revisitable cheat-sheets and glossaries (teach)
learning-records/     what was learned, surprises, what's next (teach)
```

`teach` decides *what* to teach next (zone of proximal development, progression). This
skill decides *how* a coding lesson is expressed: as a story test.

## Anatomy of a lesson

**One lesson = one tightly-scoped runnable behaviour.** The tdd tracer bullet and `teach`'s
"teach ONE thing" rule are the same rule here. If a lesson needs two assertions to make
its point, you have two lessons.

```ts
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { twoSum } from '../src/two-sum'; // the learner's file (shipped as a stub)

describe('Arrays & Hash Maps', () => {
  it('Lesson 1 · Two Sum: trade space for time with a hash map', ({ task }) => {
    story.init(task);

    // Knowledge: teaching prose as DOC ENTRIES, so it renders in the report.
    // Plain // comments vanish from the docs.
    story.section({ title: 'The problem', markdown: '…cited explanation…' });
    story.code({ label: 'Naive O(n²) starting point', lang: 'ts', content: '…' });
    story.mermaid({ title: 'One pass', code: 'flowchart LR; …' });

    // Skill: the exercise contract and the assertion the learner must satisfy.
    story.given('an array [2, 7, 11, 15] and a target of 9');
    story.when('we scan once, remembering each number we have seen');
    const result = twoSum([2, 7, 11, 15], 9);
    story.then('we get the indices of the pair that sums to the target');
    expect(result).toEqual([0, 1]);

    // Wisdom: where to go deeper, and where to test the skill for real.
    story.link({ label: 'LeetCode #1 · Two Sum', url: 'https://leetcode.com/problems/two-sum/' });
  });
});
```

Anchor the lesson to the code it teaches with `covers` (in the scenario options), so the
lesson belongs to real files and breaks when they change.

## Lesson lifecycle: ship locked, not bare-red

A lesson moves through four states, and the test modifier *is* the state. This reconciles
"the learner must do the work" with "a committed curriculum stays green in CI". Do not
ship a bare failing test.

| State | Modifier | In the report / scenario index? |
| --- | --- | --- |
| **Roadmap**: planned, not authored | `it.todo("Lesson N · …")` (title only) | as a todo |
| **Locked**: authored, stub in place, not started | `it.skip(…)` + a stub that throws | **no**, the body doesn't run |
| **Active**: the learner is on it | plain `it(…)` | yes, red until solved |
| **Done**: solved | plain `it(…)`, green | yes, with a ✅ pass badge |

The learner's start ritual is a one-line edit: **change `it.skip` → `it`.** The lesson goes
red (the stub throws), and they implement until green.

> **Caveat that follows from this:** locked (`it.skip`) and roadmap (`it.todo`) lessons
> never call `story.init`, so they contribute **nothing** to the HTML report or the
> scenario index. Those artifacts show the learner's *progress*, the lessons they have
> reached. The full *syllabus* lives in the lesson files, and in a curriculum manifest if a
> tool needs it machine-readable (see below). Don't expect `executable-stories list` to
> enumerate locked work.

## Authoring rules

1. **Ship the lesson locked with a red-when-unlocked stub.** Deliver a *stub* (`throw new Error('TODO: implement …')` or `// YOUR CODE HERE`) and keep the reference answer **out of the learner's source** (e.g. `reference/solutions/`), so they have to reach for it. A lesson that ships green has nothing to do.
2. **One behaviour per lesson.** Mirror tdd vertical slices: one test → one implementation → next lesson. Never write five lessons' assertions up front.
3. **Teaching prose lives in doc entries** (`story.section`/`code`/`mermaid`/`kv`/`link`). Comments don't reach the report.
4. **Write assertions whose failure teaches.** The failure message is the feedback. `expected [2,7] to equal [0,1]` tells the learner they returned values instead of indices; a bare `false !== true` teaches nothing.
5. **Number lessons** (`0001-…`, `0002-…`) for progression, and write a `learning-records/NNNN-*.md` when a lesson teaches something non-obvious.
6. **Ground every lesson in the MISSION.** If a lesson doesn't serve the stated reason the learner is here, cut it or fix the mission.

## The feedback loop

The loop is red → implement → green, and it already runs itself:

- Locally: `vitest run lessons/0001-…` (or the adapter's focused-run command).
- Agent-driven: use the MCP `run_scenario` tool to run a single lesson. Present the lesson
  red, let the learner implement, run `run_scenario`, and respond to the exact failure. The
  assertion message is the feedback, so write assertions whose failure teaches (catching
  "returned values instead of indices").

## Derive the artifacts, don't author them twice

A lesson run already produces everything. Generate, never hand-write:

- **Living lesson page:** the StoryReporter HTML report.
- **Publishable docs:** `executable-stories format <raw-run> --format markdown` (or `astro`) for Starlight-ready pages with a pass/fail badge. This is how lessons reach a docs site.
- **Agent-readable progress:** `executable-stories list <raw-run> --list-format json` gives a scenario index with per-lesson status and source file. A teaching agent reads this to know where the learner is.
- **Richer presentation (optional):** when a lesson wants a guided interactive shell beyond the doc kinds, generate a self-contained HTML page and embed it with `story.html({ content })`. See [embedding skill & agent HTML output](../../apps/docs-site/src/content/docs/guides/embedding-skill-html-output.md). The embedded page is presentation. The assertion is still the truth.

## Progression metadata (optional, only if a consumer needs it)

The scenario index reports the lessons the learner has *reached* (active and done), but not
locked or roadmap ones, whose bodies never ran. So "what's next / what's locked /
prerequisites" does not come from the index alone. Two options:

- **Derive from the filesystem:** lesson order is the `0001-…`, `0002-…` numbering; state is
  the modifier (`it` / `it.skip` / `it.todo`) in each file. Good enough for most curricula,
  with no extra artifact to maintain.
- **A curriculum manifest:** reach for this when a tool (a teaching agent, a dashboard)
  needs missions, prerequisites, or unlock chains as data:

```jsonc
// curriculum.json: author only when something actually reads it
{
  "mission": "Get fluent at array / hash-map interview patterns",
  "lessons": [
    { "id": "0001-two-sum", "title": "Two Sum", "requires": [], "covers": ["src/two-sum.ts"] },
    { "id": "0002-two-sum-no-solution", "title": "When there is no pair", "requires": ["0001-two-sum"] }
  ]
}
```

Keep this out of the formatter until a real consumer exists. The lessons are the product.
This is bookkeeping.
