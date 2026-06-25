import type { ReportFeature as ReportFeatureT } from "executable-stories-core";
import { ReportScenarioList } from "./ReportScenarioList";
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
  return (
    <section
      id={feature.id}
      data-slot="feature"
      aria-labelledby={titleId}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {collapse ? (
            <button
              type="button"
              onClick={() => collapse.toggle(feature.id)}
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              aria-label={`Toggle ${feature.title}`}
              className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden className={cn("inline-block text-xs transition-transform", !collapsed && "rotate-90")}>▸</span>
            </button>
          ) : null}
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold tracking-tight text-foreground">
              {feature.title}
            </h2>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{feature.sourceFile}</p>
          </div>
        </div>
        <div
          role="img"
          className="flex shrink-0 items-center gap-2.5 font-mono text-xs font-medium"
          aria-label={`${s.passed} passed, ${s.failed} failed, ${skipped} skipped`}
        >
          <span aria-hidden className="text-pass">✓{s.passed}</span>
          <span aria-hidden className="text-fail">✗{s.failed}</span>
          <span aria-hidden className="text-skip">○{skipped}</span>
        </div>
      </div>
      <div id={bodyId} hidden={collapsed} className="flex flex-col gap-2 p-3">
        <ReportScenarioList feature={feature} />
      </div>
    </section>
  );
}
