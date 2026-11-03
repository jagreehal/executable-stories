---
"executable-stories-formatters": minor
---

`sync xray` works against a real Xray Cloud site, across repeat runs and step updates. Tests that `sync` created report a status per step, and a story `ticket` that is not a test links as a requirement.

Editing a story's steps updates its existing case and keeps the history (`↻ kept`). A `ticket` naming another existing case moves the story there (`→ moved`). `sync` retries a failed case update on the next run.
