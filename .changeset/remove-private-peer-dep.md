---
'eslint-plugin-executable-stories-jest': patch
'eslint-plugin-executable-stories-playwright': patch
'eslint-plugin-executable-stories-vitest': patch
---

Remove the peer dependency on `eslint-config-executable-stories`. That package is private and never published, so npm (which auto-installs peer dependencies) failed to resolve it when installing the plugins. The plugins never import it; it is only the monorepo's internal shared lint config.
