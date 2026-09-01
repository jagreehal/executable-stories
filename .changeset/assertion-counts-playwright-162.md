---
'executable-stories-playwright': patch
---

Keep counting assertions on Playwright 1.62

Playwright 1.62 removed `expect.getState().assertionCalls`, the live counter
the per-step assertion count was read from. Nothing failed loudly — the count
simply became unobservable, and every report quietly stopped showing how many
assertions stood behind a claim.

The reader now falls back to counting the `expect`-category steps Playwright
still records on the test, and keeps using the old counter where it exists, so
the behaviour is identical on 1.59 through 1.62. When neither is readable the
count stays `undefined` — unobserved, never a false zero.
