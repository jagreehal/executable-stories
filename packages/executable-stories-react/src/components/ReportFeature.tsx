import type { ReportFeature as ReportFeatureT } from "executable-stories-core";
import { ReportScenarioList } from "./ReportScenarioList";
import { ReportFeatureIntro, featureKindLabel } from "./ReportFeatureIntro";
import { useCollapse } from "../interactive/collapse-context";
import { cn, formatCount } from "@/lib/utils";

export interface ReportFeatureProps {
  feature: ReportFeatureT;
}

/**
 * Feature group — the report's `.feature` card: a header bar with the feature
 * title + mono source path and ✓/✗/○ status counts on the right, over a stack
 * of scenario cards. Kept a semantic <section> (a region), not a shadcn Card
 * div, so it stays a landmark and doesn't collide with the scenario cards'
 * `[data-slot="card"]`.
 */
export function ReportFeature({ feature }: ReportFeatureProps) {
  const titleId = `${feature.id}-title`;
  const bodyId = `${feature.id}-body`;
  const s = feature.summary;
  // Pending (`it.todo`) is not skipped: the card badge says "Planned" and the
  // summary card says "Pending", so the count line must not fold it into skipped.
  const collapse = useCollapse();
  const collapsed = collapse?.isCollapsed(feature.id) ?? false;
  const kindLabel = featureKindLabel(feature.kind);
  return (
    // Suite = a section heading + a divider, NOT another bordered card. Drops a
    // layer of nesting so the scenario cards below read as the primary unit.
    <section
      id={feature.id}
      data-slot="feature"
      aria-labelledby={titleId}
      className="flex flex-col gap-3"
    >
      {/* On a phone the counts wrap below the title. */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <div className="min-w-0 flex-1 basis-48">
          {/* The heading itself is the toggle — a wide, obvious hit area rather
              than a lone caret. Kept inside <h2> so it stays a landmark. */}
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
            {collapse ? (
              <button
                type="button"
                onClick={() => collapse.toggle(feature.id)}
                aria-expanded={!collapsed}
                aria-controls={bodyId}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm text-left outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span aria-hidden className={cn("shrink-0 text-xs text-muted-foreground", !collapsed && "rotate-90")}>▸</span>
                <span dir="auto" className="min-w-0 truncate" title={feature.title}>{feature.title}</span>
              </button>
            ) : (
              feature.title
            )}
          </h2>
          <p className={cn("mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground", collapse && "pl-5")}>
            {kindLabel ? (
              <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-medium text-foreground">
                {kindLabel}
              </span>
            ) : null}
            {/* Truncate from the start so the file name stays visible. */}
            <span className="min-w-0 truncate font-mono [direction:rtl] text-left" title={feature.sourceFile}>
              <bdi>{feature.sourceFile}</bdi>
            </span>
          </p>
        </div>
        {/* Readable, failure-weighted counts — only the failure count carries
            colour, so a broken suite reads at a glance without a colour salad. */}
        <p
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums"
          aria-label={[
            `${s.passed} passed`,
            `${s.failed} failed`,
            s.skipped > 0 && `${s.skipped} skipped`,
            s.pending > 0 && `${s.pending} pending`,
          ].filter(Boolean).join(", ")}
        >
          <span>{formatCount(s.passed)} passed</span>
          <span aria-hidden>·</span>
          <span className={cn(s.failed > 0 && "font-medium text-fail")}>{formatCount(s.failed)} failed</span>
          {s.skipped > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatCount(s.skipped)} skipped</span>
            </>
          ) : null}
          {s.pending > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatCount(s.pending)} pending</span>
            </>
          ) : null}
        </p>
      </div>
      <div id={bodyId} hidden={collapsed} className="flex flex-col gap-3">
        <ReportFeatureIntro feature={feature} />
        <ReportScenarioList feature={feature} />
      </div>
    </section>
  );
}
