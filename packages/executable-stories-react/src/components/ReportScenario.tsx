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
              <span aria-hidden className={cn("text-sm leading-none", meta.glyphColor)}>
                {meta.glyph}
              </span>
              <span>{scenario.title}</span>
            </h3>
          )}
          <div className="flex shrink-0 items-center gap-2">
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
                  className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4"
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
        <ReportStoryboard scenario={scenario} />
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
