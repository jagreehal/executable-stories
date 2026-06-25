/**
 * CI environment auto-detection utility.
 *
 * Detects known CI providers from environment variables and populates
 * branch, commit SHA, PR number, build number, and URL metadata.
 *
 * Precedence (checked in order, first match wins):
 *   1. TF_BUILD=True        -> azure
 *   2. BUILDKITE=true        -> buildkite
 *   3. GITHUB_ACTIONS=true   -> github
 *   4. GITLAB_CI=true        -> gitlab
 *   5. CIRCLECI=true         -> circleci
 *   6. JENKINS_URL defined   -> jenkins
 *   7. TRAVIS=true           -> travis
 *   8. CI=true               -> unknown (generic fallback; note: fires in dev shells too)
 *   9. Nothing               -> undefined (not in CI)
 */

import type { RawCIInfo } from "executable-stories-core/types/raw";

/**
 * Detect CI environment from process.env.
 * Returns undefined when not running in CI.
 */
export function detectCI(
  env: Record<string, string | undefined> = process.env,
): RawCIInfo | undefined {
  // 1. Azure DevOps (TF_BUILD is "True" with capital T)
  if (env.TF_BUILD === "True") {
    const branch = env.BUILD_SOURCEBRANCH?.replace(/^refs\/heads\//, "");

    // URL requires all three components
    const serverUri = env.SYSTEM_TEAMFOUNDATIONSERVERURI;
    const teamProject = env.SYSTEM_TEAMPROJECT;
    const buildId = env.BUILD_BUILDID;
    const url =
      serverUri && teamProject && buildId
        ? `${serverUri}${teamProject}/_build/results?buildId=${buildId}`
        : undefined;

    return {
      name: "azure",
      provider: "azure",
      buildNumber: buildId,
      url,
      branch,
      commitSha: env.BUILD_SOURCEVERSION,
      prNumber: env.SYSTEM_PULLREQUEST_PULLREQUESTID,
    };
  }

  // 2. Buildkite
  if (env.BUILDKITE === "true") {
    const prRaw = env.BUILDKITE_PULL_REQUEST;
    const prNumber = prRaw && prRaw !== "false" ? prRaw : undefined;

    return {
      name: "buildkite",
      provider: "buildkite",
      buildNumber: env.BUILDKITE_BUILD_NUMBER,
      url: env.BUILDKITE_BUILD_URL,
      branch: env.BUILDKITE_BRANCH,
      commitSha: env.BUILDKITE_COMMIT,
      prNumber,
    };
  }

  // 3. GitHub Actions
  if (env.GITHUB_ACTIONS === "true") {
    const url =
      env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
        ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
        : undefined;

    // GITHUB_HEAD_REF is set on pull_request events; GITHUB_REF_NAME is always set
    const branch = env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME;

    // Parse PR number from GITHUB_REF: refs/pull/<n>/merge or refs/pull/<n>/head
    const prMatch = env.GITHUB_REF?.match(/^refs\/pull\/(\d+)\/(merge|head)$/);
    const prNumber = prMatch ? prMatch[1] : undefined;

    return {
      name: "github",
      provider: "github",
      buildNumber: env.GITHUB_RUN_NUMBER,
      url,
      branch,
      commitSha: env.GITHUB_SHA,
      prNumber,
    };
  }

  // 4. GitLab CI
  if (env.GITLAB_CI === "true") {
    return {
      name: "gitlab",
      provider: "gitlab",
      buildNumber: env.CI_PIPELINE_IID,
      url: env.CI_PIPELINE_URL,
      branch: env.CI_COMMIT_REF_NAME,
      commitSha: env.CI_COMMIT_SHA,
      prNumber: env.CI_MERGE_REQUEST_IID,
    };
  }

  // 5. CircleCI
  if (env.CIRCLECI === "true") {
    // Parse PR number from trailing digits of CIRCLE_PULL_REQUEST URL
    // e.g. https://github.com/org/repo/pull/42 -> "42"
    const prUrl = env.CIRCLE_PULL_REQUEST;
    const prMatch = prUrl?.match(/\/(\d+)$/);
    const prNumber = prMatch ? prMatch[1] : undefined;

    return {
      name: "circleci",
      provider: "circleci",
      buildNumber: env.CIRCLE_BUILD_NUM,
      url: env.CIRCLE_BUILD_URL,
      branch: env.CIRCLE_BRANCH,
      commitSha: env.CIRCLE_SHA1,
      prNumber,
    };
  }

  // 6. Jenkins (detected by JENKINS_URL being defined, any value)
  if (env.JENKINS_URL !== undefined) {
    return {
      name: "jenkins",
      provider: "jenkins",
      buildNumber: env.BUILD_NUMBER,
      url: env.BUILD_URL,
      branch: env.GIT_BRANCH,
      commitSha: env.GIT_COMMIT,
    };
  }

  // 7. Travis CI
  if (env.TRAVIS === "true") {
    const prRaw = env.TRAVIS_PULL_REQUEST;
    const prNumber = prRaw && prRaw !== "false" ? prRaw : undefined;

    return {
      name: "travis",
      provider: "travis",
      buildNumber: env.TRAVIS_BUILD_NUMBER,
      url: env.TRAVIS_BUILD_WEB_URL,
      branch: env.TRAVIS_BRANCH,
      commitSha: env.TRAVIS_COMMIT,
      prNumber,
    };
  }

  // 8. Generic CI fallback (note: CI=true fires in many dev shells too)
  if (env.CI === "true") {
    return {
      name: "ci",
      provider: "unknown",
    };
  }

  // 9. Not in CI
  return undefined;
}
