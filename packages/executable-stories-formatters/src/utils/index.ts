/**
 * Utility exports.
 */

export { readGitSha, findGitDir, readBranchName } from "./git-info";
export { formatDuration, msToNanoseconds, nanosecondsToMs } from "./duration";
export { detectCI } from "./ci-detect";
export {
  tryGetActiveOtelContext,
  resolveTraceUrl,
  type OtelTraceContext,
} from "./otel-detect";
