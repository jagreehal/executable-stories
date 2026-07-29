---
"executable-stories-formatters": minor
---

New `push` subcommand: send a run (StoryReport v1 or raw run JSON) to Executable Stories Cloud without a custom curl script. Accepts `--key`/`EXECUTABLE_STORIES_API_KEY`, `--url`/`EXECUTABLE_STORIES_URL`, and infers `--repo`/`--branch`/`--git-sha` from git. Raw runs are converted through the standard synthesize → canonicalize → StoryReport pipeline before upload.
