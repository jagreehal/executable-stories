# executable-stories-showcase-cli

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
