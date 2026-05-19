import { buildBody } from "../src/formatters/html/renderers/body";
import { renderMetaInfo } from "../src/formatters/html/renderers/meta";
import { renderSummary } from "../src/formatters/html/renderers/summary";
import { renderTagBar } from "../src/formatters/html/renderers/tag-bar";
import { renderFeature } from "../src/formatters/html/renderers/feature";
import { renderScenario } from "../src/formatters/html/renderers/scenario";
import { renderFailureSummary } from "../src/formatters/html/renderers/failure-summary";
import { escapeHtml } from "../src/formatters/html/template";
import {
  createFixtureRun,
  passedScenario,
  failedScenario,
  skippedScenario,
  scenarioWithDocs,
} from "./fixtures";
import { scenarioDeps } from "./_shared";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Full Report",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "End-to-end composition: meta info, summary, tag bar, failure summary, and feature blocks with scenarios. Mirrors what the HTML formatter actually emits.",
      },
    },
  },
};
export default meta;

const buildBodyDeps = {
  renderMetaInfo,
  renderSummary,
  renderTagBar,
  renderFeature,
  renderFailureSummary,
  metaDeps: { escapeHtml },
  summaryDeps: {},
  tagBarDeps: { escapeHtml },
  featureDeps: {
    escapeHtml,
    startCollapsed: false,
    renderScenario,
    scenarioDeps,
  },
  failureSummaryDeps: { escapeHtml },
};

export const MixedRun: StoryObj = {
  render: () => {
    const cases = [
      passedScenario({
        id: "auth-1",
        sourceFile: "src/auth/login.story.test.ts",
        titlePath: ["Authentication"],
      }),
      failedScenario({
        id: "auth-2",
        sourceFile: "src/auth/login.story.test.ts",
        titlePath: ["Authentication"],
      }),
      skippedScenario({
        id: "auth-3",
        sourceFile: "src/auth/login.story.test.ts",
        titlePath: ["Authentication"],
      }),
      scenarioWithDocs({
        id: "calc-1",
        sourceFile: "src/calc/add.story.test.ts",
        titlePath: ["Calculator"],
      }),
      passedScenario({
        id: "ck-1",
        sourceFile: "src/checkout/cart.story.test.ts",
        titlePath: ["Checkout"],
        story: {
          ...passedScenario().story,
          scenario: "Cart total includes tax",
          tags: ["checkout", "smoke"],
        },
        tags: ["checkout", "smoke"],
      }),
      failedScenario({
        id: "ck-2",
        sourceFile: "src/checkout/cart.story.test.ts",
        titlePath: ["Checkout"],
        story: {
          ...failedScenario().story,
          scenario: "Stripe rejects expired card",
          tags: ["checkout", "billing"],
        },
        tags: ["checkout", "billing"],
        errorMessage: "Expected payment to succeed, got: card_expired",
      }),
    ];
    const run = createFixtureRun(cases);
    return buildBody({ run }, buildBodyDeps);
  },
};

export const AllPassing: StoryObj = {
  render: () => {
    const cases = [
      passedScenario({ id: "p1" }),
      passedScenario({
        id: "p2",
        story: { ...passedScenario().story, scenario: "Logout clears session" },
      }),
      passedScenario({
        id: "p3",
        story: {
          ...passedScenario().story,
          scenario: "Session refresh extends expiry",
        },
      }),
    ];
    return buildBody({ run: createFixtureRun(cases) }, buildBodyDeps);
  },
};

export const HeavyFailures: StoryObj = {
  render: () => {
    const cases = Array.from({ length: 6 }, (_, i) =>
      failedScenario({
        id: `fail-${i}`,
        story: {
          ...failedScenario().story,
          scenario: [
            "Login fails for locked account",
            "Checkout fails when cart is empty",
            "API returns 500 for malformed payload",
            "Webhook signature mismatch is rejected",
            "Rate limit kicks in after 100 requests",
            "Stale session is rejected",
          ][i],
        },
      }),
    );
    return buildBody({ run: createFixtureRun(cases) }, buildBodyDeps);
  },
};
