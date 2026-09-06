---
name: demo-video
description: Use when someone wants a narrated demo video of what the suite does — a release walkthrough, a stakeholder demo, a "show the client what we shipped". Builds the video from a run's storyboard frames and step text, so the scenes are screenshots that a passing scenario produced and the narration is the steps, not a script someone wrote about the product.
---

# Demo Video

A video is the least checkable artifact you can ship. Nobody diffs it, nothing fails when
it goes wrong, and it keeps playing confidently for months after the behaviour moved.

That is survivable on exactly one condition: **the video is generated from a run, never
filmed by hand.** The scenes are screenshots a passing scenario produced. The narration is
the step text. Regenerating is one command, so a stale video is a bug you fix rather than a
recording you re-shoot.

If you find yourself driving a browser to capture scenes, stop. You are filming a second
run that nothing verified, next to a real one that already has the frames.

## What you do not build

| Piece | Already there |
| --- | --- |
| Scene list, in order | `deriveStoryboard()` in `executable-stories-core`, or the steps in the StoryReport JSON |
| Narration script | the step's `text` |
| Screen recording | Playwright `story.init(testInfo, { featureVideo: true })` promotes the `.webm` with no per-test call (needs `video: "on"` in the Playwright config) |
| Attaching the file | `story.video({ path, caption, poster })` |
| Shipping the file | `--asset-mode copy` bundles referenced local media into `assets/` beside the report and rewrites the paths |
| Hosting | the user's, already: it is a folder. Or `executable-stories share` |

So this skill is TTS plus ffmpeg. No uploader, no bucket, no CDN code.

If the ask is just "show the app running", there may be nothing to build at all: turn on
`featureVideo` and you have a playable walkthrough in the report today. Narration is the
only reason to go further.

## Decide the path first

The doc entry is declared while the test runs; the MP4 is produced after it. So the path is
a convention agreed up front, not a discovery:

```ts
story.video({
  path: `reports/video/${scenarioId}.mp4`,
  caption: "Narrated walkthrough",
});
```

The first run references a file that does not exist yet, so it needs
`--allow-missing-assets` (it warns instead of failing). Every run after that bundles clean.

## 1. Pull the frames

```bash
executable-stories format reports/raw-run.json --format story-report-json \
  --output-dir reports --output-name index

jq -r --arg id "$SCENARIO_ID" '
  .features[].scenarios[] | select(.id == $id) | .steps[]
  | [ .keyword, .text, ((.docEntries[]? | select(.kind == "screenshot") | .path) // "") ]
  | @tsv' reports/index.story-report.json
```

That is the storyboard: one line per step, with the screenshot when the step captured one.

- A step with no screenshot has no frame. Skip it, and fold its text into the next frame's
  narration so the sentence still lands.
- A scenario with no screenshots at all has nothing to show. Say so and stop. The fix is
  `story.screenshot()` in the test, not a picture you draw.
- Only use scenarios that **passed**. A frame from a failing step is a screenshot of the
  bug, which is a fine thing to show a developer and the wrong thing to put in a demo.

## 2. Write the narration from the steps

The step text is already a sentence in the domain's language, written by whoever specified
the behaviour. Light polish is fine: expand an abbreviation, join a `Given` and its `And`,
drop the keyword when it reads awkwardly aloud.

What you must not do is add a claim. A sentence like "and this scales to thousands of
concurrent users" has no scenario behind it, and once it is spoken over a screenshot nobody
can tell it apart from the sentences that do. If the demo needs a claim the suite does not
make, either write the scenario or leave the claim out.

## 3. Generate the audio

Zero-key defaults, one file per frame:

```bash
# macOS
say -o reports/video/frame-01.aiff "Given a customer with an expired card."

# Linux
espeak-ng -w reports/video/frame-01.wav "Given a customer with an expired card."
```

A hosted voice sounds better and swaps in at the same seam. Whatever you use:

- **Generate sequentially, never in parallel.** Hosted TTS APIs commonly reject concurrent
  requests from one key, sometimes with an error about the token rather than the rate.
  Chain the calls with `&&`.
- **Check the file size after every call.** A real clip is tens of kilobytes. A file of a
  few bytes is an error response that the pipeline will happily encode into silence. Fail
  loudly instead.
- **Watch the per-request character limit** (typically ~2,000). Split long narration and
  concatenate the clips.

Example of a hosted call, as one shape among many rather than the contract:

```bash
curl -s -X POST "https://api.inworld.ai/tts/v1/voice" \
  -H "Authorization: Basic ${INWORLD_API_KEY}" -H "Content-Type: application/json" \
  -d '{"text":"...","voiceId":"...","modelId":"inworld-tts-1.5-max",
       "audioConfig":{"audioEncoding":"MP3","sampleRateHertz":22050}}' \
  | jq -r '.audioContent' | base64 --decode > reports/video/frame-01.mp3
```

## 4. Stitch

One still per frame, held for the length of its audio:

```bash
ffmpeg -loop 1 -i frame-01.png -i frame-01.aiff \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  -c:v libx264 -tune stillimage -c:a aac -ar 22050 -b:a 128k \
  -pix_fmt yuv420p -shortest -y frame-01.mp4
```

The `scale` filter is not decoration: `yuv420p` needs even dimensions, and a screenshot at
an odd pixel width makes `libx264` fail with an error that reads like a codec problem.

Then concatenate:

```bash
printf "file 'frame-01.mp4'\nfile 'frame-02.mp4'\n" > concat.txt
ffmpeg -f concat -safe 0 -i concat.txt -c copy -y "reports/video/${SCENARIO_ID}.mp4"
```

Frames must share dimensions for `-c copy` to work. Playwright screenshots from one project
already do; a mixed set needs a common `scale` in the per-frame command.

**Delegate this step to a background subagent.** TTS and ffmpeg emit hundreds of lines that
teach nobody anything, and there is no reason for them to occupy the conversation. Hand the
subagent the frame list, the narration lines, and the output path.

## 5. Bundle and open

```bash
executable-stories format reports/raw-run.json --format html \
  --asset-mode copy --allow-missing-assets --output-dir reports --open
```

The video now travels with the report: copied into `assets/`, path rewritten in both the
static markup and the embedded JSON the interactive island re-renders from. Where the
report goes after that is the user's decision, the same as every other report they publish.

## Keep it from rotting

- Regenerate in the same command as the test run, or do not ship it. A video generated by
  hand once is the artifact this skill exists to prevent.
- Put the commit and date in the `caption`, so a viewer can see what they are watching.
- Never hand-edit the MP4. If the demo is wrong, the scenario or the screenshot is wrong.

## Neighbouring skills

- `audience-views` decides who the walkthrough is for before you narrate anything.
- `show-me` answers a question now, in the conversation. This one produces something to
  send to someone who is not in the room.
- `release-notes` covers the same "what shipped" question in text, which is diffable. Reach
  for the video only when someone genuinely needs to watch it.
