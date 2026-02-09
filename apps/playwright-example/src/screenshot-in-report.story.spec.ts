/**
 * Example: capture a screenshot and show it in the generated story report.
 * test() + story.init(testInfo) + story.screenshot({ path, alt }).
 */
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

const SCREENSHOT_PATH = 'screenshots/dashboard.png';
const DOC_IMAGE_PATH = '../screenshots/dashboard.png';

test('Screenshot appears in generated report', async ({ page }, testInfo) => {
  story.init(testInfo);

  story.given('user is on a page');
  await page.setContent(
    '<!DOCTYPE html><html><body><h1>Hello</h1><p>This page is screenshot and linked in the story report.</p></body></html>',
  );

  story.when('user sees the content');
  await page.screenshot({ path: SCREENSHOT_PATH });
  story.screenshot({ path: DOC_IMAGE_PATH, alt: 'Dashboard / example page' });

  story.then('the screenshot is in the story report');
});

test('Video is recorded and linked in report', async ({ page }, testInfo) => {
  story.init(testInfo);

  story.given('user is on a page');
  await page.setContent(
    '<!DOCTYPE html><html><body><h1>Video example</h1></body></html>',
  );

  story.when('the step runs');

  story.then('video path is in the story report');
  const testInfoWithVideo = testInfo as {
    video?: () => { path(): Promise<string> } | { path(): Promise<string> };
  };
  const video =
    typeof testInfoWithVideo.video === 'function'
      ? testInfoWithVideo.video()
      : testInfoWithVideo.video;
  if (video) {
    const videoPath = await video.path();
    story.kv({ label: 'Video (this step)', value: videoPath });
  }
  story.note(
    'Videos are under test-results/; run `pnpm test:ui` or open playwright-report/ to watch.',
  );
});
