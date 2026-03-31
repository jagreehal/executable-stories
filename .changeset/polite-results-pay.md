---
'executable-stories-playwright': patch
'executable-stories-cypress': patch
'executable-stories-vitest': patch
'executable-stories-jest': patch
---

fix: move executable-stories-formatters from peerDependencies to dependencies

All JS adapters runtime-require executable-stories-formatters. Using workspace:*
in dependencies ensures pnpm resolves it locally during development and replaces
it with the real version at publish time. Prevents changesets from bumping to
unpublished versions.
