---
'eslint-plugin-executable-stories-playwright': minor
'eslint-plugin-executable-stories-vitest': minor
'eslint-plugin-executable-stories-jest': minor
---

Rename to "story": primary API and naming are now story-based. File conventions use `.story.docs.md` and `.story.test.ts` / `.story.spec.ts`. ESLint plugins add rules for story context and doc-story usage. (Adapter and formatter packages are not in this branch; add separate changesets when those packages exist in the workspace.)
