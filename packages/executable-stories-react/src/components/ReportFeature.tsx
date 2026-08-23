import type { ReportFeature as ReportFeatureT } from "executable-stories-core";
import { ReportScenarioList } from "./ReportScenarioList";
import { ReportFeatureIntro, featureKindLabel } from "./ReportFeatureIntro";
import { useCollapse } from "../interactive/collapse-context";
import { cn } from "@/lib/utils";

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
  const skipped = s.skipped + s.pending;
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
      <div className="flex items-end justify-between gap-4 border-b border-border pb-2">
        <div className="min-w-0">
          {/* The heading itself is the toggle — a wide, obvious hit area rather
              than a lone caret. Kept inside <h2> so it stays a landmark. */}
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
            {collapse ? (
              <button
                type="button"
                onClick={() => collapse.toggle(feature.id)}
                aria-expanded={!collapsed}
                aria-controls={bodyId}
                className="flex w-full cursor-pointer items-center gap-2 text-left hover:text-foreground/80"
              >
                <span aria-hidden className={cn("shrink-0 text-xs text-muted-foreground transition-transform", !collapsed && "rotate-90")}>▸</span>
                <span className="truncate">{feature.title}</span>
              </button>
            ) : (
              feature.title
            )}
          </h2>
          <p className={cn("mt-0.5 flex items-center gap-2 text-xs text-muted-foreground", collapse && "pl-5")}>
            {kindLabel ? (
              <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-medium text-foreground">
                {kindLabel}
              </span>
            ) : null}
            <span className="truncate font-mono">{feature.sourceFile}</span>
          </p>
        </div>
        {/* Readable, failure-weighted counts — only the failure count carries
            colour, so a broken suite reads at a glance without a colour salad. */}
        <p
          className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
          aria-label={`${s.passed} passed, ${s.failed} failed, ${skipped} skipped`}
        >
          <span>{s.passed} passed</span>
          <span aria-hidden>·</span>
          <span className={cn(s.failed > 0 && "font-medium text-fail")}>{s.failed} failed</span>
          {skipped > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{skipped} skipped</span>
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
