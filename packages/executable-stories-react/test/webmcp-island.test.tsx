import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { installTestModelContext, type TestModelContext } from "webmcpable/testing";
import { ReportInteractive } from "../src/interactive/ReportInteractive";
import { mixedReport } from "./fixtures/sample-report";

/**
 * The island end of the WebMCP work: tool definitions are tested in
 * webmcp-tools.test.ts, this file proves they are actually registered by the
 * mounted report and that calling one moves the page.
 *
 * The second assertion in each case is the one that carries the weight. A tool
 * that reports a filter applied while the scenario list stays put has told the
 * agent something untrue, and only a check on the rendered output catches it.
 */

let harness: TestModelContext | undefined;

/**
 * Registration is async (`registerTool` returns a promise) and the island fires
 * it from an effect, so the tools are not there the instant render() returns.
 */
async function renderReport() {
  const view = render(<ReportInteractive report={mixedReport} />);
  await act(async () => {});
  return view;
}

async function invoke(name: string, args: Record<string, unknown> = {}) {
  const tools = await document.modelContext!.getTools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool not registered: ${name}`);
  let raw = "";
  // act(): the handler calls setState, and the assertions that follow read the
  // DOM it produces.
  await act(async () => {
    raw = await document.modelContext!.executeTool(tool, JSON.stringify(args));
  });
  return JSON.parse(raw) as Record<string, unknown>;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = function () {};
  window.location.hash = "";
});

afterEach(() => {
  harness?.uninstall();
  harness = undefined;
});

describe("<ReportInteractive> with WebMCP available", () => {
  beforeEach(() => {
    harness = installTestModelContext();
  });

  it("registers its tools once mounted", async () => {
    await renderReport();
    const names = (await document.modelContext!.getTools()).map((t) => t.name);
    expect(names).toContain("list_scenarios");
    expect(names).toContain("filter_scenarios");
    expect(names).toContain("get_failing_scenarios");
  });

  it("unregisters them when the report unmounts", async () => {
    const view = await renderReport();
    expect(await document.modelContext!.getTools()).not.toHaveLength(0);
    view.unmount();
    expect(await document.modelContext!.getTools()).toHaveLength(0);
  });

  it("answers a read from the whole report, not the filtered view", async () => {
    await renderReport();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "delete" } });
    const payload = await invoke("list_scenarios");
    // The reader is looking at one scenario; the question was about the run.
    expect(payload["total"]).toBe(3);
  });

  it("changes what the reader sees when an agent filters", async () => {
    await renderReport();
    // Auth holds the only skipped scenario; a status filter drops the whole
    // feature. (Its scenario headings are not asserted on: with failures in the
    // run, the triage default collapses a feature that has none.)
    expect(screen.getByRole("heading", { name: "Auth", level: 2 })).toBeInTheDocument();

    const payload = await invoke("filter_scenarios", { status: "failed" });

    expect(payload["applied"]).toMatchObject({ matched: 1, status: "failed" });
    expect(screen.getByRole("heading", { name: /Delete/, level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Auth", level: 2 })).toBeNull();
  });

  it("tells the reader an agent moved the page, and offers the way back", async () => {
    await renderReport();
    await invoke("filter_scenarios", { status: "failed" });

    expect(screen.getByText(/An agent filtered this report/)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 scenarios/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByRole("heading", { name: "Auth", level: 2 })).toBeInTheDocument();
    expect(screen.queryByText(/An agent filtered this report/)).toBeNull();
  });

  it("drops the notice once the reader changes a filter themselves", async () => {
    await renderReport();
    await invoke("filter_scenarios", { status: "failed" });
    expect(screen.getByText(/An agent filtered this report/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "delete" } });
    expect(screen.queryByText(/An agent filtered this report/)).toBeNull();
  });

  it("can be dismissed without undoing the filter", async () => {
    await renderReport();
    await invoke("filter_scenarios", { status: "failed" });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/An agent filtered this report/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Auth", level: 2 })).toBeNull();
  });

  it("shows no agent notice when the reader filters by hand", async () => {
    await renderReport();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "delete" } });
    expect(screen.queryByText(/An agent filtered this report/)).toBeNull();
  });
});

describe("<ReportInteractive> without WebMCP", () => {
  it("renders and filters exactly as before, with no tools and no error", () => {
    expect(document.modelContext).toBeUndefined();
    render(<ReportInteractive report={mixedReport} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "delete" } });
    expect(screen.getByText("1 of 3 scenarios")).toBeInTheDocument();
    expect(screen.queryByText(/An agent filtered this report/)).toBeNull();
  });
});
