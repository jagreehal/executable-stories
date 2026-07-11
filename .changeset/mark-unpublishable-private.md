---
'executable-stories-core': patch
---

Mark executable-stories-core and the cypress/jest/playwright/vitest example apps `private: true` so `changeset publish` never attempts to create a new npm package name. All five are private and never published; no published package changes.
