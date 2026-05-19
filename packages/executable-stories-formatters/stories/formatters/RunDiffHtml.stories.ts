import { RunDiffHtmlFormatter } from "../../src/formatters/run-diff-html";
import { toScenarioSnapshot } from "../../src/types/compare";
import type { RunDiffResult, ScenarioDiff } from "../../src/types/compare";
import type { TestRunResult } from "../../src/types/test-result";
import {
  passedScenario,
  failedScenario,
  createFixtureRun,
} from "../fixtures";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Formatters/RunDiffHtml",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Output of the run-diff HTML formatter — comparison view between a baseline run and a current run. Rendered in an iframe because the formatter emits a full HTML document.",
      },
    },
  },
};
export default meta;

function noFlags(): ScenarioDiff["flags"] {
  return {
    status: false,
    steps: false,
    docs: false,
    tags: false,
    tickets: false,
    source: false,
    duration: false,
    attachments: false,
    error: false,
    titlePath: false,
  };
}

function emptyRun(): TestRunResult {
  const r = createFixtureRun([]);
  return r;
}

function buildDiff(scenarios: ScenarioDiff[]): RunDiffResult {
  const summary = {
    totalBaseline: scenarios.filter((s) => s.baseline).length,
    totalCurrent: scenarios.filter((s) => s.current).length,
    added: scenarios.filter((s) => s.kind === "added").length,
    removed: scenarios.filter((s) => s.kind === "removed").length,
    changed: scenarios.filter((s) => s.kind === "changed").length,
    regressed: scenarios.filter((s) => s.kind === "regressed").length,
    fixed: scenarios.filter((s) => s.kind === "fixed").length,
    unchanged: scenarios.filter((s) => s.kind === "unchanged").length,
  };
  return {
    baseline: emptyRun(),
    current: emptyRun(),
    summary,
    scenarios,
  };
}

function inIframe(html: string): HTMLElement {
  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.minHeight = "100vh";
  iframe.style.border = "0";
  iframe.srcdoc = html;
  return iframe;
}

function regressedDiff(): ScenarioDiff {
  const passed = passedScenario();
  const failed = failedScenario({ id: passed.id });
  return {
    kind: "regressed",
    id: passed.id,
    scenario: passed.story.scenario,
    sourceFile: passed.sourceFile,
    sourceLine: passed.sourceLine,
    baseline: toScenarioSnapshot(passed),
    current: toScenarioSnapshot(failed),
    flags: { ...noFlags(), status: true, error: true },
    changedFields: ["status", "error"],
    durationDeltaMs: failed.durationMs - passed.durationMs,
  };
}

function fixedDiff(): ScenarioDiff {
  const failed = failedScenario({
    id: "fix-1",
    story: { ...failedScenario().story, scenario: "API now returns 200" },
  });
  const passed = passedScenario({
    id: "fix-1",
    story: { ...passedScenario().story, scenario: "API now returns 200" },
  });
  return {
    kind: "fixed",
    id: "fix-1",
    scenario: "API now returns 200",
    sourceFile: passed.sourceFile,
    sourceLine: passed.sourceLine,
    baseline: toScenarioSnapshot(failed),
    current: toScenarioSnapshot(passed),
    flags: { ...noFlags(), status: true },
    changedFields: ["status"],
  };
}

function addedDiff(): ScenarioDiff {
  const tc = passedScenario({
    id: "add-1",
    story: { ...passedScenario().story, scenario: "New scenario for SSO" },
  });
  return {
    kind: "added",
    id: tc.id,
    scenario: tc.story.scenario,
    sourceFile: tc.sourceFile,
    sourceLine: tc.sourceLine,
    current: toScenarioSnapshot(tc),
    flags: noFlags(),
    changedFields: [],
  };
}

function removedDiff(): ScenarioDiff {
  const tc = passedScenario({
    id: "rm-1",
    story: { ...passedScenario().story, scenario: "Legacy logout flow" },
  });
  return {
    kind: "removed",
    id: tc.id,
    scenario: tc.story.scenario,
    sourceFile: tc.sourceFile,
    sourceLine: tc.sourceLine,
    baseline: toScenarioSnapshot(tc),
    flags: noFlags(),
    changedFields: [],
  };
}

export const Regressions: StoryObj = {
  render: () => {
    const formatter = new RunDiffHtmlFormatter({ title: "Run Comparison" });
    const html = formatter.format(buildDiff([regressedDiff(), regressedDiff()]));
    return inIframe(html);
  },
};

export const FixedOnly: StoryObj = {
  render: () => {
    const formatter = new RunDiffHtmlFormatter({ title: "Run Comparison" });
    const html = formatter.format(buildDiff([fixedDiff(), fixedDiff()]));
    return inIframe(html);
  },
};

export const MixedChanges: StoryObj = {
  render: () => {
    const formatter = new RunDiffHtmlFormatter({ title: "Run Comparison" });
    const html = formatter.format(
      buildDiff([
        regressedDiff(),
        fixedDiff(),
        addedDiff(),
        removedDiff(),
      ]),
    );
    return inIframe(html);
  },
};

export const NoChanges: StoryObj = {
  render: () => {
    const formatter = new RunDiffHtmlFormatter({ title: "Run Comparison" });
    const html = formatter.format(buildDiff([]));
    return inIframe(html);
  },
};
