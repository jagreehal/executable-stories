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
