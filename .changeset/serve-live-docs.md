---
"executable-stories-formatters": minor
---

Add `serve` subcommand for live docs in agent loops.

`executable-stories serve <raw-run.json>` exposes a live docs URL that regenerates reports, triggers a browser reload, and shows "what changed since you started" on every run. It is built for loop-engineering / agent-loop workflows where a test watcher rewrites the raw-run file repeatedly: edit a test (or let a coding agent loop do it) and watch the behaviour catalogue update in realtime.

Supports `--port` / `--host` and ensures the HTML surface is generated even when not explicitly requested. New `startServe` / `regenerateRun` and related helpers are exported for reuse.
