---
"executable-stories-trackers": minor
"executable-stories-linear": minor
---

New: `npx executable-stories-linear publish` puts a run on the Linear issues your stories name (`ticket: 'PAY-12'`). Each issue gets one Quality checks attachment per scope, updated in place every run, and its modal lists the scenarios with their steps, failures and assertions. `executable-stories-trackers` holds the tracker-agnostic part: group a run by ticket, word a status, post it through a `TrackerClient`.
