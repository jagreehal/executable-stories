---
'executable-stories-astro': minor
'executable-stories-formatters': minor
'executable-stories-react': minor
---

Astro artifact UX, CLI parity for non-JS adapters, and report triage defaults

**Astro: embeddable scenarios and agent-readable endpoints.**

- New `<StoryScenario/>` (full scenario card: steps, status, failure output, docs) and `<StoryStatus/>` (inline linked status pill) let hand-written MDX embed live scenarios. Both resolve by stable scenario id, URL slug, or exact title, and show a visible callout when the reference stops matching, so embedded evidence never silently disappears.
- `agentEndpoints` (default on) injects `/llms.txt` (an llms.txt-format index of every scenario) and a plain-Markdown twin of each story page at `<routeBase>/<slug>.md`. A published site is now consumable by agents and `curl`, not only browsers, and static builds prerender them as real files.
- The report-island pre-bundle (`optimizeDeps.include`) and React dedupe now ship inside `executableStories()`, so the "Outdated Optimize Dep" fix arrives with `pnpm update executable-stories-astro`. Scaffolds no longer carry a `vite` block.
- The integration watches a nav-manifest that the loader rewrites whenever a run changes the feature/scenario tree, so the Starlight sidebar stays fresh in dev. Status-only changes keep hot-reloading.

**One scenario-to-Markdown serializer.** `scenarioToMarkdown` lives in `executable-stories-core` and backs both the HTML report's "Copy as Markdown" button and the Astro `<slug>.md` endpoints, so a scenario copies the same either way. `variant: "compact"` renders the paste-sized excerpt; the default renders the standalone document.

**Non-JS adapters reach the CLI with less friction.**

- `format` (and the other file-taking commands) resolve `.executable-stories/raw-run.json`, then `reports/raw-run.json`, when given no path, and print the resolved path to stderr.
- New `executable-stories doctor` diagnoses the run JSON: where it is, whether it parses, its `schemaVersion` against what the CLI supports, and what it contains. It names cross-language drift ("your adapter is newer than the CLI") plainly instead of surfacing it as a deep validation error.
- Each of these adapters (Go, Ruby, Rust, pytest, JUnit 5, xUnit) emits a `$schema` pointer as the first key so editors validate the file as it is written, and prints the exact next command after writing (silence with `EXECUTABLE_STORIES_QUIET`). The JS/TS reporters render in-process, so they keep writing plain run JSON.

**CLI ergonomics.**

- `--preset agent|ci|docs` expands to a format bundle, and unions with `--format` when both are passed.
- `--open` opens the generated HTML report.
- `format` prints a one-line summary (`✔ 12 scenarios (11 passed, 1 failed) → reports/index.html in 84ms`) instead of finishing silently.
- `executable-stories completion bash|zsh|fish`.
- Colocated output writes an `index.html` that links every per-file report, failures first. It skips that index (with a warning) when a report already occupies `index.html`, so it never overwrites an aggregate report of that name.

**Report opens as a triage surface.** A run with failures collapses passing work to its titles, expands failures, and floats features that contain failures to the top. All-green runs are unchanged, and a saved collapse preference always wins, so this only seeds a first visit.

**Fixes** the scaffolded sample run JSON, which used `schemaVersion: "1.0"` (a string) where the schema requires the integer `1`. The Astro loader tolerated it but `executable-stories format` rejected it.
