/**
 * Tests for deduplicateVideoAttachments.
 *
 * Playwright with `video: "on"` may attach multiple video files per test
 * (e.g. video.webm and video-1.webm). Only the last per name should be kept.
 */
import { expect, test } from "@playwright/test";
import { deduplicateVideoAttachments } from "../reporter";
import type { RawAttachment } from "executable-stories-formatters";

function makeAttachment(
  overrides: Partial<RawAttachment> & { name: string; mediaType: string },
): RawAttachment {
  return { ...overrides };
}

test.describe("deduplicateVideoAttachments", () => {
  test("returns empty array for empty input", () => {
    expect(deduplicateVideoAttachments([])).toEqual([]);
  });

  test("preserves non-video attachments unchanged", () => {
    const attachments: RawAttachment[] = [
      makeAttachment({ name: "screenshot", mediaType: "image/png", body: "abc" }),
      makeAttachment({ name: "a11y-scan", mediaType: "application/json", body: "{}" }),
    ];
    expect(deduplicateVideoAttachments(attachments)).toEqual(attachments);
  });

  test("keeps single video attachment as-is", () => {
    const attachments: RawAttachment[] = [
      makeAttachment({ name: "video", mediaType: "video/webm", path: "/tmp/video.webm" }),
    ];
    expect(deduplicateVideoAttachments(attachments)).toEqual(attachments);
  });

  test("deduplicates two video attachments with the same name, keeping the last", () => {
    const stub: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/webm",
      path: "/tmp/video-1.webm",
    });
    const real: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/webm",
      path: "/tmp/video.webm",
    });
    const result = deduplicateVideoAttachments([stub, real]);
    expect(result).toEqual([real]);
  });

  test("preserves non-video attachments alongside deduplicated videos", () => {
    const a11y: RawAttachment = makeAttachment({
      name: "a11y-scan",
      mediaType: "application/json",
      body: "[]",
    });
    const videoStub: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/webm",
      path: "/tmp/video-1.webm",
    });
    const videoReal: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/webm",
      path: "/tmp/video.webm",
    });

    const result = deduplicateVideoAttachments([a11y, videoStub, videoReal]);
    expect(result).toEqual([a11y, videoReal]);
  });

  test("deduplicates videos with different names independently", () => {
    const screencastStub: RawAttachment = makeAttachment({
      name: "screencast",
      mediaType: "video/webm",
      path: "/tmp/screencast-1.webm",
    });
    const screencastReal: RawAttachment = makeAttachment({
      name: "screencast",
      mediaType: "video/webm",
      path: "/tmp/screencast.webm",
    });
    const videoStub: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/webm",
      path: "/tmp/video-1.webm",
    });
    const videoReal: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/webm",
      path: "/tmp/video.webm",
    });

    const result = deduplicateVideoAttachments([
      screencastStub, screencastReal, videoStub, videoReal,
    ]);
    expect(result).toEqual([screencastReal, videoReal]);
  });

  test("handles video/mp4 media type", () => {
    const stub: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/mp4",
      path: "/tmp/video-1.mp4",
    });
    const real: RawAttachment = makeAttachment({
      name: "video",
      mediaType: "video/mp4",
      path: "/tmp/video.mp4",
    });
    const result = deduplicateVideoAttachments([stub, real]);
    expect(result).toEqual([real]);
  });
});
