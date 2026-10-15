# executable-stories-showcase-cli

```sh
npx executable-stories-showcase init src/scenarios           # scaffold, install agent skills, register the MCP server
npx executable-stories-showcase doctor scenarios --base-url http://localhost:5173
npx executable-stories-showcase guide [topic]
npx executable-stories-showcase mcp scenarios --base-url http://localhost:5173
npx executable-stories-showcase validate scenarios --rules rules.ts
npx executable-stories-showcase list scenarios --base-url http://localhost:5173 --json
npx executable-stories-showcase shoot scenarios --base-url http://localhost:5173 --out shots
npx executable-stories-showcase shoot scenarios --base-url http://localhost:5173 --no-panel --viewport 1440x900 --scale 2 --color-scheme dark --locale de-DE --timezone Europe/Berlin
npx executable-stories-showcase affected scenarios --base main --src src
npx executable-stories-showcase shoot scenarios --base-url http://localhost:5173 --only a,b --out shots/after --compare shots/before
npx executable-stories-showcase coverage scenarios
npx executable-stories-showcase publish shots/after/*.diff.png --folder pr-42
npx executable-stories-showcase record scenarios --base-url http://localhost:5173 --steps steps.ts --format mp4
npx executable-stories-showcase record scenarios --base-url http://localhost:5173 --steps steps.ts --format gif --width 900 --fps 10 --hold 1500
npx executable-stories-showcase suggest scenarios --src src --schema scenario.schema.json
```

- `shoot` opens every scenario in Chromium, waits until it's ready, and saves a screenshot. It fails on unmocked requests, uncaught exceptions and `console.error` calls, and writes `<out>/<name>.md` for each failure with the fix. It needs `@playwright/test`.
- `doctor` checks the wiring one step at a time and prints each fix. `mcp` lets a coding agent open, drive and save scenarios. `guide` prints the shipped agent skill.
- Exit codes: `1` a scenario failed, `2` bad arguments or scenarios, `3` something needed is missing or down. Errors print a stable code, e.g. `[DEV_SERVER_DOWN]`.
- `affected` lists the scenarios a branch can affect, and why. `shoot --compare <dir>` writes a before/after/changed image for each state that differs from an earlier run. `coverage` counts the scenario map's states by status. `publish` pushes files to a `scenario-shots` branch and prints Markdown image links for a PR.
- `record` opens each scenario named in `--steps`, runs its steps with a visible cursor, and saves an MP4, GIF or WebM, optionally cropped to `--element` or to a per-scenario `{ element, steps }` in the steps module. `--width` and `--fps` set the size and frame rate, and `--hold` keeps the last frame up before a GIF loops. `--cursor dot` or `--cursor pointer.svg` swaps the default arrow, and `--cursor-color` recolors it. Each video gets a `<name>.video.json` with its size, length, description and clicks, which `executable-stories-remotion` uses to caption it and zoom to the clicks. Video records at `--viewport` size; `--scale` applies to screenshots. MP4, GIF, cropping, `--width` and `--fps` need ffmpeg.
- `suggest` asks Claude, or another model behind `ANTHROPIC_BASE_URL` via `--model`, which UI states lack scenarios, and drafts them for review.
