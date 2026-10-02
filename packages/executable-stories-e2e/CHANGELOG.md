# executable-stories-e2e

## 0.1.0

### Minor Changes

- 72c0ab9: New `executable-stories-e2e` adapter for the e2e test runner by TesterArmy. Add `storyReporter()` to `reporters` in `e2e.config.ts` and each run writes `.executable-stories/raw-run.json` for `executable-stories format`. Locator and `expect` steps read as plain language (`click the "Pay" button`), agent steps keep their instruction and explanation, and optional `story.given/when/then` markers group steps under your own words. Screenshots, videos and Playwright traces attach to their steps.

  `executable-stories format` reads runs from newer adapters: it skips unknown fields and doc kinds with a one-line note, while `executable-stories validate` stays strict. The formatters package ships the docs as markdown under `docs/` for agents reading from `node_modules`.

  New skills: `e2e-story-api`, and `bug-bash`, which turns exploration findings into failing scenarios.

### Patch Changes

- Updated dependencies [72c0ab9]
  - executable-stories-core@0.28.1
