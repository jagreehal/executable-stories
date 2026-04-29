---
"eslint-plugin-executable-stories-jest": patch
"eslint-plugin-executable-stories-playwright": patch
"eslint-plugin-executable-stories-vitest": patch
"executable-stories-cypress": patch
"executable-stories-formatters": patch
"executable-stories-jest": patch
"executable-stories-playwright": patch
"executable-stories-vitest": patch
---

Update dependencies. Align `@playwright/test` peer/dev versions across packages and example apps to `^1.59.1` to avoid loading two Playwright copies in the same process.
