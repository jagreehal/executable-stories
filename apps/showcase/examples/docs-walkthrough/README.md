# docs-walkthrough

Screenshots and videos for product docs, built from a test run.

- `openScenario(page, 'flaky-then-recovers', { panel: false })` opens each walkthrough's starting state with no backend and no dev panel.
- [executable-stories-playwright](https://www.npmjs.com/package/executable-stories-playwright) records each step with a screenshot. `highlight` outlines the element the step is about; `mask` covers changing data.

```sh
pnpm install       # in this folder
pnpm walkthrough   # runs the walkthroughs against the demo app, then builds docs/
```

| Output                   | Contents                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `docs/walkthroughs.md`   | Steps with screenshots and video, linked from `docs/assets/` |
| `docs/walkthroughs.html` | The same as one self-contained page                          |

`pnpm walkthrough` clears `docs/`, runs the tests, builds the Markdown and HTML with `executable-stories format`, and runs `verify.mjs`, which exits non-zero when an output is missing.
