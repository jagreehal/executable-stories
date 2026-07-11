import type { StoryReport } from "executable-stories-core";

type ReportCI = NonNullable<StoryReport["ci"]>;

/**
 * Epoch ms of the run the report documents — the staleness reference.
 * Prefers finishedAtMs; falls back to startedAtMs for reports from adapters
 * that only stamp a start time.
 */
export function reportLastRunMs(
  report: Pick<StoryReport, "startedAtMs" | "finishedAtMs">,
): number | undefined {
  if (report.finishedAtMs && report.finishedAtMs > 0) return report.finishedAtMs;
  if (report.startedAtMs && report.startedAtMs > 0) return report.startedAtMs;
  return undefined;
}

/**
 * Human-readable age like "just now", "5 minutes ago", "3 hours ago",
 * "12 days ago". Clock skew (thenMs in the future) reads as "just now".
 */
export function formatRelativeAge(thenMs: number, nowMs: number): string {
  const deltaMs = Math.max(0, nowMs - thenMs);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * A report is stale once its run is `staleAfterDays` or more days old.
 * A threshold of 0 (or negative) disables staleness entirely.
 */
export function isReportStale(
  lastRunMs: number | undefined,
  staleAfterDays: number,
  nowMs: number,
): boolean {
  if (lastRunMs === undefined || staleAfterDays <= 0) return false;
  return nowMs - lastRunMs >= staleAfterDays * 86_400_000;
}

/**
 * StoryReport.ci.name carries the raw transport name — lowercase provider
 * keys ("github") from env detection, or a free-form string from older
 * adapters ("GitHub Actions"). Map the known keys to display names and pass
 * everything else through.
 */
const CI_DISPLAY_NAMES: Record<string, string> = {
  github: "GitHub Actions",
  gitlab: "GitLab CI",
  circleci: "CircleCI",
  jenkins: "Jenkins",
  azure: "Azure DevOps",
  buildkite: "Buildkite",
  travis: "Travis CI",
  ci: "CI",
};

export function ciDisplayName(name: string): string {
  return CI_DISPLAY_NAMES[name] ?? name;
}

/**
 * Derive a browsable commit URL from the CI run URL, for the providers whose
 * URL structure makes that safe:
 *   GitHub Actions  …/owner/repo/actions/runs/123      -> …/owner/repo/commit/<sha>
 *   GitLab CI       …/group/project/-/pipelines/123    -> …/group/project/-/commit/<sha>
 * Other providers return undefined (a wrong link is worse than none).
 */
export function commitUrl(ci: ReportCI | undefined, sha: string | undefined): string | undefined {
  const commitSha = ci?.commitSha ?? sha;
  if (!ci?.url || !commitSha) return undefined;

  const github = ci.url.match(/^(https?:\/\/[^/]+\/[^/]+\/[^/]+)\/actions\/runs\//);
  if (github) return `${github[1]}/commit/${commitSha}`;

  const gitlab = ci.url.match(/^(https?:\/\/.+)\/-\/pipelines\//);
  if (gitlab) return `${gitlab[1]}/-/commit/${commitSha}`;

  return undefined;
}

/**
 * Derive a pull-request URL for GitHub-shaped CI run URLs. GitLab and the
 * rest return undefined for the same wrong-link-is-worse-than-none reason.
 */
export function prUrl(ci: ReportCI | undefined): string | undefined {
  if (!ci?.url || !ci.prNumber) return undefined;
  const github = ci.url.match(/^(https?:\/\/[^/]+\/[^/]+\/[^/]+)\/actions\/runs\//);
  if (github) return `${github[1]}/pull/${ci.prNumber}`;
  return undefined;
}
