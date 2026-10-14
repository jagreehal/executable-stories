---
'executable-stories-formatters': minor
'executable-stories-showcase': minor
'executable-stories-showcase-cli': minor
---

Scheduled agent loops and before-and-after UI evidence for pull requests.

**executable-stories-formatters**

- `triage --limit <n>` keeps the top n items of the worklist. Ties break on scenario id, so a scheduled loop picks the same target from the same run.
- `list --list-format json` gives each scenario an `assertion` field: `asserted`, `unasserted` or `unobserved`. A loop can pick a claim nothing checked.
- Piped output arrives in full, however large: `list --list-format json | jq` reads the whole list.

**executable-stories-showcase**

- `showCursor(page, { pointer, color })` draws a pulsing arrow that ripples on each click. Pass `'dot'` or your own SVG markup as `pointer`, and any CSS color.
- The cursor follows focus during `fill()` and keyboard steps, draws once in the top frame while it follows the mouse into iframes, and starts mid-screen.

**executable-stories-showcase-cli**

- `record` takes `--cursor arrow|dot|file.svg` and `--cursor-color`, and each `locator.click()` waits for the cursor to reach its target.
- `affected` lists the scenarios a branch can affect, with the reason for each: a changed scenario file, a scenario it extends, a map row's Source column, an endpoint or a route.
- `shoot --compare <dir>` writes a before | after | changed image for each state that differs from an earlier run.
- `coverage` counts the scenario map's states by status and exits 1 when the map names a scenario that doesn't exist.
- `publish` pushes images to a `scenario-shots` branch without touching your checkout and prints Markdown image links for a PR.
- Two new skills: `scenario-pr` writes a PR description with before and after screenshots, and `scenario-coverage-loop` sets up a scheduled agent that adds missing states one PR at a time. The scenario map gains a Source column.
