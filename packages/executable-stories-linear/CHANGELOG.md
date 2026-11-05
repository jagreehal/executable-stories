# executable-stories-linear

## 0.3.0

### Minor Changes

- 4cb1062: `publish --videos <dir>` uploads each scenario's MP4 into Linear and attaches it to the issues the scenario names, one video per scenario and scope. Publishing the same file uploads nothing, and a changed file replaces the old attachment.

## 0.2.0

### Minor Changes

- 2c0add2: New: `npx executable-stories-linear publish` puts a run on the Linear issues your stories name (`ticket: 'PAY-12'`). Each issue gets one Quality checks attachment per scope, updated in place every run, and its modal lists the scenarios with their steps, failures and assertions. `executable-stories-trackers` holds the tracker-agnostic part: group a run by ticket, word a status, post it through a `TrackerClient`.

### Patch Changes

- Updated dependencies [2c0add2]
  - executable-stories-trackers@0.2.0
