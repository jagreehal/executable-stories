/**
 * Comprehensive tests for detectCI utility.
 *
 * Covers all providers, field population, precedence, edge cases,
 * and PR number parsing.
 */

import { describe, it, expect } from "vitest";
import { detectCI } from "../../src/utils/ci-detect";

describe("detectCI", () => {
  describe("returns undefined when no CI env vars", () => {
    it("returns undefined for empty env", () => {
      expect(detectCI({})).toBeUndefined();
    });

    it("returns undefined when unrelated env vars are set", () => {
      expect(detectCI({ HOME: "/home/user", PATH: "/usr/bin" })).toBeUndefined();
    });
  });

  describe("generic CI fallback", () => {
    it("returns provider unknown when only CI=true", () => {
      const result = detectCI({ CI: "true" });
      expect(result).toEqual({
        name: "ci",
        provider: "unknown",
      });
    });

    it("does not fire when CI is not exactly 'true'", () => {
      expect(detectCI({ CI: "1" })).toBeUndefined();
      expect(detectCI({ CI: "yes" })).toBeUndefined();
      expect(detectCI({ CI: "TRUE" })).toBeUndefined();
    });
  });

  describe("GitHub Actions", () => {
    const baseEnv = {
      GITHUB_ACTIONS: "true",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "org/repo",
      GITHUB_RUN_ID: "12345",
      GITHUB_RUN_NUMBER: "42",
      GITHUB_SHA: "abc1234567890def",
      GITHUB_REF_NAME: "main",
    };

    it("returns correct provider and all fields", () => {
      const result = detectCI(baseEnv);
      expect(result).toEqual({
        name: "github",
        provider: "github",
        buildNumber: "42",
        url: "https://github.com/org/repo/actions/runs/12345",
        branch: "main",
        commitSha: "abc1234567890def",
        prNumber: undefined,
      });
    });

    it("prefers GITHUB_HEAD_REF over GITHUB_REF_NAME for branch", () => {
      const result = detectCI({
        ...baseEnv,
        GITHUB_HEAD_REF: "feature/my-branch",
        GITHUB_REF_NAME: "main",
      });
      expect(result?.branch).toBe("feature/my-branch");
    });

    it("falls back to GITHUB_REF_NAME when GITHUB_HEAD_REF is empty string", () => {
      // On push events, GITHUB_HEAD_REF is set to empty string
      const result = detectCI({
        ...baseEnv,
        GITHUB_HEAD_REF: "",
        GITHUB_REF_NAME: "main",
      });
      expect(result?.branch).toBe("main");
    });

    it("parses PR number from refs/pull/<n>/merge", () => {
      const result = detectCI({
        ...baseEnv,
        GITHUB_REF: "refs/pull/123/merge",
      });
      expect(result?.prNumber).toBe("123");
    });

    it("parses PR number from refs/pull/<n>/head", () => {
      const result = detectCI({
        ...baseEnv,
        GITHUB_REF: "refs/pull/456/head",
      });
      expect(result?.prNumber).toBe("456");
    });

    it("does not parse PR number from non-PR refs", () => {
      const result = detectCI({
        ...baseEnv,
        GITHUB_REF: "refs/heads/main",
      });
      expect(result?.prNumber).toBeUndefined();
    });

    it("returns undefined URL when components are missing", () => {
      const result = detectCI({
        GITHUB_ACTIONS: "true",
        GITHUB_SERVER_URL: "https://github.com",
        // Missing GITHUB_REPOSITORY and GITHUB_RUN_ID
      });
      expect(result?.url).toBeUndefined();
    });
  });

  describe("GitLab CI", () => {
    const baseEnv = {
      GITLAB_CI: "true",
      CI_PIPELINE_IID: "77",
      CI_PIPELINE_URL: "https://gitlab.com/org/repo/-/pipelines/77",
      CI_COMMIT_REF_NAME: "develop",
      CI_COMMIT_SHA: "def456789",
      CI_MERGE_REQUEST_IID: "15",
    };

    it("returns correct provider and all fields", () => {
      const result = detectCI(baseEnv);
      expect(result).toEqual({
        name: "gitlab",
        provider: "gitlab",
        buildNumber: "77",
        url: "https://gitlab.com/org/repo/-/pipelines/77",
        branch: "develop",
        commitSha: "def456789",
        prNumber: "15",
      });
    });

    it("returns undefined for optional fields when not set", () => {
      const result = detectCI({ GITLAB_CI: "true" });
      expect(result?.provider).toBe("gitlab");
      expect(result?.buildNumber).toBeUndefined();
      expect(result?.url).toBeUndefined();
      expect(result?.branch).toBeUndefined();
      expect(result?.commitSha).toBeUndefined();
      expect(result?.prNumber).toBeUndefined();
    });
  });

  describe("CircleCI", () => {
    const baseEnv = {
      CIRCLECI: "true",
      CIRCLE_BUILD_NUM: "99",
      CIRCLE_BUILD_URL: "https://circleci.com/gh/org/repo/99",
      CIRCLE_BRANCH: "feature/test",
      CIRCLE_SHA1: "aaa111bbb222",
      CIRCLE_PULL_REQUEST: "https://github.com/org/repo/pull/42",
    };

    it("returns correct provider and all fields", () => {
      const result = detectCI(baseEnv);
      expect(result).toEqual({
        name: "circleci",
        provider: "circleci",
        buildNumber: "99",
        url: "https://circleci.com/gh/org/repo/99",
        branch: "feature/test",
        commitSha: "aaa111bbb222",
        prNumber: "42",
      });
    });

    it("parses PR number from trailing digits of URL", () => {
      const result = detectCI({
        ...baseEnv,
        CIRCLE_PULL_REQUEST: "https://github.com/org/repo/pull/789",
      });
      expect(result?.prNumber).toBe("789");
    });

    it("returns undefined prNumber when CIRCLE_PULL_REQUEST is not a URL with trailing digits", () => {
      const result = detectCI({
        ...baseEnv,
        CIRCLE_PULL_REQUEST: "not-a-url",
      });
      expect(result?.prNumber).toBeUndefined();
    });

    it("returns undefined prNumber when CIRCLE_PULL_REQUEST is undefined", () => {
      const result = detectCI({
        CIRCLECI: "true",
      });
      expect(result?.prNumber).toBeUndefined();
    });
  });

  describe("Jenkins", () => {
    const baseEnv = {
      JENKINS_URL: "https://jenkins.example.com/",
      BUILD_NUMBER: "55",
      BUILD_URL: "https://jenkins.example.com/job/my-project/55/",
      GIT_BRANCH: "origin/main",
      GIT_COMMIT: "ccc333ddd444",
    };

    it("returns correct provider and all fields", () => {
      const result = detectCI(baseEnv);
      expect(result).toEqual({
        name: "jenkins",
        provider: "jenkins",
        buildNumber: "55",
        url: "https://jenkins.example.com/job/my-project/55/",
        branch: "origin/main",
        commitSha: "ccc333ddd444",
      });
    });

    it("detects Jenkins even with empty JENKINS_URL", () => {
      const result = detectCI({ JENKINS_URL: "" });
      expect(result?.provider).toBe("jenkins");
    });

    it("does not include prNumber (Jenkins has no standard PR env var)", () => {
      const result = detectCI(baseEnv);
      expect(result?.prNumber).toBeUndefined();
    });
  });

  describe("Azure DevOps", () => {
    const baseEnv = {
      TF_BUILD: "True",
      BUILD_BUILDID: "101",
      BUILD_SOURCEBRANCH: "refs/heads/feature/azure-test",
      BUILD_SOURCEVERSION: "eee555fff666",
      SYSTEM_TEAMFOUNDATIONSERVERURI: "https://dev.azure.com/myorg/",
      SYSTEM_TEAMPROJECT: "MyProject",
      SYSTEM_PULLREQUEST_PULLREQUESTID: "33",
    };

    it("returns correct provider and all fields", () => {
      const result = detectCI(baseEnv);
      expect(result).toEqual({
        name: "azure",
        provider: "azure",
        buildNumber: "101",
        url: "https://dev.azure.com/myorg/MyProject/_build/results?buildId=101",
        branch: "feature/azure-test",
        commitSha: "eee555fff666",
        prNumber: "33",
      });
    });

    it("strips refs/heads/ prefix from branch", () => {
      const result = detectCI({
        ...baseEnv,
        BUILD_SOURCEBRANCH: "refs/heads/main",
      });
      expect(result?.branch).toBe("main");
    });

    it("preserves branch that does not start with refs/heads/", () => {
      const result = detectCI({
        ...baseEnv,
        BUILD_SOURCEBRANCH: "refs/tags/v1.0.0",
      });
      expect(result?.branch).toBe("refs/tags/v1.0.0");
    });

    it("returns undefined URL when server URI is missing", () => {
      const result = detectCI({
        TF_BUILD: "True",
        BUILD_BUILDID: "101",
        SYSTEM_TEAMPROJECT: "MyProject",
        // Missing SYSTEM_TEAMFOUNDATIONSERVERURI
      });
      expect(result?.url).toBeUndefined();
    });

    it("returns undefined URL when team project is missing", () => {
      const result = detectCI({
        TF_BUILD: "True",
        BUILD_BUILDID: "101",
        SYSTEM_TEAMFOUNDATIONSERVERURI: "https://dev.azure.com/myorg/",
        // Missing SYSTEM_TEAMPROJECT
      });
      expect(result?.url).toBeUndefined();
    });

    it("returns undefined URL when build ID is missing", () => {
      const result = detectCI({
        TF_BUILD: "True",
        SYSTEM_TEAMFOUNDATIONSERVERURI: "https://dev.azure.com/myorg/",
        SYSTEM_TEAMPROJECT: "MyProject",
        // Missing BUILD_BUILDID
      });
      expect(result?.url).toBeUndefined();
      expect(result?.buildNumber).toBeUndefined();
    });

    it("returns undefined branch when BUILD_SOURCEBRANCH is not set", () => {
      const result = detectCI({ TF_BUILD: "True" });
      expect(result?.branch).toBeUndefined();
    });
  });

  describe("Buildkite", () => {
    const baseEnv = {
      BUILDKITE: "true",
      BUILDKITE_BUILD_NUMBER: "200",
      BUILDKITE_BUILD_URL:
        "https://buildkite.com/myorg/mypipeline/builds/200",
      BUILDKITE_BRANCH: "feature/bk",
      BUILDKITE_COMMIT: "ggg777hhh888",
      BUILDKITE_PULL_REQUEST: "55",
    };

    it("returns correct provider and all fields", () => {
      const result = detectCI(baseEnv);
      expect(result).toEqual({
        name: "buildkite",
        provider: "buildkite",
        buildNumber: "200",
        url: "https://buildkite.com/myorg/mypipeline/builds/200",
        branch: "feature/bk",
        commitSha: "ggg777hhh888",
        prNumber: "55",
      });
    });

    it("returns undefined prNumber when BUILDKITE_PULL_REQUEST is 'false'", () => {
      const result = detectCI({
        ...baseEnv,
        BUILDKITE_PULL_REQUEST: "false",
      });
      expect(result?.prNumber).toBeUndefined();
    });

    it("returns undefined prNumber when BUILDKITE_PULL_REQUEST is not set", () => {
      const result = detectCI({
        BUILDKITE: "true",
      });
      expect(result?.prNumber).toBeUndefined();
    });
  });

  describe("Travis CI", () => {
    const baseEnv = {
      TRAVIS: "true",
      TRAVIS_BUILD_NUMBER: "300",
      TRAVIS_BUILD_WEB_URL:
        "https://app.travis-ci.com/github/org/repo/builds/300",
      TRAVIS_BRANCH: "master",
      TRAVIS_COMMIT: "iii999jjj000",
      TRAVIS_PULL_REQUEST: "77",
    };

    it("returns correct provider and all fields", () => {
      const result = detectCI(baseEnv);
      expect(result).toEqual({
        name: "travis",
        provider: "travis",
        buildNumber: "300",
        url: "https://app.travis-ci.com/github/org/repo/builds/300",
        branch: "master",
        commitSha: "iii999jjj000",
        prNumber: "77",
      });
    });

    it("returns undefined prNumber when TRAVIS_PULL_REQUEST is 'false'", () => {
      const result = detectCI({
        ...baseEnv,
        TRAVIS_PULL_REQUEST: "false",
      });
      expect(result?.prNumber).toBeUndefined();
    });

    it("returns undefined prNumber when TRAVIS_PULL_REQUEST is not set", () => {
      const result = detectCI({
        TRAVIS: "true",
      });
      expect(result?.prNumber).toBeUndefined();
    });
  });

  describe("precedence", () => {
    it("Azure wins over GitHub when both TF_BUILD and GITHUB_ACTIONS are set", () => {
      const result = detectCI({
        TF_BUILD: "True",
        GITHUB_ACTIONS: "true",
        CI: "true",
      });
      expect(result?.provider).toBe("azure");
      expect(result?.name).toBe("azure");
    });

    it("Buildkite wins over GitHub when both are set", () => {
      const result = detectCI({
        BUILDKITE: "true",
        GITHUB_ACTIONS: "true",
        CI: "true",
      });
      expect(result?.provider).toBe("buildkite");
    });

    it("GitHub wins over GitLab when both are set (without Azure/Buildkite)", () => {
      const result = detectCI({
        GITHUB_ACTIONS: "true",
        GITLAB_CI: "true",
        CI: "true",
      });
      expect(result?.provider).toBe("github");
    });

    it("GitLab wins over CircleCI when both are set", () => {
      const result = detectCI({
        GITLAB_CI: "true",
        CIRCLECI: "true",
        CI: "true",
      });
      expect(result?.provider).toBe("gitlab");
    });

    it("CircleCI wins over Jenkins when both are set", () => {
      const result = detectCI({
        CIRCLECI: "true",
        JENKINS_URL: "https://jenkins.example.com",
        CI: "true",
      });
      expect(result?.provider).toBe("circleci");
    });

    it("Jenkins wins over Travis when both are set", () => {
      const result = detectCI({
        JENKINS_URL: "https://jenkins.example.com",
        TRAVIS: "true",
        CI: "true",
      });
      expect(result?.provider).toBe("jenkins");
    });

    it("Travis wins over generic CI", () => {
      const result = detectCI({
        TRAVIS: "true",
        CI: "true",
      });
      expect(result?.provider).toBe("travis");
    });

    it("generic CI is lowest-priority named provider", () => {
      const result = detectCI({
        CI: "true",
      });
      expect(result?.provider).toBe("unknown");
    });
  });

  describe("defaults to process.env when no argument", () => {
    it("signature accepts no arguments", () => {
      // Just verify the function can be called with no args (uses process.env)
      // The actual result depends on the test runner's env
      const result = detectCI();
      // In CI, this returns a provider; locally it may return undefined or unknown
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });
});
