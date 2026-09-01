import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tools, type Registry } from "webmcpable";
import { installTestModelContext, type TestModelContext } from "webmcpable/testing";
import type { StoryReport } from "executable-stories-core";
import { DEFAULT_URL_STATE, type ReportUrlState } from "../src/lib/hash-state";
import {
  reportTools,
  type AppliedFilter,
  type ReportToolsDeps,
} from "../src/interactive/webmcp-tools";
import { mixedReport, passingReport } from "./fixtures/sample-report";

/**
 * Every test drives the tools the way an agent does — through
 * `document.modelContext.executeTool` with JSON-string arguments — rather than
 * calling the handlers directly. The double reproduces Chrome's measured
 * behaviour (JSON-string args only, thrown errors replaced with a generic
 * `UnknownError`, results serialised to strings), so a handler that only works
 * when called as a plain function fails here.
 */

let harness: TestModelContext;
let registry: Registry | undefined;

async function mount(overrides: Partial<ReportToolsDeps> = {}) {
  const setView = vi.fn<(patch: Partial<ReportUrlState>) => void>();
  const onAgentFilter = vi.fn<(applied: AppliedFilter) => void>();
  const deps: ReportToolsDeps = {
    report: mixedReport,
    view: DEFAULT_URL_STATE,
    setView,
    onAgentFilter,
    // Fixed clock: the fixtures finish at 1700000003000, so "now" is 2 days on.
    now: () => 1700000003000 + 2 * 86_400_000,
    ...overrides,
  };
  registry = tools(reportTools(deps));
  await registry.mount();
  return { setView, onAgentFilter };
}

/** Invoke a tool exactly as an agent would, and parse what it gets back. */
async function call(name: string, args: Record<string, unknown> = {}) {
  const list = await document.modelContext!.getTools();
  const tool = list.find((t) => t.name === name);
  if (!tool) throw new Error(`tool not registered: ${name}`);
  const raw = await document.modelContext!.executeTool(tool, JSON.stringify(args));
  return JSON.parse(raw) as Record<string, unknown>;
}

/** For the paths that answer with a plain message instead of a JSON payload. */
async function callRaw(name: string, args: unknown) {
  const list = await document.modelContext!.getTools();
  const tool = list.find((t) => t.name === name)!;
  return document.modelContext!.executeTool(
    tool,
    typeof args === "string" ? args : JSON.stringify(args),
  );
}

beforeEach(() => {
  harness = installTestModelContext();
});

afterEach(() => {
  registry?.unmount();
  registry = undefined;
  harness.uninstall();
});

describe("tool registration", () => {
  it("registers the five in-page tools and nothing else", async () => {
    await mount();
    const names = (await document.modelContext!.getTools()).map((t) => t.name);
    expect(names).toEqual([
      "filter_scenarios",
      "get_failing_scenarios",
      "get_feature_summary",
      "get_scenario",
      "list_scenarios",
    ]);
  });

  it("does not register the node-only or backend-only MCP tools", async () => {
    await mount();
    const names = (await document.modelContext!.getTools()).map((t) => t.name);
    for (const absent of ["get_scenario_index", "get_behavior_manifest", "run_scenario"]) {
      expect(names).not.toContain(absent);
    }
  });

  it("marks the reads read-only and their content untrusted", async () => {
    await mount();
    const list = await document.modelContext!.getTools();
    for (const name of [
      "list_scenarios",
      "get_failing_scenarios",
      "get_feature_summary",
      "get_scenario",
    ]) {
      expect(list.find((t) => t.name === name)?.annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
    }
  });

  it("does not mark the view-driving tool read-only", async () => {
    await mount();
    const list = await document.modelContext!.getTools();
    expect(list.find((t) => t.name === "filter_scenarios")?.annotations?.readOnlyHint).not.toBe(
      true,
    );
  });
});

describe("run provenance", () => {
  it("rides on every payload, including the age of the run", async () => {
    await mount();
    for (const name of [
      "list_scenarios",
      "get_failing_scenarios",
      "get_feature_summary",
      "filter_scenarios",
    ]) {
      const payload = await call(name);
      expect(payload["run"]).toMatchObject({ runId: "run-3", ageDays: 2 });
    }
  });

  it("rides on a not-found answer too, so a stale miss is still dated", async () => {
    await mount();
    const payload = await call("get_scenario", { idOrTitle: "nope" });
    expect(payload["run"]).toMatchObject({ ageDays: 2 });
    expect(payload["error"]).toContain("nope");
  });
});

describe("get_failing_scenarios", () => {
  it("returns only the failures, with the failing step's message", async () => {
    await mount();
    const payload = await call("get_failing_scenarios");
    expect(payload["total"]).toBe(1);
    const [scenario] = payload["scenarios"] as Array<Record<string, unknown>>;
    expect(scenario).toMatchObject({
      title: "Delete",
      status: "failed",
      error: { message: "Expected list to be empty after deletion" },
    });
  });

  it("answers with an empty list, not an error, on a green run", async () => {
    await mount({ report: passingReport });
    const payload = await call("get_failing_scenarios");
    expect(payload["total"]).toBe(0);
    expect(payload["scenarios"]).toEqual([]);
  });
});

describe("list_scenarios", () => {
  it("lists every scenario across every feature by default", async () => {
    await mount();
    expect(payloadIds(await call("list_scenarios"))).toEqual([
      "feature-todos--add",
      "feature-todos--delete",
      "feature-auth--login",
    ]);
  });

  it("filters by status", async () => {
    await mount();
    expect(payloadIds(await call("list_scenarios", { statuses: ["skipped"] }))).toEqual([
      "feature-auth--login",
    ]);
  });

  it("filters by tag", async () => {
    await mount();
    expect(payloadIds(await call("list_scenarios", { tags: ["wip"] }))).toEqual([
      "feature-auth--login",
    ]);
  });

  it("accepts a bare string where an array is declared, since agents send one", async () => {
    await mount();
    expect(payloadIds(await call("list_scenarios", { tags: "wip" }))).toEqual([
      "feature-auth--login",
    ]);
  });

  it("filters by source file substring", async () => {
    await mount();
    expect(payloadIds(await call("list_scenarios", { sourceFiles: ["auth"] }))).toEqual([
      "feature-auth--login",
    ]);
  });
});

describe("assertion evidence in tool payloads", () => {
  // A green scenario that asserted nothing is the failure this carries: without
  // it, list_scenarios reports "passed" and an agent reads that as proof.
  const graded = (assertions: number | undefined): StoryReport => ({
    ...passingReport,
    features: passingReport.features.map((f) => ({
      ...f,
      scenarios: f.scenarios.map((sc) => ({
        ...sc,
        steps: sc.steps.map((st) =>
          st.keyword === "Then"
            ? { ...st, ...(assertions === undefined ? {} : { assertions }) }
            : st,
        ),
      })),
    })),
  });

  it("grades a passing scenario that asserted nothing as unasserted", async () => {
    await mount({ report: graded(0) });
    const payload = await call("list_scenarios");
    const [s] = payload["scenarios"] as Array<Record<string, unknown>>;
    expect(s).toMatchObject({ status: "passed", assertionState: "unasserted" });
  });

  it("grades one that did assert as asserted", async () => {
    await mount({ report: graded(4) });
    const [s] = (await call("list_scenarios"))["scenarios"] as Array<Record<string, unknown>>;
    expect(s?.["assertionState"]).toBe("asserted");
  });

  it("reports unobserved where the adapter has no counter", async () => {
    await mount({ report: graded(undefined) });
    const [s] = (await call("list_scenarios"))["scenarios"] as Array<Record<string, unknown>>;
    expect(s?.["assertionState"]).toBe("unobserved");
  });

  it("carries the verdict on get_scenario too", async () => {
    await mount({ report: graded(0) });
    const payload = await call("get_scenario", { idOrTitle: "Add a todo" });
    expect((payload["scenario"] as Record<string, unknown>)["assertionState"]).toBe("unasserted");
  });

  it("carries per-step counts alongside the verdict", async () => {
    await mount({ report: graded(4) });
    const [s] = (await call("list_scenarios"))["scenarios"] as Array<Record<string, unknown>>;
    const steps = s?.["steps"] as Array<Record<string, unknown>>;
    expect(steps.some((st) => st["assertions"] === 4)).toBe(true);
  });
});

describe("get_scenario", () => {
  it("finds by exact title and reports the owning feature", async () => {
    await mount();
    const payload = await call("get_scenario", { idOrTitle: "Delete" });
    expect(payload["feature"]).toEqual({
      id: "feature-todos",
      title: "Todos",
      sourceFile: "src/todos.story.test.ts",
    });
    expect((payload["scenario"] as Record<string, unknown>)["id"]).toBe("feature-todos--delete");
  });

  it("finds by id", async () => {
    await mount();
    const payload = await call("get_scenario", { idOrTitle: "feature-todos--delete" });
    expect((payload["scenario"] as Record<string, unknown>)["title"]).toBe("Delete");
  });

  it("names the recovery tool when the scenario is not found", async () => {
    await mount();
    const payload = await call("get_scenario", { idOrTitle: "Deletee" });
    expect(payload["error"]).toContain("list_scenarios");
  });

  it("reports which doc kinds exist without shipping their bodies", async () => {
    // passingReport's only doc entry is a note reading "Happy path validated."
    await mount({ report: passingReport });
    const payload = await call("get_scenario", { idOrTitle: "Add a todo" });
    const scenario = payload["scenario"] as Record<string, unknown>;
    expect(scenario["docKinds"]).toEqual(["note"]);
    expect(JSON.stringify(payload)).not.toContain("Happy path validated");
  });

  it("never ships attachment bodies, which are unbounded base64", async () => {
    const withAttachment = withScenarioAttachment(passingReport);
    await mount({ report: withAttachment });
    const payload = await call("get_scenario", { idOrTitle: "Add a todo" });
    expect(JSON.stringify(payload)).not.toContain("QkFTRTY0");
  });

  it("refuses the call when the required argument is missing", async () => {
    await mount();
    expect(await callRaw("get_scenario", {})).toContain("missing required: idOrTitle");
  });
});

describe("argument mistakes", () => {
  it("returns a readable message instead of a generic UnknownError", async () => {
    await mount();
    // Chrome replaces a thrown error's message with "Tool was executed but the
    // invocation failed", so a bad argument has to come back as a RESULT.
    const answer = await callRaw("list_scenarios", { statuses: ["borked"] });
    expect(answer).toContain("passed, failed, skipped, pending");
    expect(answer).toContain("borked");
  });

  it("names the offending field for a wrong type", async () => {
    await mount();
    expect(await callRaw("get_scenario", { idOrTitle: 7 })).toContain(
      '"idOrTitle" must be a string',
    );
  });

  it("rejects an unknown status on the view filter", async () => {
    await mount();
    expect(await callRaw("filter_scenarios", { status: "flaky" })).toContain("must be one of");
  });

  it("rejects object arguments the way Chrome does", async () => {
    await mount();
    const list = await document.modelContext!.getTools();
    const tool = list.find((t) => t.name === "get_failing_scenarios")!;
    await expect(
      // Deliberately not a JSON string — Chrome rejects this, and code that
      // relies on it working in tests would break in a real browser.
      (document.modelContext!.executeTool as unknown as (t: unknown, i: unknown) => Promise<string>)(
        tool,
        { statuses: [] },
      ),
    ).rejects.toThrow();
  });
});

describe("filter_scenarios", () => {
  it("patches only the fields it was given", async () => {
    const { setView } = await mount({
      view: { ...DEFAULT_URL_STATE, query: "todo", status: "failed", tags: ["wip"] },
    });
    await call("filter_scenarios", { status: "skipped" });
    expect(setView).toHaveBeenCalledWith({ status: "skipped" });
  });

  it("clears a filter when given an empty value", async () => {
    const { setView } = await mount({
      view: { ...DEFAULT_URL_STATE, query: "todo", tags: ["wip"] },
    });
    await call("filter_scenarios", { search: "", tags: [] });
    expect(setView).toHaveBeenCalledWith({ query: "", tags: [] });
  });

  it("changes nothing when called with no arguments", async () => {
    const { setView } = await mount();
    await call("filter_scenarios");
    expect(setView).toHaveBeenCalledWith({});
  });

  it("reports a matched count that agrees with what the list will render", async () => {
    await mount();
    const payload = await call("filter_scenarios", { status: "failed" });
    // mixedReport: 3 scenarios, exactly one failed.
    expect(payload["applied"]).toMatchObject({ matched: 1, total: 3, status: "failed" });
  });

  it("counts free-text search the same way the search box does", async () => {
    await mount();
    const payload = await call("filter_scenarios", { search: "user deletes" });
    expect(payload["applied"]).toMatchObject({ matched: 1 });
  });

  it("reports the resulting view, folding in filters it did not change", async () => {
    await mount({ view: { ...DEFAULT_URL_STATE, tags: ["wip"] } });
    const payload = await call("filter_scenarios", { status: "skipped" });
    expect(payload["applied"]).toMatchObject({ status: "skipped", tags: ["wip"], search: "" });
  });

  it("announces the change so the reader learns why the page moved", async () => {
    const { onAgentFilter } = await mount();
    await call("filter_scenarios", { status: "failed" });
    expect(onAgentFilter).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", matched: 1 }),
    );
  });

  it("does not announce anything when the arguments were rejected", async () => {
    const { onAgentFilter, setView } = await mount();
    await callRaw("filter_scenarios", { status: "flaky" });
    expect(onAgentFilter).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();
  });
});

function payloadIds(payload: Record<string, unknown>): string[] {
  return (payload["scenarios"] as Array<{ id: string }>).map((s) => s.id);
}

function withScenarioAttachment(report: StoryReport): StoryReport {
  return {
    ...report,
    features: report.features.map((feature) => ({
      ...feature,
      scenarios: feature.scenarios.map((scenario) => ({
        ...scenario,
        attachments: [
          {
            name: "screenshot.png",
            mediaType: "image/png",
            body: "QkFTRTY0",
            contentEncoding: "BASE64" as const,
          },
        ],
      })),
    })),
  };
}
