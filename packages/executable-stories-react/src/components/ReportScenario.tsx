import type { ReportScenario as ReportScenarioT } from "executable-stories-core";
import { formatDuration } from "executable-stories-core/utils/duration";
import { ReportSteps } from "./ReportSteps";
import { ReportStoryboard } from "./ReportStoryboard";
import { ReportDocEntries } from "./ReportDocEntries";
import { ReportAttachments } from "./ReportAttachments";
import { ReportTrace } from "./ReportTrace";
import { ScenarioRunHistory } from "./ScenarioRunHistory";
import { ScenarioStaleness } from "./ScenarioStaleness";
import { useCollapse } from "../interactive/collapse-context";
import { useScenarioActions } from "../interactive/scenario-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LinkIcon, FileTextIcon, SparklesIcon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReportScenarioProps {
  scenario: ReportScenarioT;
  /**
   * Omit the card's own title row (status badge + tags still render). Use when
   * the surrounding page already shows the scenario title as its heading — e.g.
   * the Astro detail page, where Starlight renders the title as the page `h1`.
   */
  hideTitle?: boolean;
}

type Status = ReportScenarioT["status"];

interface StatusMeta {
  label: string;
  glyph: string;
  glyphColor: string;
  badgeVariant: "passed" | "failed" | "skipped" | "pending";
  /**
   * Whether to render the status as a visible pill. Passing scenarios drop it:
   * the green ✓ glyph + title already carry the status, so the pill would be
   * pure redundancy on every (usually passing) row, and dropping it keeps a
   * green run calm while the failure pill stays the one loud badge. A
   * non-showPill status still exposes an sr-only label for screen readers.
   */
  showPill: boolean;
}

const STATUS_META: Record<Status, StatusMeta> = {
  passed: { label: "Passed", glyph: "✓", glyphColor: "text-pass", badgeVariant: "passed", showPill: false },
  failed: { label: "Failed", glyph: "✗", glyphColor: "text-fail", badgeVariant: "failed", showPill: true },
  skipped: { label: "Skipped", glyph: "○", glyphColor: "text-skip", badgeVariant: "skipped", showPill: true },
  pending: { label: "Pending", glyph: "○", glyphColor: "text-pend", badgeVariant: "pending", showPill: true },
};

export function ReportScenario({ scenario, hideTitle = false }: ReportScenarioProps) {
  const titleId = `${scenario.id}-title`;
  const bodyId = `${scenario.id}-body`;
  const meta = STATUS_META[scenario.status];
  // A planned scenario (it.todo) is canonically "pending", but the reader
  // should see intent, not limbo.
  const label = scenario.planned ? "Planned" : meta.label;
  const collapse = useCollapse();
  const collapsible = collapse !== null && !hideTitle;
  const collapsed = collapsible ? collapse!.isCollapsed(scenario.id) : false;
  const actions = useScenarioActions();
  return (
    <Card
      id={scenario.id}
      data-status={scenario.status}
      {...(hideTitle
        ? { "aria-label": `${scenario.title}, ${label}` }
        : { "aria-labelledby": titleId })}
      // Off-screen cards skip layout and paint; find-in-page and anchors keep working.
      className="gap-0 py-0 [contain-intrinsic-size:auto_120px] [content-visibility:auto]"
    >
      <CardHeader className="px-4 py-3">
        <div
          className={cn(
            // Wraps rather than squeezing: on a phone the status/duration group
            // is ~160px, which leaves a title column a few characters wide.
            "flex flex-wrap items-start gap-x-4 gap-y-1",
            hideTitle ? "justify-end" : "justify-between",
          )}
        >
          {hideTitle ? null : (
            <h3 id={titleId} className="flex min-w-0 flex-1 basis-48 items-start gap-2 text-sm font-medium text-foreground">
              {collapsible ? (
                // The whole title row toggles, as on feature headings.
                <button
                  type="button"
                  onClick={() => collapse!.toggle(scenario.id)}
                  aria-expanded={!collapsed}
                  aria-controls={bodyId}
                  className="-mx-1 -my-0.5 flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-sm px-1 py-0.5 text-left outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {/* No rotation transition: `e`/`c` flip every card at once. */}
                  <span aria-hidden className="flex h-5 shrink-0 items-center text-xs text-muted-foreground">
                    <span className={cn("inline-block", !collapsed && "rotate-90")}>▸</span>
                  </span>
                  <ScenarioTitle glyph={meta.glyph} glyphColor={meta.glyphColor} title={scenario.title} />
                </button>
              ) : (
                <ScenarioTitle glyph={meta.glyph} glyphColor={meta.glyphColor} title={scenario.title} />
              )}
            </h3>
          )}
          {/* h-5 is one title line, so duration and actions align with its first line. */}
          <div className="flex h-5 shrink-0 items-center gap-2">
            <ScenarioRunHistory scenarioId={scenario.id} />
            <ScenarioStaleness scenario={scenario} />
            {scenario.durationMs > 0 ? (
              <span className="whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground">
                {formatDuration(scenario.durationMs)}
              </span>
            ) : null}
            {meta.showPill ? (
              <Badge variant={meta.badgeVariant} aria-label={`Status: ${label}`}>
                {label}
              </Badge>
            ) : (
              <span className="sr-only">{`Status: ${label}`}</span>
            )}
            {actions ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Actions for ${scenario.title}`}
                  className="-my-0.5 cursor-pointer rounded p-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4"
                >
                  <MoreHorizontalIcon aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.copyLink(scenario)}>
                    <LinkIcon /> Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.copyMarkdown(scenario)}>
                    <FileTextIcon /> Copy as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.copyPrompt(scenario)}>
                    <SparklesIcon /> Explain with AI
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        {scenario.tags.length > 0 || (scenario.tickets?.length ?? 0) > 0 ? (
          <ul aria-label="Tags and tickets" className="flex flex-wrap gap-1.5">
            {scenario.tags.map((t) => (
              <li key={`tag-${t}`} className="max-w-full">
                <Badge variant="tag" title={t} className="block truncate">{t}</Badge>
              </li>
            ))}
            {(scenario.tickets ?? []).map((ticket) => (
              <li key={`ticket-${ticket.id}`} className="max-w-full">
                {ticket.url ? (
                  <a href={ticket.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-6 max-w-full items-center">
                    <Badge variant="outline" title={ticket.id} className="block truncate">{ticket.id}</Badge>
                  </a>
                ) : (
                  <Badge variant="outline" title={ticket.id} className="block truncate">{ticket.id}</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </CardHeader>
      {/* empty:hidden drops the padding when a scenario has no body. */}
      <CardContent id={bodyId} hidden={collapsed} className="px-4 pt-0 pb-4 empty:hidden">
        {/* Skip when the failing step already prints this message. */}
        {scenario.errorMessage && !scenario.steps.some((s) => s.errorMessage === scenario.errorMessage) ? (
          <pre
            role="alert"
            className="mb-1 overflow-x-auto rounded-md border border-fail-border bg-fail-bg px-4 py-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fail"
          >
            {scenario.errorMessage}
          </pre>
        ) : null}
        {scenario.errorStack ? (
          <details className="es-stack-details mb-1 text-xs">
            <summary className="cursor-pointer rounded-sm py-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
              Stack trace
            </summary>
            <pre tabIndex={0} className="es-stack-trace mt-1 max-h-80 overflow-auto rounded-md border border-border bg-muted px-4 py-3 font-mono text-[0.6875rem] leading-relaxed whitespace-pre text-muted-foreground">
              {scenario.errorStack}
            </pre>
          </details>
        ) : null}
        <ReportStoryboard scenario={scenario} />
        <ReportSteps scenario={scenario} />
        {scenario.docEntries.length > 0 ? (
          <div data-es-docs className="mt-3">
            <ReportDocEntries entries={scenario.docEntries} />
          </div>
        ) : null}
        <ReportAttachments attachments={scenario.attachments} />
        <ReportTrace spans={scenario.otelSpans} logs={scenario.otelLogs} steps={scenario.steps} />
      </CardContent>
    </Card>
  );
}

/** Status glyph and title. The glyph box is one line tall to stay level with the first line of a wrapped title. */
function ScenarioTitle({ glyph, glyphColor, title }: { glyph: string; glyphColor: string; title: string }) {
  return (
    <>
      <span aria-hidden className={cn("flex h-5 shrink-0 items-center text-sm leading-none", glyphColor)}>
        {glyph}
      </span>
      <span dir="auto" className="min-w-0">{title}</span>
    </>
  );
}
