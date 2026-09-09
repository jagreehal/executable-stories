/**
 * Span Graph Formatter - Layer 3.
 *
 * The architecture a run exercised, drawn from its OTel spans: a Mermaid
 * diagram, then the scenarios behind every component. The second half is what
 * separates this from an architecture diagram someone drew, so it is not
 * optional decoration.
 *
 * Empty output for a run with no spans. The generator writes no file in that
 * case, because a page saying "no diagram" in every report of every
 * uninstrumented suite is worse than the format not firing.
 */

import {
  deriveSpanGraph,
  spanGraphNodeMark,
  spanGraphToMermaid,
} from "executable-stories-core/span-graph";
import type { SpanGraphDelta, SpanGraphScenario } from "executable-stories-core/span-graph";
import type { TestRunResult } from "executable-stories-core/types/test-result";

const MARKERS = {
  failing: " 🔴",
  added: " 🟢",
  changed: " 🟡",
  none: "",
} as const;

export interface SpanGraphFormatterOptions {
  /** Heading for the page. Default: "Architecture, as it ran" */
  title?: string;
  /**
   * Scenario ids from a behavioural diff, which colour the components the
   * change is really about. Build it with `spanGraphDeltaFromRuns`, which
   * pairs a retitled scenario by behaviour fingerprint: a scenario id hashes
   * its title, so a rename would otherwise read as one removal plus one
   * addition and turn a long-standing component green.
   */
  delta?: SpanGraphDelta;
}

export class SpanGraphFormatter {
  private title: string;
  private delta?: SpanGraphDelta;

  constructor(options: SpanGraphFormatterOptions = {}) {
    this.title = options.title ?? "Architecture, as it ran";
    this.delta = options.delta;
  }

  format(run: TestRunResult): string {
    const scenarios: SpanGraphScenario[] = run.testCases.map((tc) => ({
      id: tc.id,
      title: tc.story.scenario,
      ...(tc.story.otelSpans ? { otelSpans: tc.story.otelSpans } : {}),
    }));
    const titleById = new Map(run.testCases.map((tc) => [tc.id, tc.story.scenario]));

    const graph = deriveSpanGraph(scenarios, this.delta);
    const mermaid = spanGraphToMermaid(graph);
    if (mermaid === "") return "";

    const lines: string[] = [`# ${this.title}`, ""];
    lines.push(
      "Every component below is here because a span named it while a scenario ran, and",
      "every arrow is a call one scenario actually made. Nothing on this diagram is",
      "inferred from the code. It covers instrumented, exercised paths only: a component",
      "no scenario reaches does not appear, and that absence is itself worth reading.",
      "",
    );
    lines.push("```mermaid", mermaid, "```", "");

    lines.push("## What each component is covered by", "");
    lines.push("| Component | Lane | Scenarios | Covered by |");
    lines.push("| --- | --- | --- | --- |");
    for (const node of graph.nodes) {
      // Same precedence as the diagram, from the same function, so the table
      // and the picture cannot describe one component two different ways.
      const marker = MARKERS[spanGraphNodeMark(node) ?? "none"];
      const covered = node.scenarioIds
        .map((id) => titleById.get(id) ?? id)
        .join("<br>");
      lines.push(
        `| \`${node.id}\`${marker} | ${node.kind} | ${node.scenarioIds.length} | ${covered} |`,
      );
    }
    lines.push("");

    return lines.join("\n");
  }
}
