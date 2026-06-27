import { formatDuration } from "executable-stories-core/utils/duration";
import { useReport } from "../hooks/useReport";

/**
 * Run metadata line (started, duration, version, git SHA, CI) — the React
 * equivalent of the report's `.meta-info` block. Reads the top-level StoryReport
 * fields from context.
 */
export function ReportMeta() {
  const report = useReport();

  const items: Array<{ label: string; value: React.ReactNode }> = [];

  if (report.startedAtMs) {
    items.push({ label: "Started", value: new Date(report.startedAtMs).toLocaleString() });
  }
  if (report.durationMs) {
    items.push({ label: "Duration", value: formatDuration(report.durationMs) });
  }
  if (report.packageVersion) {
    items.push({ label: "Version", value: report.packageVersion });
  }
  if (report.gitSha) {
    items.push({ label: "Commit", value: report.gitSha.slice(0, 8) });
  }
  if (report.ci) {
    items.push({
      label: "CI",
      value: report.ci.url ? (
        <a href={report.ci.url} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2">
          {report.ci.name}
          {report.ci.buildNumber ? ` #${report.ci.buildNumber}` : ""}
        </a>
      ) : (
        `${report.ci.name}${report.ci.buildNumber ? ` #${report.ci.buildNumber}` : ""}`
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <dl aria-label="Run metadata" className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex gap-1.5">
          <dt className="font-medium">{item.label}</dt>
          <dd className="font-mono text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
