---
name: spec-story-mapping
description: Use when planning a release, an epic, or a new product area and the backlog is a flat list nobody can reason about. Builds a story map — backbone, activities, slices — and expresses it directly as journey tags, capability tags, and planned scenarios, so the map is the report rather than a whiteboard photo.
---

# Story Mapping

A flat backlog hides two things a release depends on: the order a user experiences the
work in, and where you could stop and still ship something usable. A story map shows both,
and then it gets photographed, pasted into a wiki, and starts rotting the same afternoon.

Here the map is not a picture of the plan. The **backbone becomes journeys**, the
**activities become capabilities**, and the **cells become planned scenarios** that burn
down as the work lands. The map updates itself because it is made of tests.

## Agent guardrails

- **Map the user's flow, not the system's architecture.** "Browse, choose, pay, confirm"
  is a backbone. "Frontend, API, worker, database" is an architecture diagram wearing a
  backbone's clothes.
- **Never write a scenario during mapping.** Mapping decides scope and order. Scenarios
  need examples and rules, which come later (`spec-example-mapping`, `spec-grilling`).
- **A slice ships something a user can do end to end.** A slice that delivers one layer is
  not a slice, and it cannot be demoed or verified.
- **Do not fabricate the backbone from the codebase.** If you have not been told the flow,
  ask. A map derived from folder names is a map of the folder names.

## Build the map

### 1. The backbone

The sequence of activities a user moves through, left to right, in their language. Five to
nine of them. If you have twenty, you have mapped tasks rather than activities.

> Find a product → Add to basket → Check out → Pay → Track delivery

### 2. Activities under each backbone step

The things a user does within that activity. Still their vocabulary, still no
implementation.

> **Check out**: enter delivery address · pick a delivery slot · apply a discount code ·
> review the order

### 3. Slices, top to bottom

A horizontal cut across the whole backbone. The top slice is the thinnest path that works
end to end. Each slice below adds depth.

> **Slice 1 (walking skeleton)**: search by exact name · one item in the basket · one
> saved address · card payment only · email confirmation
> **Slice 2**: filters · quantities · multiple addresses · delivery slots
> **Slice 3**: discount codes · saved payment methods · delivery tracking

The first slice is the one to get right. A team that slices vertically has something
demoable in week one; a team that slices by layer has three-quarters of a checkout and
nothing to show.

## Express the map in the suite

Now the part that stops it rotting. The map has three parts and each has a home already.

### Backbone → journeys

Each backbone step is a chapter in an ordered walkthrough. Tag the scenarios that make it
up and a page assembles itself at `/journeys/<id>`:

```ts
story.init(testInfo, { tags: ['journey:guest-checkout:3', 'capability:checkout'] });
```

The number is the position. Members render in order with their storyboards, under one
aggregate status. Stakeholders read the flow, not the file list.

### Activities → capabilities

`capability:<name>` on every scenario under an activity. A view grouped by capability is
the map's columns, live:

```js
views: [{ base: '/for/product', include: { tags: ['audience:stakeholder'] }, groupBy: 'tag' }]
```

### Cells → planned scenarios

Every cell you have not built yet is declared where it will eventually live:

```ts
describe('Checkout — delivery slots', () => {
  it.todo('a slot within the next 7 days can be chosen');
  it.todo('a full slot cannot be chosen');
});
```

They render marked *(planned)* and stop being planned the moment someone implements them.
The map's progress bar is the count going down, and nobody maintains it. Non-JS adapters
take an explicit call instead of `it.todo`; `spec-plan-to-stories` has the table.

### Slice boundaries → release goals

A slice is a set of behaviours, so it is a gate:

```bash
executable-stories goal reports/raw-run.json --require-tags capability:checkout --baseline auto
```

Exit 0 means the slice is deliverable. That is a more useful definition of done than a
column on a board, because it cannot be satisfied by moving a card.

## Working the map

Take one cell, not one column. A column is a layer; a cell is a behaviour. For the chosen
cell:

1. `spec-example-mapping` or `spec-grilling` to find the rules and examples.
2. `story-tdd` to build it.
3. The planned scenario becomes a real one, and the map updates.

Re-cut the slices when you learn something. A map that never changes was not being used.
Because the map is tags and todos, re-cutting is an edit to tags, not a redraw.

## Reading the map back

```bash
executable-stories format reports/raw-run.json --format story-report-json --output-dir reports --output-name index
executable-stories list reports/raw-run.json --list-format json
```

Group by `capability:` for the columns and by `journey:` for the backbone. Planned
scenarios carry `planned: true`. That is the whole map, current as of the last run, with
no whiteboard involved.

## Relationship to neighbouring skills

- `spec-plan-to-stories` is the mechanics of declaring a planned scenario per adapter.
- `spec-example-mapping` and `spec-grilling` work one cell at a time once the map exists.
- `audience-views` mounts the map as pages the stakeholders read.
- `release-notes` reports a completed slice to the people who were promised it.
- `spec-outside-in-behaviour` is the discovery discipline behind a good backbone.
