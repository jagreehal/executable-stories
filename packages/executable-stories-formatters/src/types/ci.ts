/**
 * Typed CI provider and canonical CI info.
 *
 * RawCIInfo.name = legacy transport string (kept for backward compat + schema).
 * CIInfo.displayName = canonical display name for downstream consumers.
 *
 * All downstream code (HTML meta, notifications, history) uses CIInfo via mappers.
 */

import type { RawCIInfo } from "./raw";

export type CIProvider =
  | "github"
  | "gitlab"
  | "circleci"
  | "jenkins"
  | "azure"
  | "buildkite"
  | "travis"
  | "unknown";

export interface CIInfo {
  provider: CIProvider;
  displayName: string;
  url?: string;
  buildNumber?: string;
  branch?: string;
  commitSha?: string;
  prNumber?: string;
}

const DISPLAY_NAMES: Record<CIProvider, string> = {
  github: "GitHub Actions",
  gitlab: "GitLab CI",
  circleci: "CircleCI",
  jenkins: "Jenkins",
  azure: "Azure DevOps",
  buildkite: "Buildkite",
  travis: "Travis CI",
  unknown: "CI",
};

const NAME_TO_PROVIDER: Record<string, CIProvider> = {
  github: "github",
  gitlab: "gitlab",
  circleci: "circleci",
  jenkins: "jenkins",
  azure: "azure",
  buildkite: "buildkite",
  travis: "travis",
  ci: "unknown",
};

/** Convert RawCIInfo (legacy transport) to canonical CIInfo. */
export function toCIInfo(raw?: RawCIInfo): CIInfo | undefined {
  if (!raw) return undefined;

  const provider: CIProvider =
    raw.provider ?? NAME_TO_PROVIDER[raw.name] ?? "unknown";

  return {
    provider,
    displayName: DISPLAY_NAMES[provider],
    url: raw.url,
    buildNumber: raw.buildNumber,
    branch: raw.branch,
    commitSha: raw.commitSha,
    prNumber: raw.prNumber,
  };
}

/** Convert canonical CIInfo back to RawCIInfo (for serialization). */
export function toRawCIInfo(ci?: CIInfo): RawCIInfo | undefined {
  if (!ci) return undefined;

  return {
    name: ci.provider === "unknown" ? "ci" : ci.provider,
    provider: ci.provider,
    url: ci.url,
    buildNumber: ci.buildNumber,
    branch: ci.branch,
    commitSha: ci.commitSha,
    prNumber: ci.prNumber,
  };
}
