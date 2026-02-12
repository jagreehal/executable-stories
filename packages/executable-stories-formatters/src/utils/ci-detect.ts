/**
 * CI environment auto-detection utility.
 *
 * Detects known CI providers from environment variables.
 * Precedence: GitHub Actions > CircleCI > Jenkins > Travis > GitLab CI > generic CI
 */

import type { RawCIInfo } from "../types/raw";

/**
 * Detect CI environment from process.env.
 * Returns undefined when not running in CI.
 */
export function detectCI(
  env: Record<string, string | undefined> = process.env
): RawCIInfo | undefined {
  // GitHub Actions
  if (env.GITHUB_ACTIONS === "true") {
    const url =
      env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
        ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
        : undefined;
    return {
      name: "github",
      buildNumber: env.GITHUB_RUN_NUMBER,
      url,
    };
  }

  // CircleCI
  if (env.CIRCLECI === "true") {
    return {
      name: "circleci",
      buildNumber: env.CIRCLE_BUILD_NUM,
      url: env.CIRCLE_BUILD_URL,
    };
  }

  // Jenkins
  if (env.JENKINS_URL !== undefined) {
    return {
      name: "jenkins",
      buildNumber: env.BUILD_NUMBER,
      url: env.BUILD_URL,
    };
  }

  // Travis CI
  if (env.TRAVIS === "true") {
    return {
      name: "travis",
      buildNumber: env.TRAVIS_BUILD_NUMBER,
      url: env.TRAVIS_BUILD_WEB_URL,
    };
  }

  // GitLab CI
  if (env.GITLAB_CI === "true") {
    return {
      name: "gitlab",
      buildNumber: env.CI_PIPELINE_IID,
      url: env.CI_PIPELINE_URL,
    };
  }

  // Generic CI (fallback)
  if (env.CI === "true") {
    return {
      name: "ci",
    };
  }

  return undefined;
}
