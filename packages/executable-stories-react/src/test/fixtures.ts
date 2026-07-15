import type {
  ReportFeature,
  ReportScenario,
  ReportStep,
  ReportSummary,
  StoryReport,
} from "executable-stories-core";

/**
 * Shared scenario fixtures for the component tier. One place so stories,
 * play functions, and any future snapshot baselines never drift apart
 * (the testing-levels rule: shared mocks live in one location).
 */
let seq = 0;
const id = (p: string) => `${p}-${(seq += 1)}`;

function step(partial: Partial<ReportStep> & Pick<ReportStep, "keyword" | "text">): ReportStep {
  return {
    id: id("step"),
    index: 0,
    status: "passed",
    durationMs: 10,
    docEntries: [],
    ...partial,
  };
}

export function passedScenario(overrides: Partial<ReportScenario> = {}): ReportScenario {
  return {
    id: id("scenario"),
    title: "A returning customer checks out with a saved card",
    status: "passed",
    durationMs: 42,
    tags: ["checkout", "payments"],
    retry: 0,
    retries: 0,
    docEntries: [],
    attachments: [],
    steps: [
      step({ keyword: "Given", text: "a returning customer with a saved card" }),
      step({ keyword: "When", text: "they confirm the order" }),
      step({ keyword: "Then", text: "the order is placed" }),
      step({ keyword: "And", text: "a receipt is emailed" }),
    ],
    ...overrides,
  };
}

export function failedScenario(overrides: Partial<ReportScenario> = {}): ReportScenario {
  return {
    id: id("scenario"),
    title: "Checkout is blocked when the card is declined",
    status: "failed",
    durationMs: 88,
    tags: ["checkout", "payments"],
    retry: 0,
    retries: 0,
    errorMessage:
      'AssertionError: expected "Order placed" to include "declined"\n    at src/checkout.story.test.ts:42:5',
    docEntries: [],
    attachments: [],
    steps: [
      step({ keyword: "Given", text: "a customer whose card will be declined" }),
      step({ keyword: "When", text: "they confirm the order" }),
      step({ keyword: "Then", text: "they see a clear decline message" }),
      step({
        keyword: "But",
        text: "the order is not placed",
        status: "failed",
        errorMessage:
          'AssertionError: expected "Order placed" to include "declined"\n    at src/checkout.story.test.ts:42:5',
      }),
    ],
    ...overrides,
  };
}

export function summaryOf(scenarios: ReportScenario[]): ReportSummary {
  const count = (s: string) => scenarios.filter((sc) => sc.status === s).length;
  return {
    total: scenarios.length,
    passed: count("passed"),
    failed: count("failed"),
    skipped: count("skipped"),
    pending: count("pending"),
    durationMs: scenarios.reduce((n, s) => n + s.durationMs, 0),
  };
}

export function featureFixture(overrides: Partial<ReportFeature> = {}): ReportFeature {
  const scenarios = [passedScenario(), failedScenario(), skippedScenario()];
  return {
    id: id("feature"),
    title: "Checkout",
    sourceFile: "src/checkout.story.test.ts",
    summary: summaryOf(scenarios),
    scenarios,
    ...overrides,
  };
}

export function reportFixture(overrides: Partial<StoryReport> = {}): StoryReport {
  const features = [featureFixture()];
  const all = features.flatMap((f) => f.scenarios);
  return {
    schemaVersion: "1.0",
    runId: "run-fixture",
    startedAtMs: 0,
    finishedAtMs: 100,
    durationMs: 100,
    projectRoot: "/repo",
    summary: summaryOf(all),
    features,
    ...overrides,
  };
}

/**
 * A report with a single feature holding a single scenario — mirrors the
 * standalone "Trolley Widget" report (one Playwright story). Reproduces the
 * sparse-report layout case: an in-content TOC rail for one scenario looks
 * unbalanced next to the content, so the design must adapt when scenarios are
 * few. Use to iterate that layout in Storybook.
 */
export function singleScenarioReport(overrides: Partial<StoryReport> = {}): StoryReport {
  const scenario = passedScenario({
    title: "loads signed iframe so an artist can enter payout details",
    tags: ["oopsi", "recipient", "ui", "widget"],
    durationMs: 25130,
    steps: [
      step({ keyword: "Given", text: "the Hono fixture host can mint a signed widget URL" }),
      step({ keyword: "When", text: "the host page embeds the iframe and waits for Widget events" }),
      step({ keyword: "Then", text: "the host surface is visible with the embedded widget" }),
    ],
    docEntries: [
      {
        kind: "section",
        title: "Artist payout profile",
        markdown:
          "Curve embeds the Trolley Widget so payees can enter payout details themselves.\n\n" +
          "**Who cares:** Artists onboarding to get paid. **Risk if broken:** payees can't self-serve, so ops onboard by hand.",
      },
    ] as ReportScenario["docEntries"],
  });
  const feature: ReportFeature = {
    id: id("feature"),
    title: "Trolley Widget: payee self-serve profile",
    sourceFile: "widget.story.spec.ts",
    summary: summaryOf([scenario]),
    scenarios: [scenario],
  };
  const finishedAtMs = Date.now();
  return {
    schemaVersion: "1.0",
    runId: "run-widget",
    startedAtMs: finishedAtMs - 25770,
    finishedAtMs,
    durationMs: 25770,
    projectRoot: "/repo",
    packageVersion: "1.0.0",
    gitSha: "b6acd787",
    summary: summaryOf([scenario]),
    features: [feature],
    ...overrides,
  };
}

export function skippedScenario(overrides: Partial<ReportScenario> = {}): ReportScenario {
  return {
    id: id("scenario"),
    title: "Gift wrapping is offered above the free-wrap threshold",
    status: "skipped",
    durationMs: 0,
    tags: ["checkout"],
    retry: 0,
    retries: 0,
    docEntries: [],
    attachments: [],
    steps: [
      step({ keyword: "Given", text: "a basket above the threshold", status: "skipped" }),
      step({ keyword: "Then", text: "gift wrapping is offered", status: "skipped" }),
    ],
    ...overrides,
  };
}
