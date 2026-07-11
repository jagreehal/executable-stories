import { useScenarioHistory } from "../interactive/scenario-history-context";
import { describeRunHistory, flakinessOf, type ScenarioRunEvent, type ScenarioRunStatus } from "../lib/run-history";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** How many trailing runs the strip shows; older entries stay in the tooltip count. */
const MAX_DOTS = 10;

const DOT_COLOR: Record<ScenarioRunStatus, string> = {
  passed: "bg-pass",
  failed: "bg-fail",
  skipped: "bg-skip",
  pending: "bg-pend",
};

function dotTitle(e: ScenarioRunEvent): string {
  const parts = [new Date(e.timestamp).toLocaleString(), e.status];
  if (e.commitSha) parts.push(e.commitSha.slice(0, 8));
  return parts.join(" · ");
}

/**
 * Compact run-over-run timeline for one scenario: a dot per recent run,
 * oldest → newest. Renders nothing outside <ReportInteractive> or when the
 * report was generated without --history-file — history is presentation-layer
 * data and never part of the StoryReport contract.
 */
export function ScenarioRunHistory({ scenarioId }: { scenarioId: string }) {
  const history = useScenarioHistory();
  const entries = history?.[scenarioId];
  if (!entries || entries.length < 2) return null; // one run = no timeline yet

  const recent = entries.slice(-MAX_DOTS);
  // Judge flakiness on the same window the dots show, so the badge never
  // contradicts the strip next to it.
  const flaky = flakinessOf(recent) === "flaky";
  const summary = flaky ? `${describeRunHistory(recent)} · Flaky` : describeRunHistory(recent);

  return (
    <>
      {flaky ? (
        <Badge variant="pending" aria-label="Flaky: status flips between recent runs" title={summary}>
          Flaky
        </Badge>
      ) : null}
      <span
        role="img"
        aria-label={`Run history: ${summary}`}
        title={summary}
        className="flex shrink-0 items-center gap-[3px]"
      >
        {recent.map((e, i) => (
          <span
            key={`${e.timestamp}-${i}`}
            aria-hidden
            title={dotTitle(e)}
            className={cn(
              "inline-block size-1.5 rounded-full",
              DOT_COLOR[e.status],
              // The newest run (rightmost dot) is the one the card's status
              // badge already describes; ring it so the timeline reads as
              // "…leading up to now".
              i === recent.length - 1 && "ring-1 ring-border ring-offset-1 ring-offset-card",
            )}
          />
        ))}
      </span>
    </>
  );
}
