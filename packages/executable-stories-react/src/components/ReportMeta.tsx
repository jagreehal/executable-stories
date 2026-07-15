import { formatDuration } from "executable-stories-core/utils/duration";
import { useReport } from "../hooks/useReport";
import { ciDisplayName, commitUrl, prUrl } from "../lib/provenance";

/**
 * Run metadata line (started, duration, version, branch, git SHA, CI, PR) —
 * the React equivalent of the report's `.meta-info` block. Reads the top-level
 * StoryReport fields from context. Commit and PR become links when the CI run
 * URL lets us derive them safely (GitHub/GitLab shapes only).
 */
export function ReportMeta() {
  const report = useReport();

  const items: Array<{ label: string; value: React.ReactNode }> = [];
  const linkClass = "text-primary underline underline-offset-2";

  if (report.startedAtMs) {
    items.push({ label: "Started", value: new Date(report.startedAtMs).toLocaleString() });
  }
  if (report.durationMs) {
    items.push({ label: "Duration", value: formatDuration(report.durationMs) });
  }
  if (report.packageVersion) {
    items.push({ label: "Version", value: report.packageVersion });
  }
  if (report.ci?.branch) {
    items.push({ label: "Branch", value: report.ci.branch });
  }
  const sha = report.ci?.commitSha ?? report.gitSha;
  if (sha) {
    const url = commitUrl(report.ci, report.gitSha);
    const short = sha.slice(0, 8);
    items.push({
      label: "Commit",
      value: url ? (
        <a href={url} target="_blank" rel="noreferrer noopener" className={linkClass}>
          {short}
        </a>
      ) : (
        short
      ),
    });
  }
  if (report.ci) {
    items.push({
      label: "CI",
      value: report.ci.url ? (
        <a href={report.ci.url} target="_blank" rel="noreferrer noopener" className={linkClass}>
          {ciDisplayName(report.ci.name)}
          {report.ci.buildNumber ? ` #${report.ci.buildNumber}` : ""}
        </a>
      ) : (
        `${ciDisplayName(report.ci.name)}${report.ci.buildNumber ? ` #${report.ci.buildNumber}` : ""}`
      ),
    });
  }
  if (report.ci?.prNumber) {
    const url = prUrl(report.ci);
    const label = `#${report.ci.prNumber}`;
    items.push({
      label: "PR",
      value: url ? (
        <a href={url} target="_blank" rel="noreferrer noopener" className={linkClass}>
          {label}
        </a>
      ) : (
        label
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    // Run metadata is useful but secondary to "what failed" — tuck it into a
    // collapsed disclosure so it doesn't push the result down. Native <details>
    // so it works with no JS (the SSR/no-hydration report still toggles).
    <details data-es-meta-card className="es-run-details group rounded-lg border border-border bg-card text-xs">
      <summary className="flex cursor-pointer list-none select-none items-center gap-1.5 px-4 py-2 font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-xs transition-transform group-open:rotate-90">▸</span>
        Run details
      </summary>
      <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border px-4 py-3 text-muted-foreground" aria-label="Run metadata">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5">
            <dt className="font-medium">{item.label}</dt>
            <dd className="font-mono text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
