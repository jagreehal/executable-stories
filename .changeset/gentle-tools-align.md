---
---

Type-check scripts rely on the workspace build graph rather than spawning their own package builds, so a declaration file is never rewritten while another task is reading it. No published behaviour changes.
