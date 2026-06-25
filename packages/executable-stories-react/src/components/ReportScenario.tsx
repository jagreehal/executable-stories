import type { ReportScenario as ReportScenarioT } from "executable-stories-core";
import { formatDuration } from "executable-stories-core/utils/duration";
import { ReportSteps } from "./ReportSteps";
import { ReportDocEntries } from "./ReportDocEntries";
import { ReportAttachments } from "./ReportAttachments";
import { ReportTrace } from "./ReportTrace";
import { useCollapse } from "../interactive/collapse-context";
import { useScenarioActions } from "../interactive/scenario-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const STATUS_LABEL: Record<Status, string> = {
  passed: "Passed",
  failed: "Failed",
  skipped: "Skipped",
  pending: "Pending",
};

const STATUS_GLYPH: Record<Status, string> = {
  passed: "✓",
  failed: "✗",
  skipped: "○",
  pending: "○",
};

const STATUS_GLYPH_COLOR: Record<Status, string> = {
  passed: "text-pass",
  failed: "text-fail",
  skipped: "text-skip",
  pending: "text-pend",
};

const STATUS_BADGE: Record<Status, "passed" | "failed" | "skipped" | "pending"> = {
  passed: "passed",
  failed: "failed",
  skipped: "skipped",
  pending: "pending",
};

export function ReportScenario({ scenario, hideTitle = false }: ReportScenarioProps) {
  const titleId = `${scenario.id}-title`;
  const bodyId = `${scenario.id}-body`;
  const label = STATUS_LABEL[scenario.status];
  const collapse = useCollapse();
  const collapsible = collapse !== null && !hideTitle;
  const collapsed = collapsible ? collapse!.isCollapsed(scenario.id) : false;
  const actions = useScenarioActions();
  return (
    <Card
      id={scenario.id}
      data-status={scenario.status}
      {...(hideTitle
        ? { "aria-label": `${scenario.title} — ${label}` }
        : { "aria-labelledby": titleId })}
      className="gap-0 py-0"
    >
      <CardHeader className="px-4 py-3">
        <div className={cn("flex items-start gap-4", hideTitle ? "justify-end" : "justify-between")}>
          {hideTitle ? null : (
            <h3 id={titleId} className="flex items-center gap-2 text-sm font-medium text-foreground">
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => collapse!.toggle(scenario.id)}
                  aria-expanded={!collapsed}
                  aria-controls={bodyId}
                  aria-label={`Toggle ${scenario.title}`}
                  className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <span aria-hidden className={cn("inline-block text-xs transition-transform", !collapsed && "rotate-90")}>▸</span>
                </button>
              ) : null}
              <span aria-hidden className={cn("text-sm leading-none", STATUS_GLYPH_COLOR[scenario.status])}>
                {STATUS_GLYPH[scenario.status]}
              </span>
              <span>{scenario.title}</span>
            </h3>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {scenario.durationMs > 0 ? (
              <span className="whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground">
                {formatDuration(scenario.durationMs)}
              </span>
            ) : null}
            <Badge variant={STATUS_BADGE[scenario.status]} aria-label={`Status: ${label}`}>
              {label}
            </Badge>
            {actions ? (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => actions.copyLink(scenario)}
                  aria-label={`Copy link to ${scenario.title}`}
                  title="Copy permalink"
                  className="cursor-pointer rounded px-1 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  link
                </button>
                <button
                  type="button"
                  onClick={() => actions.copyMarkdown(scenario)}
                  aria-label={`Copy ${scenario.title} as Markdown`}
                  title="Copy as Markdown"
                  className="cursor-pointer rounded px-1 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  md
                </button>
                <button
                  type="button"
                  onClick={() => actions.copyPrompt(scenario)}
                  aria-label={`Copy ${scenario.title} as an AI investigation prompt`}
                  title="Copy as AI prompt"
                  className="cursor-pointer rounded px-1 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ai
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {scenario.tags.length > 0 || (scenario.tickets?.length ?? 0) > 0 ? (
          <ul aria-label="Tags and tickets" className="flex flex-wrap gap-1.5">
            {scenario.tags.map((t) => (
              <li key={`tag-${t}`}>
                <Badge variant="tag">{t}</Badge>
              </li>
            ))}
            {(scenario.tickets ?? []).map((ticket) => (
              <li key={`ticket-${ticket.id}`}>
                {ticket.url ? (
                  <a href={ticket.url} target="_blank" rel="noreferrer noopener">
                    <Badge variant="outline">{ticket.id}</Badge>
                  </a>
                ) : (
                  <Badge variant="outline">{ticket.id}</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </CardHeader>
      <CardContent id={bodyId} hidden={collapsed} className="px-4 pt-0 pb-4">
        {scenario.errorMessage ? (
          <pre
            role="alert"
            className="mb-1 overflow-x-auto rounded-md border border-fail-border bg-fail-bg px-4 py-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fail"
          >
            {scenario.errorMessage}
          </pre>
        ) : null}
        <ReportSteps scenario={scenario} />
        {scenario.docEntries.length > 0 ? (
          <div data-es-docs className="mt-3">
            <ReportDocEntries entries={scenario.docEntries} />
          </div>
        ) : null}
        <ReportAttachments attachments={scenario.attachments} />
        <ReportTrace spans={scenario.otelSpans} />
      </CardContent>
    </Card>
  );
}
