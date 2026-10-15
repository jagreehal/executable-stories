# executable-stories-showcase-cli

## 0.3.0

### Minor Changes

- 8a25254: New package `executable-stories-remotion`. `<StoryVideo>` renders a passed scenario as a Remotion video: one scene per storyboard frame, step text as captions, `story.state()` changes animated. `<RecordingVideo>` cuts showcase recordings into one captioned video that zooms to each click. `executable-stories-showcase record` now writes `<name>.video.json` beside each video with its size, length, description and clicks, iframe clicks included.
- ae013a7: Scheduled agent loops and before-and-after UI evidence for pull requests.

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

### Patch Changes

- Updated dependencies [ae013a7]
  - executable-stories-showcase@0.2.0

## 0.2.0

### Minor Changes

- bf28008: `record` adds `--width`, `--fps` and `--hold <ms>` to set a video's size, frame rate and time on the last frame. A steps entry can be `{ element, steps }`, so each scenario in one run gets its own crop.

## 0.1.0

### Minor Changes

- 8a681f2: First release. Open a running app in any state from a URL. A scenario is a JSON file of network fixtures, URL params and store state. `startScenarios` applies it before the app renders, a dev panel switches and saves scenarios, and `openScenario` opens one in a Playwright test.

  - `executable-stories-showcase`: the runtime, the panel, store adapters (Zustand, Redux, XState, TanStack Query, cookies), Playwright helpers, and Vite and Next.js routes that save scenarios into your project. Share links open on localhost, or anywhere you pass `allowLinks: true`.
  - `executable-stories-showcase-cli`: `shoot` for screenshots, `record` for MP4, GIF or WebM clips, `doctor` to check your setup, and `mcp` so a coding agent can open, drive and save scenarios. `init` installs the skills.
  - `executable-stories-showcase-react`: `useScenarioState` for React and Preact components.

### Patch Changes

- Updated dependencies [8a681f2]
  - executable-stories-showcase@0.1.0
