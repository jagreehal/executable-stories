import { renderMetaInfo } from "../../src/formatters/html/renderers/meta";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = { title: "Renderers/MetaInfo" };
export default meta;

const deps = { escapeHtml };
const startedAtMs = Date.UTC(2026, 4, 19, 9, 30, 0);

export const Minimal: StoryObj = {
  render: () =>
    renderMetaInfo(
      { startedAtMs, durationMs: 3450 },
      deps,
    ),
};

export const WithGitAndVersion: StoryObj = {
  render: () =>
    renderMetaInfo(
      {
        startedAtMs,
        durationMs: 12_840,
        packageVersion: "0.7.15",
        gitSha: "abc123def4567890",
      },
      deps,
    ),
};

export const FullCi: StoryObj = {
  name: "Full CI metadata",
  render: () =>
    renderMetaInfo(
      {
        startedAtMs,
        durationMs: 25_600,
        packageVersion: "0.7.15",
        gitSha: "abc123def4567890",
        ciName: "GitHub Actions",
        ciBranch: "main",
        ciUrl: "https://github.com/example/repo/actions/runs/12345",
        ciBuildNumber: "1234",
        ciCommitSha: "abc123def4567890",
      },
      deps,
    ),
};
