/**
 * Unit tests for renderAttachments (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import { renderAttachments } from "../../../../src/formatters/html/renderers/attachments";

describe("renderAttachments", () => {
  it("returns empty string when no attachments", () => {
    const html = renderAttachments(
      { attachments: [] },
      { escapeHtml: (s) => s, embedScreenshots: true },
    );
    expect(html).toBe("");
  });

  it("renders link attachment when not image or embed off", () => {
    const html = renderAttachments(
      {
        attachments: [
          {
            name: "log.txt",
            mediaType: "text/plain",
            body: "data:text/plain;base64,abc",
            contentEncoding: "BASE64",
          },
        ],
      },
      { escapeHtml: (s) => s, embedScreenshots: true },
    );
    expect(html).toContain('<div class="attachments">');
    expect(html).toContain('class="attachment"');
    expect(html).toContain("log.txt");
  });

  it("passes name through escapeHtml", () => {
    const escaped: string[] = [];
    renderAttachments(
      {
        attachments: [
          {
            name: "<script>",
            mediaType: "text/plain",
            body: "x",
            contentEncoding: "IDENTITY",
          },
        ],
      },
      {
        escapeHtml: (s) => {
          escaped.push(s);
          return `[${s}]`;
        },
        embedScreenshots: false,
      },
    );
    expect(escaped).toContain("<script>");
  });

  it("renders video attachment inline when embedScreenshots true and base64", () => {
    const html = renderAttachments(
      {
        attachments: [
          {
            name: "recording.webm",
            mediaType: "video/webm",
            body: "dummy-base64",
            contentEncoding: "BASE64",
          },
        ],
      },
      { escapeHtml: (s) => s, embedScreenshots: true },
    );
    expect(html).toContain('<div class="attachments">');
    expect(html).toContain('class="attachment-video"');
    expect(html).toContain('controls');
    expect(html).toContain('data:video/webm;base64,dummy-base64');
    expect(html).toContain("recording.webm");
  });

  it("renders video attachment inline when embedScreenshots true and URL", () => {
    const html = renderAttachments(
      {
        attachments: [
          {
            name: "recording.mp4",
            mediaType: "video/mp4",
            body: "https://example.com/recording.mp4",
            contentEncoding: "IDENTITY",
          },
        ],
      },
      { escapeHtml: (s) => s, embedScreenshots: true },
    );
    expect(html).toContain('class="attachment-video"');
    expect(html).toContain('controls');
    expect(html).toContain("https://example.com/recording.mp4");
  });

  it("renders video as link when embedScreenshots false", () => {
    const html = renderAttachments(
      {
        attachments: [
          {
            name: "recording.mp4",
            mediaType: "video/mp4",
            body: "https://example.com/recording.mp4",
            contentEncoding: "IDENTITY",
          },
        ],
      },
      { escapeHtml: (s) => s, embedScreenshots: false },
    );
    expect(html).not.toContain("attachment-video");
    expect(html).toContain('<a class="attachment"');
    expect(html).toContain("recording.mp4");
  });
});
