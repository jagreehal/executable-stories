---
name: spec-domain-language
description: Use when the same concept has three names across a codebase, when a scenario reads in vocabulary no stakeholder uses, or when starting spec work in an unfamiliar domain. Builds a glossary that the scenarios enforce, since scenario titles and step text are the one place the vocabulary is executed rather than merely written down.
---

# Domain Language

A glossary in a wiki is a wish. Nothing checks it, so within a quarter the code says
`account`, the tests say `user`, support says `customer`, and a scenario about suspending
one of them is ambiguous to everyone reading it.

Scenario titles and step text are different. They run, they are read by non-engineers, and
they appear in the report on every release. That makes them the enforcement surface for a
ubiquitous language: get the vocabulary right in the steps and it stays right, because a
wrong word in a step is visible to the person who would notice.

## Agent guardrails

- **Challenge, do not accommodate.** When someone uses a term that conflicts with the
  glossary, say so immediately. Silently adopting their word is how the third synonym
  gets in.
- **Sharpen fuzzy terms the moment they appear**, not after the scenarios are written.
  Renaming a concept across forty scenarios is a day; renaming it in the conversation is a
  sentence.
- **The glossary holds no implementation detail.** It is a glossary, not a spec, not a
  scratchpad, not a place for schema decisions.
- **A rename is a behaviour change to the reader.** It shows in `compare` as a scenario
  disappearing and another appearing. Do it deliberately, in one commit, and say so in the
  release notes.

## Where the language lives

`CONTEXT.md` at the repo root, created lazily when the first term is resolved. One entry
per concept: the canonical term, one sentence of meaning, and the words it is **not**.

```markdown
## Account

A billing relationship with one payment method and one address. Not a **User**: several
Users can act on one Account, and an Account survives every User being removed.

Rejected synonyms: customer (support's word for the person, not the relationship),
profile (the UI's word for a User's settings).
```

The rejected-synonyms line does more work than the definition. A definition tells you what
a word means; the rejection tells the next reader which of the four words they were about
to use is wrong.

When a decision behind a term is hard to reverse, surprising without context, and the
result of a real trade-off, record it as an ADR in `docs/adr/`. All three conditions, or
skip it. `executable-stories new adr "<title>"` scaffolds one.

## Extracting the language from what exists

The suite already knows what vocabulary is in use:

```bash
executable-stories list reports/raw-run.json --list-format json
```

Read the scenario titles as a corpus, not as a list. Three patterns are worth acting on:

| What you see | What it means |
| --- | --- |
| Two words for one concept across scenarios | Pick one, record the other as rejected, rename |
| A word in scenario titles that appears nowhere in `CONTEXT.md` | Either a missing term or a leaked implementation word |
| A scenario title naming a class, table, or function | It documents structure, not behaviour. Retitle it |

The last one is the most common and the most damaging. `UserRepository returns null for a
deleted account` names three implementation choices and no behaviour, so it teaches the
reader nothing and dies at the next refactor.

## Using the language while specifying

Run this alongside `spec-grilling` or `spec-example-mapping` rather than as a separate
pass. Four moves, all of them inline:

**Challenge against the glossary.** "Your glossary defines cancellation as withdrawing an
unshipped order, but you seem to mean a refund after delivery. Which is it?"

**Sharpen the fuzzy term.** "You are saying account — do you mean the Account or the User?
They behave differently when someone is suspended."

**Stress-test with a concrete scenario.** Relationships between concepts stay vague until
you invent a case that probes the boundary. "An Account with two Users, one suspended.
Can the other still check out?" The answer either confirms the model or breaks it, and
both outcomes are progress.

**Cross-reference the code and the run.** When someone states how something works, check.
"The suite has a passing scenario saying partial cancellation is rejected, but you just
described a partial cancellation flow. Which is current?" A contradiction between the
stated model and a passing scenario is the highest-value finding in this whole skill.

Update `CONTEXT.md` the moment a term resolves. Do not batch it: batched glossary updates
are written from memory and are wrong.

## Renaming a concept

Renaming is cheap in code and expensive in documentation, because the documentation is
read by people who learned the old word. Do it in one pass:

1. Update `CONTEXT.md` first, with the old term recorded as a rejected synonym so search
   still finds it.
2. Rename in scenario titles and step text, not just in code. A renamed function with an
   old-vocabulary scenario has made things worse.
3. Run `compare`:
   ```bash
   executable-stories compare before-rename/raw-run.json reports/raw-run.json --format changelog
   ```
   Every renamed scenario shows as one removed and one added. Confirm the counts match. A
   mismatch means you renamed something you did not mean to, or lost one.
4. Say it in the release notes. Support and QA have the old word in their tickets.

Note that a rename breaks content-hash bindings that key on scenario content: explainers
citing the old scenario go stale (`check-explainers` catches it) and test-management
bindings keyed on steps survive a title change but not a step rewrite.

## Writing steps in the language

The step text is where the vocabulary is enforced, so it is worth being fussy about:

- **Given** states facts in domain terms, never setup mechanics. "an Account with a
  suspended User", not "seed the DB with fixture-3".
- **When** names the action a person or system takes, in their word for it.
- **Then** states the observable outcome using the same nouns. If a `then` introduces a
  noun that no `given` established, either the glossary is missing a term or the scenario
  is doing two things.

## Relationship to neighbouring skills

- `spec-grilling` and `spec-example-mapping` are where terms surface; run this alongside
  either.
- `spec-refine-examples` sharpens the sentence once the words are agreed.
- `spec-review` checks scenarios against the glossary as part of its critique.
- `audience-views` depends on this: `capability:<name>` tags are only coherent if the
  capability names are.
- `explain-system` writes the domain map for readers, using exactly these terms.
