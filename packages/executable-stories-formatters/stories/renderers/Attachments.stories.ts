import { renderAttachments } from "../../src/formatters/html/renderers/attachments";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = { title: "Renderers/Attachments" };
export default meta;

// 1x1 transparent PNG
const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";

// 1x1 red PNG
const redPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

export const TextLog: StoryObj = {
  render: () =>
    renderAttachments(
      {
        attachments: [
          {
            name: "console.log",
            mediaType: "text/plain",
            body: "https://example.com/artifacts/console.log",
            contentEncoding: "IDENTITY",
          },
        ],
      },
      { escapeHtml, embedScreenshots: false },
    ),
};

export const EmbeddedImage: StoryObj = {
  render: () =>
    renderAttachments(
      {
        attachments: [
          {
            name: "screenshot.png",
            mediaType: "image/png",
            body: redPng,
            contentEncoding: "BASE64",
          },
        ],
      },
      { escapeHtml, embedScreenshots: true },
    ),
};

export const MultipleMixed: StoryObj = {
  render: () =>
    renderAttachments(
      {
        attachments: [
          {
            name: "before.png",
            mediaType: "image/png",
            body: tinyPng,
            contentEncoding: "BASE64",
          },
          {
            name: "after.png",
            mediaType: "image/png",
            body: redPng,
            contentEncoding: "BASE64",
          },
          {
            name: "trace.json",
            mediaType: "application/json",
            body: "trace.json",
            contentEncoding: "IDENTITY",
          },
        ],
      },
      { escapeHtml, embedScreenshots: true },
    ),
};

export const Empty: StoryObj = {
  render: () => {
    const html = renderAttachments(
      { attachments: [] },
      { escapeHtml, embedScreenshots: true },
    );
    return (
      html ||
      '<p style="color:var(--muted-foreground)">No attachments — nothing rendered.</p>'
    );
  },
};
