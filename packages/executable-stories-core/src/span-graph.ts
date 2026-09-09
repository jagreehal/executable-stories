/**
 * Architecture derived from the spans a run actually emitted.
 *
 * Every other way to draw a system's shape infers it: from the folder tree, the
 * import graph, or a model reading a diff. Each produces a picture nobody can
 * check, which is why a drawing like that has to be labelled as unverified when
 * it sits next to a scenario that executed.
 *
 * This one is not inferred. A component is on the picture because a span named
 * it while a scenario ran, an edge is there because one span was the parent of
 * another across a component boundary, and both carry the scenario ids that put
 * them there. "What does this change touch" stops being a guess and becomes
 * "which scenarios traverse this component", answered from the run.
 *
 * The limit is honest and worth stating: it draws instrumented, exercised paths
 * and nothing else. A component no scenario reaches does not appear. That is
 * the same shape as coverage, and the absence is information.
 *
 * Output is Mermaid, which every report format and GitHub already render, so
 * there is no layout engine here to keep deterministic.
 */

// From the crypto-free module, not the `ids.ts` re-export: importing that
// would pull `node:crypto` in and this file has to stay browser-safe.
import { pairByFingerprint } from "./converters/acl/pair-by-fingerprint.js";
import type { OtelSpan } from "./types/otel.js";
import type { ReportScenario } from "./types/story-report.js";

/** The part of a scenario this derivation needs. */
export type SpanGraphScenario = Pick<ReportScenario, "id" | "otelSpans"> & {
  title?: string;
};

/** Which lane a component sits in, from the convention that named it. */
export type SpanGraphKind = "edge" | "service" | "queue" | "datastore";

export interface SpanGraphNode {
  id: string;
  kind: SpanGraphKind;
  /** "error" only where a span at this component reported one. */
  status: "ok" | "error";
  /** Scenario ids that exercised it, in first-seen order. The blast radius. */
  scenarioIds: string[];
  /** Set only when a delta was supplied. */
  delta?: "added" | "changed";
}

export interface SpanGraphEdge {
  from: string;
  to: string;
  status: "ok" | "error";
  /** How many parent/child hops crossed this boundary across the run. */
  calls: number;
  scenarioIds: string[];
}

export interface SpanGraph {
  nodes: SpanGraphNode[];
  edges: SpanGraphEdge[];
}

/**
 * Scenario ids, as a behavioural diff reports them.
 *
 * Ids rather than titles because a title is not identity: two scenarios in
 * different files can share one. A scenario id is not stable across a retitle
 * either (it hashes the title), which is what `spanGraphDeltaFromRuns` pairs by
 * fingerprint to survive; by the time a delta reaches here that pairing has
 * already happened.
 */
export interface SpanGraphDelta {
  added: string[];
  changed: string[];
}

/**
 * At most this many components carry the "changed" colour.
 *
 * Without a cap, every component any changed scenario touches goes amber, so a
 * hub that sits on most scenarios is amber on every run and the colour stops
 * carrying information. Two is the number of things a reader can hold as "this
 * is what the change is really about".
 */
const MAX_CHANGED = 2;

/**
 * Joins two component ids into an edge key. Component ids come from OTel
 * attribute values and can hold nearly any character, so a printable separator
 * risks merging unrelated edges ("a" -> "b|c" and "a|b" -> "c"). Written as an
 * escape rather than a literal: a raw NUL in a .ts file makes git treat the
 * whole source as binary, and the file stops being reviewable in a diff.
 */
const EDGE_KEY_SEPARATOR = "\u0000";

/**
 * The component a span belongs to. OTel semantic conventions first, most
 * specific identity winning, because a single span can carry several: a
 * database call also has a peer service, and the database is the truer name.
 */
function componentOf(span: OtelSpan): { id: string; kind: SpanGraphKind } {
  const attributes = span.attributes ?? {};
  const read = (key: string): string | undefined => {
    const value = attributes[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  const dbSystem = read("db.system");
  if (dbSystem) {
    const namespace = read("db.namespace") ?? read("db.name");
    return { id: namespace ? `${dbSystem}:${namespace}` : dbSystem, kind: "datastore" };
  }

  const destination = read("messaging.destination.name");
  if (destination) return { id: destination, kind: "queue" };

  const peer = read("peer.service");
  if (peer) return { id: peer, kind: "service" };

  // A span carrying a route is where traffic enters, so its own service is the
  // edge rather than something it called.
  //
  // The name's first dot-segment is the useful part of `pricing.applyDiscount`,
  // but it is empty for a name that is blank or starts with a separator, and a
  // box with no label in it tells a reader nothing. Fall back to the whole name,
  // then to a placeholder that at least says the span was unnamed.
  const segment = span.name.split(".")[0]?.trim();
  const own = read("service.name") ?? (segment || span.name.trim() || "(unnamed span)");
  return { id: own, kind: read("http.route") ? "edge" : "service" };
}

function worse(a: "ok" | "error", b: "ok" | "error"): "ok" | "error" {
  return a === "error" || b === "error" ? "error" : "ok";
}

/**
 * Which components the diff is really about.
 *
 * A component every touching scenario is new to is new to the system. For the
 * rest, rank by the share of its scenarios the diff moved, so a component the
 * change is most of beats a hub the change is a quarter of, and keep only the
 * top few (see MAX_CHANGED).
 */
function applyDelta(nodes: SpanGraphNode[], delta: SpanGraphDelta): void {
  const added = new Set(delta.added);
  const changed = new Set(delta.changed);

  const candidates: { node: SpanGraphNode; share: number }[] = [];

  for (const node of nodes) {
    const touched = node.scenarioIds.filter((id) => added.has(id) || changed.has(id));
    if (touched.length === 0) continue;

    if (node.scenarioIds.every((id) => added.has(id))) {
      node.delta = "added";
      continue;
    }
    candidates.push({ node, share: touched.length / node.scenarioIds.length });
  }

  candidates
    .sort(
      (a, b) =>
        b.share - a.share ||
        // A tie goes to the more specific component: fewer scenarios overall.
        a.node.scenarioIds.length - b.node.scenarioIds.length ||
        a.node.id.localeCompare(b.node.id),
    )
    .slice(0, MAX_CHANGED)
    .forEach(({ node }) => {
      node.delta = "changed";
    });
}

export function deriveSpanGraph(
  scenarios: readonly SpanGraphScenario[],
  delta?: SpanGraphDelta,
): SpanGraph {
  const nodes = new Map<string, SpanGraphNode>();
  const edges = new Map<string, SpanGraphEdge>();

  for (const scenario of scenarios) {
    const spans = scenario.otelSpans;
    if (!spans || spans.length === 0) continue;

    const byId = new Map(spans.map((s) => [s.spanId, s]));

    for (const span of spans) {
      const component = componentOf(span);
      const status = span.status === "error" ? "error" : "ok";

      const existing = nodes.get(component.id);
      if (existing) {
        existing.status = worse(existing.status, status);
        if (!existing.scenarioIds.includes(scenario.id)) existing.scenarioIds.push(scenario.id);
      } else {
        nodes.set(component.id, { ...component, status, scenarioIds: [scenario.id] });
      }

      const parent = span.parentSpanId ? byId.get(span.parentSpanId) : undefined;
      if (!parent) continue;
      const from = componentOf(parent);
      // A call that stays inside a component is not architecture.
      if (from.id === component.id) continue;

      const key = `${from.id}${EDGE_KEY_SEPARATOR}${component.id}`;
      const edge = edges.get(key) ?? {
        from: from.id,
        to: component.id,
        status: "ok" as const,
        calls: 0,
        scenarioIds: [],
      };
      edge.status = worse(edge.status, status);
      edge.calls += 1;
      if (!edge.scenarioIds.includes(scenario.id)) edge.scenarioIds.push(scenario.id);
      edges.set(key, edge);
    }
  }

  // Ordered by reach, not by the order spans happened to arrive in. The
  // component most of the suite depends on is the one a reader should meet
  // first, in the diagram's lane and in the table beside it. Ties break on id
  // so the same run always draws the same picture.
  const ordered = [...nodes.values()].sort(
    (a, b) => b.scenarioIds.length - a.scenarioIds.length || a.id.localeCompare(b.id),
  );

  const result: SpanGraph = { nodes: ordered, edges: [...edges.values()] };
  if (delta) applyDelta(result.nodes, delta);
  return result;
}

/** The part of a scenario the delta needs: its id and what it looked like. */
export interface SpanGraphDeltaScenario {
  id: string;
  /**
   * A stable digest of what the scenario *does*, which must not include its
   * title: the title is what a rename changes, and pairing by fingerprint is
   * how a rename is recognised. `behaviourFingerprint` has this shape.
   */
  fingerprint: string;
}

/**
 * The delta between two runs, as scenario ids.
 *
 * Two passes, because a scenario id is a hash of its source file and title: a
 * retitle mints a new id, so id set-diff alone reports one removal and one
 * addition, and a component only that scenario reaches turns green as though
 * the system had gained something it has had all along.
 *
 * So ids match first, then whatever is left over is paired by fingerprint,
 * which ignores the title. A scenario that only moved its name pairs and counts
 * as neither added nor changed. Pairing is one-to-one and skips the empty
 * fingerprint content-less scenarios share, so an ambiguous match is declined
 * rather than guessed.
 *
 * The residual limit, worth knowing: a scenario retitled AND edited in the same
 * change has a new id and a new fingerprint, so it still reads as added. Fuzzy
 * re-pairing for that case lives in `compare`, which has the similarity scoring
 * this deliberately does not pull in.
 *
 * A scenario that only disappeared is absent from the result on purpose: it
 * draws nothing on this run's graph.
 */
export function spanGraphDeltaFromRuns(
  baseline: readonly SpanGraphDeltaScenario[],
  current: readonly SpanGraphDeltaScenario[],
): SpanGraphDelta {
  const before = new Map(baseline.map((s) => [s.id, s.fingerprint]));
  const added: string[] = [];
  const changed: string[] = [];
  const unmatchedCurrent: SpanGraphDeltaScenario[] = [];

  for (const scenario of current) {
    const previous = before.get(scenario.id);
    if (previous === undefined) unmatchedCurrent.push(scenario);
    else if (previous !== scenario.fingerprint) changed.push(scenario.id);
  }

  // Whatever is left pairs by content: `pairByFingerprint` owns the two guards
  // (never match the empty fingerprint, never guess an ambiguous one) so this
  // and `compare` cannot drift apart on what counts as a rename.
  const currentIds = new Set(current.map((s) => s.id));
  const removedScenarios = baseline.filter((s) => !currentIds.has(s.id));
  const renamed = new Set(
    pairByFingerprint(removedScenarios, unmatchedCurrent, (s) => s.fingerprint).map(
      (pair) => pair.added.id, // same behaviour under a new name: nothing moved
    ),
  );

  for (const scenario of unmatchedCurrent) {
    if (!renamed.has(scenario.id)) added.push(scenario.id);
  }

  return { added, changed };
}

/**
 * How a component should be marked, wherever it is drawn.
 *
 * Failure outranks both delta colours: a component that is both new and broken
 * drawn as a clean addition hides the sharper signal behind the softer one.
 * Every surface that marks a node calls this, so the diagram and the table
 * beside it cannot disagree about the same component.
 */
export function spanGraphNodeMark(
  node: SpanGraphNode,
): "failing" | "added" | "changed" | undefined {
  if (node.status === "error") return "failing";
  return node.delta;
}

const LANES: { kind: SpanGraphKind; label: string }[] = [
  { kind: "edge", label: "Edge" },
  { kind: "service", label: "Services" },
  { kind: "queue", label: "Queues" },
  { kind: "datastore", label: "Data" },
];

/**
 * Mermaid node ids are bare identifiers, so anything else folds to "_". That
 * makes `order.placed` and `order_placed` the same id, and Mermaid would draw
 * them as one node with the edges of both. Assign once per graph, in node
 * order, suffixing whatever would collide.
 */
function assignMermaidIds(nodes: readonly SpanGraphNode[]): Map<string, string> {
  const assigned = new Map<string, string>();
  // Seeded with the lane subgraph ids: a node sharing an id with the subgraph
  // that encloses it is malformed mermaid, and a component legitimately called
  // `es_service` is not the diagram's problem to refuse.
  const taken = new Set<string>(LANES.map((lane) => `es_${lane.kind}`));

  for (const node of nodes) {
    const base = node.id.replace(/[^A-Za-z0-9_]/g, "_") || "node";
    let candidate = base;
    for (let suffix = 2; taken.has(candidate); suffix++) candidate = `${base}_${suffix}`;
    taken.add(candidate);
    assigned.set(node.id, candidate);
  }

  return assigned;
}

/**
 * Mermaid draws labels as HTML, so a component id is escaped before it goes in
 * one: a `db.namespace` of `<default>` was read as an unknown tag and took the
 * rest of the label with it. The `<br/>` below is ours and stays markup.
 */
function label(id: string, scenarios: number): string {
  const safe = id
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `${safe}<br/>${scenarios} scenario${scenarios === 1 ? "" : "s"}`;
}

const CLASS_DEFS: Record<string, string> = {
  esFailing: "classDef esFailing stroke:#d1242f,stroke-width:2px;",
  esAdded: "classDef esAdded stroke:#1a7f37,stroke-width:2px;",
  esChanged: "classDef esChanged stroke:#9a6700,stroke-width:2px;",
};

const MARK_CLASS = {
  failing: "esFailing",
  added: "esAdded",
  changed: "esChanged",
} as const;

/** Empty string for an empty graph: a diagram of nothing is worse than none. */
export function spanGraphToMermaid(graph: SpanGraph): string {
  if (graph.nodes.length === 0) return "";

  const lines: string[] = ["flowchart LR"];
  const ids = assignMermaidIds(graph.nodes);
  const mermaidId = (id: string): string => ids.get(id) ?? id.replace(/[^A-Za-z0-9_]/g, "_");

  for (const lane of LANES) {
    const inLane = graph.nodes.filter((n) => n.kind === lane.kind);
    if (inLane.length === 0) continue;
    lines.push(`  subgraph es_${lane.kind}["${lane.label}"]`);
    for (const node of inLane) {
      const text = label(node.id, node.scenarioIds.length);
      lines.push(
        node.kind === "datastore"
          ? `    ${mermaidId(node.id)}[("${text}")]`
          : `    ${mermaidId(node.id)}["${text}"]`,
      );
    }
    lines.push("  end");
  }

  for (const edge of graph.edges) {
    const arrow = edge.status === "error" ? "-.->" : "-->";
    lines.push(`  ${mermaidId(edge.from)} ${arrow}|${edge.calls}| ${mermaidId(edge.to)}`);
  }

  const used = new Set<string>();
  for (const node of graph.nodes) {
    const mark = spanGraphNodeMark(node);
    if (!mark) continue;
    const cls = MARK_CLASS[mark];
    used.add(cls);
    lines.push(`  class ${mermaidId(node.id)} ${cls}`);
  }
  // Only the classes this graph used, so the diagram carries no dead styling.
  for (const cls of Object.keys(CLASS_DEFS)) {
    if (used.has(cls)) lines.push(`  ${CLASS_DEFS[cls]}`);
  }

  return lines.join("\n");
}
