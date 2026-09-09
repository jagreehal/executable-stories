import { describe, expect, it } from "vitest";

import {
  deriveSpanGraph,
  spanGraphDeltaFromRuns,
  spanGraphNodeMark,
  spanGraphToMermaid,
} from "./span-graph.js";
import type { SpanGraphNode, SpanGraphScenario } from "./span-graph.js";
import type { OtelSpan } from "./types/otel.js";

function span(
  spanId: string,
  name: string,
  attributes: OtelSpan["attributes"],
  parentSpanId?: string,
  status: OtelSpan["status"] = "ok",
): OtelSpan {
  return { spanId, ...(parentSpanId ? { parentSpanId } : {}), name, status, attributes };
}

/** A checkout suite: an edge service, three services, two queues, two databases. */
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
  {
    id: "receipt-email-is-queued",
    otelSpans: [
      span("d1", "checkout.submit", { "peer.service": "checkout-api" }),
      span("d2", "publish receipt.requested", { "messaging.destination.name": "receipt.requested" }, "d1"),
    ],
  },
];

const node = (graph: ReturnType<typeof deriveSpanGraph>, id: string) =>
  graph.nodes.find((n) => n.id === id);

describe("deriveSpanGraph", () => {
  it("names a component from OTel semantic conventions, most specific first", () => {
    const graph = deriveSpanGraph(SUITE);

    expect(graph.nodes.map((n) => `${n.id}:${n.kind}`).sort()).toEqual([
      "checkout-api:service",
      "inventory:service",
      "order.placed:queue",
      "payments:service",
      "postgres:inventory:datastore",
      "postgres:orders:datastore",
      "receipt.requested:queue",
      "storefront:edge",
    ]);
  });

  it("falls back to the span name's first segment when no convention applies", () => {
    const graph = deriveSpanGraph([
      { id: "s", otelSpans: [span("x", "billing.recalculate", undefined)] },
    ]);

    expect(graph.nodes.map((n) => n.id)).toEqual(["billing"]);
  });

  it("never derives a nameless component from an unhelpful span name", () => {
    // A blank name, or one that is only separators, left the first dot-segment
    // empty and drew a box with no label in it. A reader cannot act on that; the
    // raw name, or a placeholder, at least says which span it came from.
    const graph = deriveSpanGraph([
      {
        id: "s",
        otelSpans: [
          span("a", "", undefined),
          span("b", ".", undefined),
          span("c", "   ", undefined),
        ],
      },
    ]);

    expect(graph.nodes.every((n) => n.id.trim().length > 0)).toBe(true);
  });

  it("draws an edge for a hop between components, never for an internal call", () => {
    const graph = deriveSpanGraph([
      {
        id: "s",
        otelSpans: [
          span("p", "checkout.submit", { "peer.service": "checkout-api" }),
          // Same component as its parent: an internal call is not architecture.
          span("c", "checkout.validate", { "peer.service": "checkout-api" }, "p"),
          span("d", "SELECT orders", { "db.system": "postgres", "db.namespace": "orders" }, "c"),
        ],
      },
    ]);

    expect(graph.edges.map((e) => `${e.from}->${e.to}`)).toEqual(["checkout-api->postgres:orders"]);
  });

  it("counts every scenario that crossed an edge", () => {
    const graph = deriveSpanGraph(SUITE);
    const edge = graph.edges.find((e) => e.from === "storefront" && e.to === "checkout-api");

    expect(edge?.calls).toBe(2);
    expect(edge?.scenarioIds).toEqual(["guest-checkout-succeeds", "card-declined-shows-an-error"]);
  });

  it("marks only the component whose span errored, never its ancestors", () => {
    const graph = deriveSpanGraph(SUITE);

    expect(node(graph, "payments")?.status).toBe("error");
    // Propagating up the parent chain reddens the whole spine, so one failing
    // scenario would mark every hub and the picture stops pointing at anything.
    expect(node(graph, "checkout-api")?.status).toBe("ok");
    expect(node(graph, "storefront")?.status).toBe("ok");
  });

  it("lists the scenarios behind a component, which is the blast radius", () => {
    const graph = deriveSpanGraph(SUITE);

    expect(node(graph, "checkout-api")?.scenarioIds).toEqual([
      "guest-checkout-succeeds",
      "card-declined-shows-an-error",
      "stock-is-reserved-when-an-order-is-placed",
      "receipt-email-is-queued",
    ]);
  });

  it("is empty when no scenario carries a span", () => {
    const graph = deriveSpanGraph([{ id: "a" }, { id: "b", otelSpans: [] }]);

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("keeps two edges apart when a component id contains the key separator", () => {
    // Edge keys are built by joining two component ids. A separator that can
    // occur inside an id merges unrelated edges, so the join has to use one
    // that cannot: "a" -> "b|c" and "a|b" -> "c" are different edges.
    const graph = deriveSpanGraph([
      {
        id: "s",
        otelSpans: [
          span("p1", "x", { "peer.service": "a" }),
          span("c1", "x", { "peer.service": "b|c" }, "p1"),
          span("p2", "x", { "peer.service": "a|b" }),
          span("c2", "x", { "peer.service": "c" }, "p2"),
        ],
      },
    ]);

    expect(graph.edges.map((e) => `${e.from}=>${e.to}`).sort()).toEqual([
      "a=>b|c",
      "a|b=>c",
    ]);
  });

  it("orders each lane by how much of the suite reaches a component", () => {
    // First-seen order is span order, which is arbitrary to a reader. The
    // component most of the suite depends on is the one to read first.
    const graph = deriveSpanGraph(SUITE);
    const services = graph.nodes.filter((n) => n.kind === "service").map((n) => n.id);

    expect(services).toEqual(["checkout-api", "payments", "inventory"]);
  });

  it("breaks an ordering tie by id, so the graph stays deterministic", () => {
    const graph = deriveSpanGraph([
      {
        id: "s",
        otelSpans: [
          span("a", "x", { "peer.service": "zebra" }),
          span("b", "x", { "peer.service": "alpha" }),
        ],
      },
    ]);

    expect(graph.nodes.map((n) => n.id)).toEqual(["alpha", "zebra"]);
  });

  it("is deterministic: the same run derives the same graph", () => {
    expect(deriveSpanGraph(SUITE)).toEqual(deriveSpanGraph(SUITE));
  });
});

describe("deriveSpanGraph delta", () => {
  it("marks a component only new scenarios reach as added", () => {
    const graph = deriveSpanGraph(SUITE, { added: ["receipt-email-is-queued"], changed: [] });

    expect(node(graph, "receipt.requested")?.delta).toBe("added");
  });

  it("keys on scenario id, so a renamed scenario still matches", () => {
    // Same scenario, retitled. A title-keyed delta would silently lose it.
    const renamed = SUITE.map((s) =>
      s.id === "receipt-email-is-queued" ? { ...s, title: "Receipt email goes out" } : s,
    );
    const graph = deriveSpanGraph(renamed, { added: ["receipt-email-is-queued"], changed: [] });

    expect(node(graph, "receipt.requested")?.delta).toBe("added");
  });

  it("marks at most two components as changed, so a hub is not amber on every run", () => {
    // checkout-api is on all four scenarios. Without a cap it goes amber
    // whenever anything anywhere changes, which is a colour that says nothing.
    const graph = deriveSpanGraph(SUITE, {
      added: [],
      changed: ["stock-is-reserved-when-an-order-is-placed"],
    });

    const changed = graph.nodes.filter((n) => n.delta === "changed").map((n) => n.id);
    expect(changed.length).toBeLessThanOrEqual(2);
    // The most specific components win: the ones the changed scenario is most
    // of, not the hub it is one quarter of.
    expect(changed).not.toContain("checkout-api");
  });

  it("leaves a component the diff never reached uncoloured", () => {
    const graph = deriveSpanGraph(SUITE, { added: [], changed: ["receipt-email-is-queued"] });

    expect(node(graph, "payments")?.delta).toBeUndefined();
    expect(node(graph, "postgres:orders")?.delta).toBeUndefined();
  });

  it("colours nothing without a delta", () => {
    const graph = deriveSpanGraph(SUITE);

    expect(graph.nodes.every((n) => n.delta === undefined)).toBe(true);
  });
});

describe("spanGraphDeltaFromRuns", () => {
  it("reads added and changed scenario ids off two runs", () => {
    const delta = spanGraphDeltaFromRuns(
      [{ id: "kept", fingerprint: "a" }, { id: "moved", fingerprint: "b" }],
      [
        { id: "kept", fingerprint: "a" },
        { id: "moved", fingerprint: "b2" },
        { id: "brand-new", fingerprint: "c" },
      ],
    );

    expect(delta).toEqual({ added: ["brand-new"], changed: ["moved"] });
  });

  it("reports nothing for an unchanged run", () => {
    const same = [{ id: "kept", fingerprint: "a" }];
    expect(spanGraphDeltaFromRuns(same, same)).toEqual({ added: [], changed: [] });
  });

  it("does not call a retitled scenario new: its id moved, its behaviour did not", () => {
    // A scenario id is a hash of source file and title, so retitling mints a
    // new id. Pure id set-diff then reports one removal and one addition, and a
    // component only that scenario reaches goes green as though the system had
    // gained something it has had all along. The fingerprint is what pairs them.
    const delta = spanGraphDeltaFromRuns(
      [{ id: "old-id", fingerprint: "same-behaviour" }],
      [{ id: "new-id-after-retitle", fingerprint: "same-behaviour" }],
    );

    expect(delta).toEqual({ added: [], changed: [] });
  });

  it("still reports a genuinely new scenario as added", () => {
    const delta = spanGraphDeltaFromRuns(
      [{ id: "kept", fingerprint: "a" }],
      [
        { id: "kept", fingerprint: "a" },
        { id: "brand-new", fingerprint: "never-seen" },
      ],
    );

    expect(delta).toEqual({ added: ["brand-new"], changed: [] });
  });

  it("refuses to guess which of two identical additions is the rename", () => {
    // One removal cannot say which of two same-fingerprint additions it became.
    // Pairing one of them would make the answer depend on scenario order, so
    // neither pairs, the same rule `compare` uses for its exact pass.
    const delta = spanGraphDeltaFromRuns(
      [{ id: "old-a", fingerprint: "dup" }],
      [
        { id: "new-a", fingerprint: "dup" },
        { id: "new-b", fingerprint: "dup" },
      ],
    );

    expect(delta.added).toEqual(["new-a", "new-b"]);
  });

  it("never pairs content-less scenarios, whose fingerprints are all empty", () => {
    // `behaviourFingerprint` returns "" when there are no steps and no covers,
    // and says callers must skip exact matching for those. A planned `it.todo`
    // scenario is exactly that, so without the guard one renamed placeholder
    // and one brand-new placeholder pair as a rename and a genuinely new
    // component silently stays uncoloured.
    const delta = spanGraphDeltaFromRuns(
      [{ id: "old-placeholder", fingerprint: "" }],
      [{ id: "unrelated-new-placeholder", fingerprint: "" }],
    );

    expect(delta.added).toEqual(["unrelated-new-placeholder"]);
  });

  it("ignores a scenario that only disappeared: it draws nothing on this run's graph", () => {
    expect(
      spanGraphDeltaFromRuns([{ id: "gone", fingerprint: "a" }], []),
    ).toEqual({ added: [], changed: [] });
  });
});

describe("spanGraphNodeMark", () => {
  const node = (over: Partial<SpanGraphNode>): SpanGraphNode => ({
    id: "n",
    kind: "service",
    status: "ok",
    scenarioIds: ["s"],
    ...over,
  });

  it("puts failure ahead of both delta colours", () => {
    expect(spanGraphNodeMark(node({ status: "error", delta: "added" }))).toBe("failing");
    expect(spanGraphNodeMark(node({ status: "error", delta: "changed" }))).toBe("failing");
  });

  it("reports the delta when nothing broke", () => {
    expect(spanGraphNodeMark(node({ delta: "added" }))).toBe("added");
    expect(spanGraphNodeMark(node({ delta: "changed" }))).toBe("changed");
  });

  it("marks a plain healthy component not at all", () => {
    expect(spanGraphNodeMark(node({}))).toBeUndefined();
  });
});

describe("spanGraphToMermaid", () => {
  it("puts each component in the lane its kind earned", () => {
    const mermaid = spanGraphToMermaid(deriveSpanGraph(SUITE));

    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain('subgraph es_edge["Edge"]');
    expect(mermaid).toContain('subgraph es_datastore["Data"]');
    // A datastore is drawn as a cylinder, so the lane is readable at a glance.
    expect(mermaid).toMatch(/postgres_orders\[\(/);
  });

  it("labels a component with how many scenarios reached it", () => {
    const mermaid = spanGraphToMermaid(deriveSpanGraph(SUITE));

    expect(mermaid).toContain("checkout-api<br/>4 scenarios");
    expect(mermaid).toContain("inventory<br/>1 scenario");
  });

  it("styles a failing component and defines only the classes it used", () => {
    const mermaid = spanGraphToMermaid(deriveSpanGraph(SUITE));

    expect(mermaid).toContain("class payments esFailing");
    expect(mermaid).toContain("classDef esFailing");
    expect(mermaid).not.toContain("classDef esAdded");
  });

  it("marks a failing component as failing even when the diff also calls it new", () => {
    // Failure is the sharper signal. A component that is both new and broken
    // must not be drawn as a clean addition.
    const mermaid = spanGraphToMermaid({
      nodes: [
        { id: "payments", kind: "service", status: "error", scenarioIds: ["s"], delta: "added" },
      ],
      edges: [],
    });

    expect(mermaid).toContain("class payments esFailing");
    expect(mermaid).not.toContain("class payments esAdded");
  });

  it("keeps two components apart when their mermaid ids would fold together", () => {
    // Mermaid ids are bare identifiers, so `order.placed` and `order_placed`
    // both fold to `order_placed` and would silently become one node.
    const mermaid = spanGraphToMermaid({
      nodes: [
        { id: "order.placed", kind: "queue", status: "ok", scenarioIds: ["s"] },
        { id: "order_placed", kind: "queue", status: "ok", scenarioIds: ["s"] },
      ],
      edges: [{ from: "order.placed", to: "order_placed", status: "ok", calls: 1, scenarioIds: ["s"] }],
    });

    const declared = [...mermaid.matchAll(/^ {4}(\w+)\[/gm)].map((m) => m[1]);
    expect(new Set(declared).size).toBe(2);
    // The edge still connects the two distinct nodes.
    expect(mermaid).toMatch(/ {2}(\w+) -->\|1\| (\w+)/);
    const [, from, to] = mermaid.match(/ {2}(\w+) -->\|1\| (\w+)/)!;
    expect(from).not.toBe(to);
  });

  it("keeps a component id from colliding with the lane it sits in", () => {
    // A node sharing an id with its enclosing subgraph is malformed mermaid.
    const mermaid = spanGraphToMermaid({
      nodes: [{ id: "es_service", kind: "service", status: "ok", scenarioIds: ["s"] }],
      edges: [],
    });

    expect(mermaid).toContain('subgraph es_service["Services"]');
    expect(mermaid).not.toMatch(/^ {4}es_service\[/m);
  });

  it("escapes markup in a label rather than letting it render", () => {
    // Mermaid draws labels as HTML, so a db namespace of `<default>` became an
    // unknown tag and the rest of the label disappeared.
    const mermaid = spanGraphToMermaid({
      nodes: [{ id: "pg:<default>", kind: "datastore", status: "ok", scenarioIds: ["s"] }],
      edges: [],
    });

    expect(mermaid).toContain("&lt;default&gt;");
    expect(mermaid).not.toContain("<default>");
  });

  it("omits an empty graph rather than drawing an empty diagram", () => {
    expect(spanGraphToMermaid({ nodes: [], edges: [] })).toBe("");
  });

  it("is deterministic", () => {
    expect(spanGraphToMermaid(deriveSpanGraph(SUITE))).toBe(
      spanGraphToMermaid(deriveSpanGraph(SUITE)),
    );
  });
});
