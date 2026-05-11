---
'executable-stories-vitest': patch
---

Improve Vitest reporter interoperability with vitest-compatible runners by adding a typed `createStoryReporter()` factory and exporting structural reporter types (`StoryReporterProtocol`, `VitestContext`) for config-time usage without brittle type casts.

This keeps runtime behavior unchanged while making reporter setup safer and easier in environments where nominal `Reporter` typing can fail across Vitest forks.
