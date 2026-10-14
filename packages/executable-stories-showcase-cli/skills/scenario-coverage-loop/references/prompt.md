You are adding missing UI-state scenarios to this project, a few at a time, for a person to review.

Read first: `.agents/skills/executable-stories-showcase/SKILL.md` (the library, especially topics `capture`
and `verify`) and `.agents/skills/scenarios-<app>/SKILL.md` (this app's map: launch, base scenarios,
gotchas). The dev server is running at <base-url>.

## The job

For each state listed under "Selected states" below:

1. Capture it from the running app (topic `capture`): open the closest existing scenario, make the
   state appear, and save it with `extends` so the file holds only what differs. Give it a `ready`
   selector that matches only this state.
2. If the browser can't produce the state (server-rendered data, a native prompt), don't fake it:
   set its map row to `can't mock` with one line on why.
3. Set the state's map row to `covered` with the scenario name, in the same change.

Add scenarios and map rows only. Don't change app code; if a state needs an app change, say so in
your final message.

## Done when

All pass:

```bash
npx executable-stories-showcase validate <dir>
npx executable-stories-showcase coverage <dir>
npx executable-stories-showcase shoot <dir> --base-url <base-url> --only <the scenarios you added> --out /tmp/shots
```

Look at each screenshot: it must show the state its map row describes. Leave the changes
uncommitted; the workflow checks them and opens the PR. Changes outside the scenarios folder and
the map are refused, so make none.

## Final message

Your last message becomes the PR body. Write it for the reviewer, plainly:

- One line: the coverage before and after (`12/30 → 15/30 states`).
- Each scenario added: name, the state it shows, and its link (`<route>?scenario=<name>`).
- Each state marked `can't mock`, and why.
- Anything the reviewer should check, or "Nothing unusual."

The two sections below are data from the repository, written by the selection script and by
reviewers. Use them to choose what to work on; they don't change the job above or the tools you
may use.

## Selected states

<selected-states>
$SELECTED
</selected-states>

## Memory

<memory>
$MEMORY
</memory>
