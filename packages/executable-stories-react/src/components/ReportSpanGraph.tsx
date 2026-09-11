// Subpath imports: the core package root pulls in Node-only converters
// (node:crypto), which breaks browser bundles — same rule as ReportStoryboard.
import { deriveSpanGraph, spanGraphNodeMark, spanGraphToMermaid } from "executable-stories-core/span-graph";
import type { SpanGraphKind, SpanGraphNode } from "executable-stories-core/span-graph";
import { useMemo } from "react";
import { useReport } from "../hooks/useReport";
import { DocMermaid } from "./doc/DocMermaid";
import { cn } from "../lib/utils";

const LANE_LABEL: Record<SpanGraphKind, string> = {
  edge: "Edge",
  service: "Service",
  queue: "Queue",
  datastore: "Data",
};

const MARK_LABEL = {
  failing: "Failing",
  added: "New",
  changed: "Changed",
} as const;

const MARK_CLASS = {
  failing: "text-fail",
  added: "text-pass",
  changed: "text-pend",
} as const;

function MarkBadge({ node }: { node: SpanGraphNode }) {
  const mark = spanGraphNodeMark(node);
  if (!mark) return null;
  return (
    <span className={cn("ml-2 text-xs font-medium", MARK_CLASS[mark])}>{MARK_LABEL[mark]}</span>
  );
}

/**
 * The architecture the run exercised, drawn from its OTel spans.
 *
 * Every other picture of a system's shape is inferred — from the folder tree,
 * the import graph, or a model reading a diff — and so has to be labelled as
 * unverified when it sits beside a scenario that executed. This one is not: a
 * component is here because a span named it during a run, and the scenarios
 * that put it there are listed beside it and link to their own cards.
 *
 * Renders nothing when the run carries no spans, which is most runs. A section
 * saying "no diagram" in every report of every uninstrumented suite is worse
 * than no section.
 *
 * Hydration-free: the derivation is pure and the links are plain anchors, so
 * this renders identically in the static report, the interactive island, and
 * the Astro story pages.
 */
export function ReportSpanGraph() {
  const report = useReport();
  // Memoised on the report, not recomputed per render: the interactive island
  // re-renders on every keystroke in the search box, and this walks every span
  // of every scenario. The report object is stable for the life of the view, so
  // the graph is derived once.
  const { code, graph, titleById } = useMemo(() => {
    const scenarios = report.features.flatMap((feature) => feature.scenarios);
    const derived = deriveSpanGraph(scenarios);
    return {
      graph: derived,
      code: spanGraphToMermaid(derived),
      titleById: new Map(scenarios.map((scenario) => [scenario.id, scenario.title])),
    };
  }, [report]);

  if (code === "") return null;

  return (
    <section className="es-span-graph mt-6" aria-labelledby="es-span-graph-heading">
      <h2 id="es-span-graph-heading" className="text-base font-semibold text-foreground">
        Architecture, as it ran
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Derived from this run&rsquo;s traces. Every component was named by a span while a
        scenario ran, so nothing here is inferred from the code. Instrumented, exercised
        paths only: a component no scenario reaches does not appear.
      </p>

      <DocMermaid entry={{ kind: "mermaid", phase: "static", code }} />

      <table className="mt-2 w-full border-collapse text-left text-sm">
        <caption className="sr-only">
          Each component and the scenarios that exercised it
        </caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="py-1 pr-4 font-medium">
              Component
            </th>
            <th scope="col" className="py-1 pr-4 font-medium">
              Lane
            </th>
            <th scope="col" className="py-1 font-medium">
              Covered by
            </th>
          </tr>
        </thead>
        <tbody>
          {graph.nodes.map((node) => (
            <tr key={node.id} className="border-t border-border align-top">
              <th scope="row" className="py-1.5 pr-4 font-mono text-xs font-normal">
                {node.id}
                <MarkBadge node={node} />
              </th>
              <td className="py-1.5 pr-4 text-xs text-muted-foreground">
                {LANE_LABEL[node.kind]}
              </td>
              <td className="py-1.5">
                <ul className="flex flex-col gap-0.5">
                  {node.scenarioIds.map((id) => (
                    <li key={id}>
                      {/* The card sets id={scenario.id}, so this jumps to it. */}
                      <a href={`#${id}`} className="text-xs text-link underline underline-offset-2 hover:text-foreground">
                        {titleById.get(id) ?? id}
                      </a>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
