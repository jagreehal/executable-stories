import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReportScenario, StoryReport } from "executable-stories-core";
import type { OtelSpan } from "executable-stories-core/types/otel";
import { expect, waitFor, within } from "storybook/test";
import { ReportRoot } from "../context/ReportRoot";
import { MermaidDiagram } from "./doc/MermaidDiagram";
import { ReportSpanGraph } from "./ReportSpanGraph";
import { reportFixture } from "../test/fixtures";

const meta: Meta<typeof ReportSpanGraph> = {
  title: "Report/SpanGraph",
  component: ReportSpanGraph,
};
export default meta;

type Story = StoryObj<typeof ReportSpanGraph>;

const span = (
  spanId: string,
  name: string,
  attributes: OtelSpan["attributes"],
  parentSpanId?: string,
  status: OtelSpan["status"] = "ok",
): OtelSpan => ({ spanId, ...(parentSpanId ? { parentSpanId } : {}), name, status, attributes });

function scenario(
  id: string,
  title: string,
  status: ReportScenario["status"],
  otelSpans: OtelSpan[],
): ReportScenario {
  return {
    id,
    title,
    status,
    durationMs: 12,
    tags: [],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps: [],
    attachments: [],
    otelSpans,
  };
}

/** A report whose scenarios traced themselves across four components. */
function tracedReport(): StoryReport {
  const base = reportFixture();
  const [feature] = base.features;
  if (!feature) throw new Error("reportFixture must supply a feature to attach spans to");

  return {
    ...base,
    features: [
      {
        ...feature,
        scenarios: [
          scenario("guest-checkout-succeeds", "Guest checkout succeeds", "passed", [
            span("a1", "POST /checkout", { "service.name": "storefront", "http.route": "/checkout" }),
            span("a2", "checkout.submit", { "peer.service": "checkout-api" }, "a1"),
            span("a3", "SELECT orders", { "db.system": "postgres", "db.namespace": "orders" }, "a2"),
          ]),
          scenario("card-declined-shows-an-error", "Card declined shows an error", "failed", [
            span("b1", "checkout.submit", { "peer.service": "checkout-api" }),
            span("b2", "payments.charge", { "peer.service": "payments" }, "b1", "error"),
          ]),
        ],
      },
    ],
  };
}

function withReport(report: StoryReport) {
  return (
    <ReportRoot report={report}>
      <ReportSpanGraph />
    </ReportRoot>
  );
}

/** Same section, with the renderer that turns the mermaid source into a picture. */
function withDrawnReport(report: StoryReport) {
  return (
    <ReportRoot
      report={report}
      renderers={{ mermaid: (entry) => <MermaidDiagram entry={entry} /> }}
    >
      <ReportSpanGraph />
    </ReportRoot>
  );
}

/**
 * The section as it appears above the features: the diagram, then every
 * component with the scenarios that exercised it. Those scenario names are
 * links to the scenario's own card, which is the whole point — the picture is
 * checkable, one click from any component to the evidence behind it.
 */
export const WithSpans: Story = {
  render: () => withReport(tracedReport()),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Architecture, as it ran" })).toBeVisible();

    // Components appear in the coverage table, laned.
    await expect(canvas.getByText("checkout-api")).toBeVisible();
    await expect(canvas.getByText("postgres:orders")).toBeVisible();

    // The component whose own span errored is the one marked, not its parents.
    const failing = canvas.getAllByText("Failing");
    await expect(failing).toHaveLength(1);

    // Every scenario is a link to its card. One scenario appears under each
    // component it reached, so there are several links to the same card, which
    // is the behaviour worth keeping: the row you are reading is the one you
    // click from.
    const links = canvas.getAllByRole("link", { name: "Guest checkout succeeds" });
    await expect(links.length).toBeGreaterThan(1);
    for (const link of links) {
      await expect(link).toHaveAttribute("href", "#guest-checkout-succeeds");
    }
  },
};

/**
 * Most runs are not instrumented, so the section has to disappear completely
 * rather than announce that it has nothing to show.
 */
export const NoSpans: Story = {
  render: () => withReport(reportFixture()),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading", { name: "Architecture, as it ran" })).toBeNull();
    await expect(canvasElement.querySelector(".es-span-graph")).toBeNull();
  },
};

/**
 * The diagram as a reader sees it: drawn, not the mermaid source every other
 * story here renders. Runs in both palettes (the colorMode toolbar), so a
 * diagram that is unreadable in dark fails here rather than in a report.
 */
export const Drawn: Story = {
  render: () => withDrawnReport(tracedReport()),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Drawing is async (mermaid is imported on demand), so wait for the SVG
    // rather than the source fallback that precedes it.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelector(".es-span-graph svg")).not.toBeNull();
      },
      { timeout: 10_000 },
    );

    // The lane and a component are drawn, not just listed in the table below.
    const svg = canvasElement.querySelector(".es-span-graph svg")!;
    await expect(svg.textContent).toContain("checkout-api");
    await expect(svg.textContent).toContain("scenario");

    // No label may overflow the box drawn for it. A node label is two lines
    // (the component, then how many scenarios reached it), so a mermaid that
    // measures it as one clips the second line — caught here as geometry
    // rather than as a version number.
    const nodes = [...svg.querySelectorAll("g.node")];
    let measured = 0;
    for (const node of nodes) {
      const box = node.querySelector("rect, circle, polygon, path");
      const label = node.querySelector(".nodeLabel, foreignObject div, text");
      if (!box || !label) continue;
      measured += 1;
      const boxHeight = box.getBoundingClientRect().height;
      const labelHeight = label.getBoundingClientRect().height;
      // A pixel of slack for sub-pixel layout; a clipped second line is tens.
      await expect(labelHeight).toBeLessThanOrEqual(boxHeight + 1);
    }
    // Asserted last, so a selector that stops matching mermaid's output fails
    // here rather than passing an empty loop.
    await expect(measured).toBeGreaterThan(0);

    // The table still sits under the picture: summary, then the evidence.
    await expect(canvas.getByRole("heading", { name: "Architecture, as it ran" })).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: "Guest checkout succeeds" }).length).toBeGreaterThan(0);
  },
};
