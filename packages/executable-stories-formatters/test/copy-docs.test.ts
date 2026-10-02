import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs build script, no types
import { flatten } from "../scripts/copy-docs.mjs";

describe("copy-docs flatten", () => {
  it("turns Starlight components into markdown and leaves code fences alone", () => {
    const mdx = [
      "import { Tabs, TabItem } from '@astrojs/starlight/components';",
      "",
      '<Tabs syncKey="pkg">',
      '<TabItem label="npm">',
      "",
      "````markdown",
      "<TabItem label=\"kept\">",
      "```json",
      "{}",
      "```",
      "````",
      "",
      "</TabItem>",
      "</Tabs>",
      "",
      '<Aside type="caution" title="Heads up">',
      "Body.",
      "</Aside>",
      "",
      '<LinkCard title="Install" href="/getting-started/install/" />',
      '<ReportScreenshot src="x.png"',
      '  alt="y" />',
    ].join("\n");

    expect(flatten(mdx)).toBe(
      [
        "",
        "",
        "**npm**",
        "",
        "````markdown",
        '<TabItem label="kept">',
        "```json",
        "{}",
        "```",
        "````",
        "",
        "> **Heads up**",
        "Body.",
        "",
        "- [Install](/getting-started/install/)",
        "",
      ].join("\n"),
    );
  });
});
