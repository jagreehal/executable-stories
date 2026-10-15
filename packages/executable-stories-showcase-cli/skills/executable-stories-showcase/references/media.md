# Screenshots and videos for docs and websites

## Screenshots

```bash
npx executable-stories-showcase shoot src/scenarios --base-url http://localhost:5173 --out shots \
  --no-panel --viewport 1440x900 --scale 2 --color-scheme dark --element main
```

- `--no-panel` hides the dev panel. `--scale 2` gives sharp images on high-density screens.
- `--element <selector>` captures one component instead of the full page.
- A scenario's `viewport` overrides `--viewport`, so phone and desktop layouts shoot in one run.
- `--locale` (BCP 47: `en-GB`, `de-DE`, `ar-EG`, `hi-IN`, `ja-JP`, `pt-BR`) and `--timezone` (IANA:
  `Europe/Berlin`, `Asia/Kolkata`, `America/Sao_Paulo`) set what `Intl`, `Date` and
  `navigator.language` report. Set both, or shots change with each machine's settings. Run once
  per market to show dates, numbers, currencies and right-to-left layouts as people there see them.

## Videos

```ts
// steps.ts: scenario name → what to do once it is ready
import type { Page } from '@playwright/test';

export default {
  'search-no-results': async (page: Page) => {
    await page.getByRole('searchbox').click();
    await page.keyboard.type('Atlantis', { delay: 100 });
  },
};
```

```bash
npx executable-stories-showcase record src/scenarios --base-url http://localhost:5173 --steps steps.ts --format mp4
```

- The panel is hidden and a pulsing arrow cursor is drawn (Playwright videos don't show the
  mouse). Each locator click waits for the cursor to reach its target, then sends out a ripple.
- The video starts once the scenario is ready, so the page load isn't in it, and holds the last
  frame for `--hold` ms.
- `--format mp4` (default) plays in every browser and phone at a fraction of a GIF's size; use it
  on websites. `--format gif` for READMEs and other image-only places. `--element` crops: the
  element is scrolled into view first, and one larger than the viewport is cut to the visible part
  (use a larger `--viewport`). Steps that scroll the page move the element out of the crop.
- To give each scenario its own crop in one run, map it to `{ element, steps }`:
  `'statements': { element: '.statements', steps: async (page) => {} }`. Its `element` overrides
  `--element`.
- For smaller files, `--width 900` scales the video down to 900px wide (height follows) and
  `--fps 8` sets the frame rate. GIFs default to 12 fps; MP4 and WebM keep the recorded rate.
- `--hold 1500` keeps the final frame up for 1.5 s before a GIF loops (default 800), so steps can
  end on their last action.
- Video records at viewport size and `--scale` applies to screenshots. For a sharp hero video,
  record a larger `--viewport` and scale it down with `--width`.
- Each video gets `<name>.video.json`: name, description, file, size, `durationMs` and clicks
  (`t` in ms, `x`/`y` in video pixels after the crop and `--width`; iframe clicks map to the
  page). `RecordingVideo` from `executable-stories-remotion` reads it to caption each clip and
  zoom to its clicks in Remotion. Add a short `page.waitForTimeout` before each click so the
  zoom has time to arrive.
- MP4, GIF, `--element`, `--fps` and `--width` need ffmpeg on `PATH`, or `FFMPEG_PATH`. Plain WebM
  doesn't.
- `--cursor dot` or `--cursor pointer.svg` swaps the default pulsing arrow; `--cursor-color '#00b3ff'` recolors it.
- Act with locators (`page.getByRole(...).click()`, `.fill()`): during `record` each locator click,
  check, fill, `pressSequentially` and `selectOption` waits for the cursor to glide to its target first.
  `page.mouse.click(x, y)` doesn't wait.
- In your own Playwright scripts, `showCursor(page)` from `executable-stories-showcase/playwright` draws the
  cursor (a pulsing arrow by default; `{ pointer: 'dot' | svgMarkup, color, size: 1.5, halo: false }` to
  change it, `glide: true` to wait for it like `record` does); call it before
  `openScenario(page, name, { panel: false })`. `glideBeforeActions(page)` is the glide on its own.

Use demo data in scenarios meant for public images: fictional names, no real customer records.
