# executable-stories-trackers

The tracker-agnostic base for putting an [executable-stories](https://github.com/jagreehal/executable-stories) run on the tickets its stories name. Used by [executable-stories-linear](../executable-stories-linear); a Jira or GitHub Issues package implements the same interface.

```ts
import { publishRun, readRun, type TrackerClient } from "executable-stories-trackers";

const client: TrackerClient = {
  name: "My tracker",
  owns: (ticket) => /^[A-Z]+-\d+$/.test(ticket.id),
  postStatus: async (status) => {
    // status.ticket "PAY-12", status.title "CI main: 3 passed, 1 failed", status.resolved,
    // status.stableUrl (same every run of this scope: update, don't add), status.runUrl
  },
};

const result = await publishRun({ report: readRun(text), client, scope: "CI main", link: repoUrl });
// { posted: ["PAY-12"], failed: [{ ticket: "PAY-404", error: "…" }], statuses }
```

- `readRun(text)` reads a raw run (as the reporters write it) or a StoryReport.
- `ticketStatuses(...)` groups scenarios by ticket and words one status each, without posting.
- `publishRun(...)` posts them one at a time; a ticket the tracker refuses is reported, never thrown.

Nothing here talks to a network: the client does, with whatever `fetch` it is given.
