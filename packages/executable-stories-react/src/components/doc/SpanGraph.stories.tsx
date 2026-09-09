import type { Meta, StoryObj } from "@storybook/react-vite";
// The subpath, not the barrel: `executable-stories-core` is Node-only (it
// resolves attachments from the filesystem), and other components take only
// types from it, which erase. These are values, so they must come from the
// browser-safe module directly.
import {
  deriveSpanGraph,
  spanGraphToMermaid,
  type SpanGraphDelta,
  type SpanGraphScenario,
} from "executable-stories-core/span-graph";
import type { OtelSpan } from "executable-stories-core/types/otel";
import { expect, within } from "storybook/test";
import { MermaidDiagram } from "./MermaidDiagram";

/**
 * The architecture a run exercised, drawn from its OTel spans.
 *
 * These stories exist because the graph's rules are all about what a reader
 * sees, and every one of them has been got wrong at least once: failure
 * propagating up the parent chain until the whole spine was red, a hub going
 * amber on every run, a component that was both new and broken drawn as a clean
 * addition, and two components whose Mermaid ids folded into one node. A unit
 * test proves the strings; only a rendered diagram shows whether the picture
 * points at the right thing.
 */
const meta: Meta<typeof MermaidDiagram> = {
  title: "Doc/SpanGraph",
  component: MermaidDiagram,
};
export default meta;

type Story = StoryObj<typeof MermaidDiagram>;

const span = (
  spanId: string,
  name: string,
  attributes: OtelSpan["attributes"],
  parentSpanId?: string,
  status: OtelSpan["status"] = "ok",
): OtelSpan => ({ spanId, ...(parentSpanId ? { parentSpanId } : {}), name, status, attributes });

/** A checkout suite across an edge service, three services, a queue and two databases. */
const SUITE: SpanGraphScenario[] = [
  {
    id: "guest-checkout-succeeds",
    otelSpans: [
      span("a1", "POST /checkout", { "service.name": "storefront", "http.route": "/checkout" }),
      span("a2", "checkout.submit", { "peer.service": "checkout-api" }, "a1"),
      span("a3", "payments.charge", { "peer.service": "payments" }, "a2"),
      span("a4", "SELECT orders", { "db.system": "postgres", "db.namespace": "orders" }, "a2"),
    ],
  },
  {
    id: "card-declined-shows-an-error",
    otelSpans: [
      span("b1", "POST /checkout", { "service.name": "storefront", "http.route": "/checkout" }),
      span("b2", "checkout.submit", { "peer.service": "checkout-api" }, "b1"),
      span("b3", "payments.charge", { "peer.service": "payments" }, "b2", "error"),
    ],
  },
  {
    id: "stock-is-reserved-when-an-order-is-placed",
    otelSpans: [
      span("c1", "checkout.submit", { "peer.service": "checkout-api" }),
      span("c2", "publish order.placed", { "messaging.destination.name": "order.placed" }, "c1"),
      span("c3", "inventory.reserve", { "peer.service": "inventory" }, "c2"),
      span("c4", "UPDATE stock", { "db.system": "postgres", "db.namespace": "inventory" }, "c3"),
    ],
  },
];

function diagram(scenarios: SpanGraphScenario[], delta?: SpanGraphDelta) {
  return {
    kind: "mermaid" as const,
    phase: "static" as const,
    code: spanGraphToMermaid(deriveSpanGraph(scenarios, delta)),
  };
}

/**
 * The system as it ran. `payments` is the only marked component, because its
 * own span errored: `storefront` and `checkout-api` are on the failing
 * scenario's path but did not themselves break, and marking them would redden
 * the spine and stop the picture pointing at anything.
 */
export const AsItRan: Story = {
  args: { entry: diagram(SUITE) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Lanes and reach are what a reader takes from the picture.
    await expect(canvas.getByText(/checkout-api/)).toBeInTheDocument();
    await expect(canvas.getByText(/3 scenarios/)).toBeInTheDocument();
    await expect(canvas.getByText(/postgres:orders/)).toBeInTheDocument();
  },
};

/**
 * Under review, coloured by the behavioural diff. `inventory` and the queue are
 * green because only new scenarios reach them; at most two components can be
 * amber, so the hub every scenario passes through is not marked on every run.
 */
export const UnderReview: Story = {
  args: {
    entry: diagram(SUITE, {
      added: ["stock-is-reserved-when-an-order-is-placed"],
      changed: [],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/inventory/)).toBeInTheDocument();
    await expect(canvas.getByText(/order.placed/)).toBeInTheDocument();
  },
};

/**
 * A component that is both new and broken. Failure outranks the delta colours
 * everywhere it is drawn, so this reads as failing rather than as a clean
 * addition: the break is the sharper thing to look at.
 */
export const NewAndBroken: Story = {
  args: {
    entry: diagram(
      [
        {
          id: "new-path-fails",
          otelSpans: [span("x", "payments.charge", { "peer.service": "payments" }, undefined, "error")],
        },
      ],
      { added: ["new-path-fails"], changed: [] },
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/payments/)).toBeInTheDocument();
  },
};

/**
 * Two components whose Mermaid ids both fold to `order_placed`. They must stay
 * two nodes: folding them into one would silently merge unrelated parts of the
 * system and give the merged node the edges of both.
 */
export const CollidingNames: Story = {
  args: {
    entry: diagram([
      {
        id: "queues-with-similar-names",
        otelSpans: [
          span("p", "publish order.placed", { "messaging.destination.name": "order.placed" }),
          span("q", "publish order_placed", { "messaging.destination.name": "order_placed" }, "p"),
        ],
      },
    ]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Two nodes, not one: both names survive as their own box.
    await expect(canvas.getByText("order.placed", { exact: false })).toBeInTheDocument();
    await expect(canvas.getByText("order_placed", { exact: false })).toBeInTheDocument();
  },
};

/** A run with no spans draws nothing at all, rather than an empty diagram. */
export const NoSpans: Story = {
  args: { entry: diagram([{ id: "untraced" }]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/flowchart/)).toBeNull();
  },
};
