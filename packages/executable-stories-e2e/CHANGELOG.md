# executable-stories-e2e

## 0.2.2

### Patch Changes

- Updated dependencies [1ec073d]
  - executable-stories-core@0.30.0

## 0.2.1

### Patch Changes

- Updated dependencies [67ded1b]
  - executable-stories-core@0.29.0

## 0.2.0

### Minor Changes

- 9bfc981: The e2e reporter reads what e2e 0.19 adds to a run, when present: each test's `trace.md` page attaches to its scenario as markdown, app warnings and errors (console, uncaught, network) become `App <source> <level>:` notes under the step that was running, and a test that skipped itself after a failure keeps the skip reason as a note. A failed `toHaveScreenshot` keeps its `-expected`, `-actual` and `-diff` file names.

  The HTML report pairs screenshot-comparison images that share a stem (`home-expected.png`, `home-actual.png`, `home-diff.png`) and shows them side by side, for Playwright's `toHaveScreenshot` and e2e's alike.

## 0.1.0

### Minor Changes

- 72c0ab9: New `executable-stories-e2e` adapter for the e2e test runner by TesterArmy. Add `storyReporter()` to `reporters` in `e2e.config.ts` and each run writes `.executable-stories/raw-run.json` for `executable-stories format`. Locator and `expect` steps read as plain language (`click the "Pay" button`), agent steps keep their instruction and explanation, and optional `story.given/when/then` markers group steps under your own words. Screenshots, videos and Playwright traces attach to their steps.

  `executable-stories format` reads runs from newer adapters: it skips unknown fields and doc kinds with a one-line note, while `executable-stories validate` stays strict. The formatters package ships the docs as markdown under `docs/` for agents reading from `node_modules`.

  New skills: `e2e-story-api`, and `bug-bash`, which turns exploration findings into failing scenarios.

### Patch Changes

- Updated dependencies [72c0ab9]
  - executable-stories-core@0.28.1
