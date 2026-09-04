---
"executable-stories-vitest": patch
---

Supports Vitest 5 alongside Vitest 4. The adapter, reporter and per-step
assertion counts all work unchanged on both, and CI now runs the suite against
each end of the declared `>=4.1.5` range. Docs and skills state the supported
versions.
