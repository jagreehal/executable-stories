import { describe, it, expect } from "vitest";
import {
  reportLastRunMs,
  formatRelativeAge,
  isReportStale,
  scenarioLastRunMs,
  commitUrl,
  prUrl,
} from "../src/lib/provenance";

const DAY = 86_400_000;

describe("reportLastRunMs", () => {
  it("prefers finishedAtMs", () => {
    expect(reportLastRunMs({ startedAtMs: 100, finishedAtMs: 200 })).toBe(200);
  });

  it("falls back to startedAtMs when finishedAtMs is missing or zero", () => {
    expect(reportLastRunMs({ startedAtMs: 100, finishedAtMs: 0 })).toBe(100);
  });

  it("returns undefined when neither timestamp is set", () => {
    expect(reportLastRunMs({ startedAtMs: 0, finishedAtMs: 0 })).toBeUndefined();
  });
});

describe("formatRelativeAge", () => {
  const now = 1_700_000_000_000;

  it("reads as 'just now' under a minute (and for future timestamps)", () => {
    expect(formatRelativeAge(now - 30_000, now)).toBe("just now");
    expect(formatRelativeAge(now + 60_000, now)).toBe("just now");
  });

  it("uses minutes, hours, days with singular/plural forms", () => {
    expect(formatRelativeAge(now - 60_000, now)).toBe("1 minute ago");
    expect(formatRelativeAge(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(formatRelativeAge(now - 3_600_000, now)).toBe("1 hour ago");
    expect(formatRelativeAge(now - 3 * 3_600_000, now)).toBe("3 hours ago");
    expect(formatRelativeAge(now - DAY, now)).toBe("1 day ago");
    expect(formatRelativeAge(now - 12 * DAY, now)).toBe("12 days ago");
  });
});

describe("isReportStale", () => {
  const now = 1_700_000_000_000;

  it("is stale at or past the threshold", () => {
    expect(isReportStale(now - 7 * DAY, 7, now)).toBe(true);
    expect(isReportStale(now - 8 * DAY, 7, now)).toBe(true);
  });

  it("is fresh under the threshold", () => {
    expect(isReportStale(now - 6 * DAY, 7, now)).toBe(false);
  });

  it("never stale when disabled (0) or without a timestamp", () => {
    expect(isReportStale(now - 100 * DAY, 0, now)).toBe(false);
    expect(isReportStale(undefined, 7, now)).toBe(false);
  });
});

describe("commitUrl", () => {
  it("derives a GitHub commit URL from an Actions run URL", () => {
    expect(
      commitUrl({ name: "GitHub Actions", url: "https://github.com/acme/shop/actions/runs/42", commitSha: "a1b2c3d" }, undefined),
    ).toBe("https://github.com/acme/shop/commit/a1b2c3d");
  });

  it("derives a GitLab commit URL from a pipeline URL", () => {
    expect(
      commitUrl({ name: "GitLab CI", url: "https://gitlab.com/acme/sub/shop/-/pipelines/9" }, "deadbeef"),
    ).toBe("https://gitlab.com/acme/sub/shop/-/commit/deadbeef");
  });

  it("falls back to the report gitSha when ci.commitSha is missing", () => {
    expect(
      commitUrl({ name: "GitHub Actions", url: "https://github.com/acme/shop/actions/runs/42" }, "fee1dead"),
    ).toBe("https://github.com/acme/shop/commit/fee1dead");
  });

  it("returns undefined for unrecognised URL shapes or missing data", () => {
    expect(commitUrl({ name: "Jenkins", url: "https://ci.acme.dev/job/shop/42/" }, "sha")).toBeUndefined();
    expect(commitUrl({ name: "GitHub Actions" }, "sha")).toBeUndefined();
    expect(commitUrl({ name: "GitHub Actions", url: "https://github.com/acme/shop/actions/runs/42" }, undefined)).toBeUndefined();
  });
});

describe("prUrl", () => {
  it("derives a GitHub pull request URL", () => {
    expect(
      prUrl({ name: "GitHub Actions", url: "https://github.com/acme/shop/actions/runs/42", prNumber: "318" }),
    ).toBe("https://github.com/acme/shop/pull/318");
  });

  it("returns undefined without a PR number or for non-GitHub URLs", () => {
    expect(prUrl({ name: "GitHub Actions", url: "https://github.com/acme/shop/actions/runs/42" })).toBeUndefined();
    expect(prUrl({ name: "GitLab CI", url: "https://gitlab.com/acme/shop/-/pipelines/9", prNumber: "3" })).toBeUndefined();
  });
});

describe("scenarioLastRunMs", () => {
  const report = { startedAtMs: DAY * 100, finishedAtMs: DAY * 100 };

  it("reports when the scenario itself last ran, not when the report was rendered", () => {
    const carried = { lastRunAtMs: DAY * 90 };
    expect(scenarioLastRunMs(carried, report)).toBe(DAY * 90);
  });

  it("falls back to the run for scenarios with no stamp of their own", () => {
    expect(scenarioLastRunMs({}, report)).toBe(DAY * 100);
  });

  it("marks a carried-over scenario stale inside a freshly rendered report", () => {
    const now = DAY * 100;
    // The report itself just ran, so the report-level banner stays fresh.
    expect(isReportStale(reportLastRunMs(report), 7, now)).toBe(false);
    // This scenario has not run in ten days and must not borrow that freshness.
    const carried = { lastRunAtMs: DAY * 90 };
    expect(isReportStale(scenarioLastRunMs(carried, report), 7, now)).toBe(true);
  });
});
