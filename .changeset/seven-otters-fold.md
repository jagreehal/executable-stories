---
'eslint-plugin-executable-stories-playwright': patch
'eslint-plugin-executable-stories-vitest': patch
'eslint-plugin-executable-stories-jest': patch
'executable-stories-formatters': patch
'executable-stories-playwright': patch
'executable-stories-cypress': patch
'executable-stories-vitest': patch
'executable-stories-jest': patch
---

fix: use createRequire for StoryReporter in vitest configs to avoid Vite bundling @cucumber/html-formatter CJS code

- Move executable-stories-formatters from peerDependencies to dependencies in all JS adapters
- Fix "Dynamic require of fs is not supported" in all vitest.config.ts files
- Remove skipped tests documenting unsupported features in jest, vitest, and playwright examples
