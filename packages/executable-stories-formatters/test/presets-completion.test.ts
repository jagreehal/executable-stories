import { describe, expect, it } from "vitest";

import { completionScript, COMPLETION_SUBCOMMANDS } from "../src/completion";
import { expandPreset, FORMAT_PRESETS, PRESET_NAMES, presetHelpLines } from "../src/presets";
import { openCommand, pickOpenTarget } from "../src/open-report";
import { summaryLine } from "../src/summary-line";

describe("expandPreset", () => {
  it("expands a preset to its formats", () => {
    expect(expandPreset("agent", ["html"], false).formats).toEqual([...FORMAT_PRESETS.agent]);
  });

  it("ignores the parser's default format so presets aren't polluted by 'html'", () => {
    // --format was NOT typed by the user; its "html" default must not leak in.
    const { formats } = expandPreset("ci", ["html"], false);
    expect(formats).toEqual([...FORMAT_PRESETS.ci]);
    expect(formats).not.toContain("html");
  });

  it("unions a preset with formats the user actually typed", () => {
    const { formats } = expandPreset("ci", ["html"], true);
    expect(formats).toEqual(["junit", "story-report-json", "html"]);
  });

  it("de-duplicates when an explicit format is already in the preset", () => {
    const { formats } = expandPreset("ci", ["junit"], true);
    expect(formats).toEqual(["junit", "story-report-json"]);
  });

  it("passes formats through untouched when no preset is given", () => {
    expect(expandPreset(undefined, ["markdown"], true)).toEqual({ formats: ["markdown"] });
  });

  it("reports an unknown preset without mangling the formats", () => {
    const result = expandPreset("nope", ["html"], true);
    expect(result.error).toContain('Unknown preset "nope"');
    expect(result.error).toContain("agent, ci, docs");
    expect(result.formats).toEqual(["html"]);
  });

  it("documents every preset in help", () => {
    const lines = presetHelpLines();
    expect(lines).toHaveLength(PRESET_NAMES.length);
    for (const name of PRESET_NAMES) {
      expect(lines.some((l) => l.startsWith(name))).toBe(true);
    }
  });
});

describe("completionScript", () => {
  // A completion that silently drifts from the CLI is worse than none, so the
  // generated script must mention every subcommand the list declares.
  it.each(["bash", "zsh", "fish"] as const)("%s script lists every subcommand", (shell) => {
    const script = completionScript(shell);
    for (const [name] of COMPLETION_SUBCOMMANDS) {
      expect(script).toContain(name);
    }
  });

  it("emits a zsh compdef header and a bash complete registration", () => {
    expect(completionScript("zsh")).toMatch(/^#compdef executable-stories/);
    expect(completionScript("bash")).toContain("complete -F _executable_stories executable-stories");
  });

  it("suggests real values for closed-set flags", () => {
    const zsh = completionScript("zsh");
    expect(zsh).toContain("story-report-json");
    expect(zsh).toContain("agent ci docs");
  });
});

describe("summaryLine", () => {
  const clean = { passed: 3, failed: 0, skipped: 0, pending: 0 };

  it("leads with ✔ and stays short when everything passed", () => {
    expect(summaryLine(clean, ["reports/index.html"], 12)).toBe(
      "✔ 3 scenarios (3 passed) → reports/index.html in 12ms",
    );
  });

  it("leads with ✖ and names every non-zero status when something failed", () => {
    expect(summaryLine({ passed: 3, failed: 1, skipped: 2, pending: 1 }, ["r.html"], 5)).toBe(
      "✖ 7 scenarios (3 passed, 1 failed, 2 skipped, 1 pending) → r.html in 5ms",
    );
  });

  it("makes an empty run visible rather than looking like success", () => {
    expect(summaryLine({ passed: 0, failed: 0, skipped: 0, pending: 0 }, [], 1)).toBe(
      "✔ 0 scenarios (0 passed) in 1ms",
    );
  });

  it("singularises a one-scenario run", () => {
    expect(summaryLine({ passed: 1, failed: 0, skipped: 0, pending: 0 }, [], 1)).toContain("1 scenario (");
  });

  it("lists every written file", () => {
    expect(summaryLine(clean, ["a.html", "b.md"], 9)).toContain("→ a.html, b.md");
  });
});

describe("--open", () => {
  it("picks the HTML report out of the written files", () => {
    expect(pickOpenTarget(["reports/index.junit.xml", "reports/index.html"])).toBe("reports/index.html");
  });

  it("returns nothing when no HTML was generated, so the caller can explain", () => {
    expect(pickOpenTarget(["reports/index.md"])).toBeUndefined();
  });

  it("uses the platform opener", () => {
    expect(openCommand("darwin").command).toBe("open");
    expect(openCommand("linux").command).toBe("xdg-open");
    expect(openCommand("win32")).toEqual({ command: "cmd", args: ["/c", "start", ""] });
  });
});
