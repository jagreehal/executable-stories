---
name: article-walkthrough
description: Turn a help-centre article into a recorded walkthrough video or GIF, generated from a passing Playwright story whose steps use the article's own wording. Use when someone asks for a GIF or video for a docs/help article, or to replace an outdated one.
---

# Article Walkthrough

A help-centre GIF is a promise that the product works the way the article says. Filmed by
hand, it goes stale the day the UI moves and nobody notices. Generated from a passing
scenario, it is regenerated with one command and fails loudly when the steps stop working.

The person asking is often not a developer. They bring an article and a section ("the import
GIF"). You bring the scenario, the recording and the video, and hand back something they can
review without reading code.

## Find the backlog

`executable-stories docs list --csv > backlog.csv` lists every article in the help centre and
each image no slot covers yet. Share it as the team's tracker: who takes which article, and in
what order.

No API key yet? An export of the articles as HTML files works too: point a `markdown` target
at the folder and `docs list` reads the same backlog offline.

## What you need first

- **The article text** and which section the media is for. One article often has several
  GIFs; each is its own scenario.
- **A Playwright suite with executable-stories** (`playwright-story-api`, `playwright-reporter-setup`).
  Use the project's existing fixtures, page objects and sign-in.
- **A controlled environment**: mocked API or a resettable demo account, seeded with
  fictional data, identical on every run. Never record against production data.

If any of these is missing, say which and stop. Do not improvise a demo account.

## 1. Write the scenario from the article

One scenario per media slot. Each step is one sentence of the article, as close to verbatim
as reads naturally, so the video can show the article's own words beside the recording:

```ts
test('add a contact via the interface', async ({ page }, testInfo) => {
  story.init({ page }, testInfo, { featureVideo: true }); // before page.goto
  story.given('Open Contacts from the sidebar.');
  await page.goto('/');
  await page.getByRole('link', { name: 'Contacts' }).click();
  await story.screenshot({ page, alt: 'Contacts list', hold: 1800 });

  story.when('Select New contact and enter their name.');
  // ...
  story.then('Select Save. The contact appears in the list.');
  await expect(page.getByRole('row', { name: /Rowan Hale/ })).toBeVisible();
});
```

- **Every step ends with `story.screenshot({ hold })`.** The hold is a pause only while
  recording, so viewers can read the step. It is also the storyboard frame for the GIF.
- **Assert the outcome the article promises**, not just that a toast appeared. A video of a
  save that silently failed teaches the wrong thing.
- **Do the article's actions only.** Sign-in and setup go before the first step, or are cut
  with `executable-stories video --from-step`.
- **Fictional names only.** Use the seeded dataset; never real customers or staff. Check the
  names once with a person, since a plausible name can belong to someone well known.

### File uploads

The browser cannot film the operating system's file dialog. Do not fake one. Show the click
on the upload control, then the selected file:

```ts
const chooser = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Import' }).click();
await (await chooser).setFiles('fixtures/contacts.xlsx');
await expect(page.getByText('contacts.xlsx')).toBeVisible();
```

Upload a **real, valid fixture file**, and assert the imported rows appear. Attach its
contents with `story.table()` so the video can show the spreadsheet before the recording.

## 2. Run it and read every still

```bash
npx playwright test -g "add a contact via the interface"
executable-stories video reports/raw-run.json --output-dir reports --frames
```

Only a passing scenario gets a video. Read `reports/video/<scenario>/step-NN.jpg` for each
step: it must show what the step's sentence says. Read `step-NN-click.jpg`: the ring must sit
on the control the article names. Fix the scenario, not the still.

## 3. Render

- **GIF for the article body:** `executable-stories gif reports/raw-run.json`.
- **Video with the article beside it:** `<ArticleVideo>` from `executable-stories-remotion`
  (see its README). Steps already in the article's wording need no `quotes`. Remotion has its
  own licence terms for companies; check them before adding it.

## 4. Hand it back for review

Give the requester the GIF or MP4, the article section it is for, and the step list in plain
English. Their comments ("the save button isn't visible", "use the newer wording") become
changes to the scenario, and you re-run. They approve the media, not the code.

## 5. Publish

Add the slot to `docs.json` (article, rendered file, the image it replaces, the scenario):

```json
{
  "target": { "type": "helpscout" },
  "slots": [
    {
      "id": "add-contact",
      "article": "5f1c…",
      "file": "reports/gif/add-a-contact-via-the-interface.gif",
      "replaces": "old-add-contact.gif",
      "scenario": "add a contact via the interface"
    }
  ]
}
```

```bash
executable-stories docs status --report reports/index.story-report.json
executable-stories docs publish --report reports/index.story-report.json
```

Targets: `markdown` (files in a repo), `helpscout` (`HELPSCOUT_API_KEY`), `confluence`
(`CONFLUENCE_BASE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_TOKEN`). Only approved, passing media should reach `publish`:
run it after the review is merged, not from a branch. Commit `docs.lock.json`; it is the record
of what is live where, and the reason the next publish replaces the same image. A slot's
`scenario` must be a title no other scenario in the report shares, or `docs` refuses it.

Keep the scenario in the suite. When the UI changes and it fails, `docs status` shows the slot
as `failing`: the article's media is out of date too, and steps 2–5 replace it.
