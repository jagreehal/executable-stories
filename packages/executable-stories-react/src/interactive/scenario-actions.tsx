"use client";

import { createContext, useContext } from "react";
import type { ReportScenario } from "executable-stories-core";
// Deep import, NOT the package barrel: core's index pulls in Node-only modules
// (attachment resolution reads the filesystem), which a browser bundler cannot
// resolve. Types erase at compile time, so the type-only import above is safe;
// this one is a value and must stay on the fs-free subpath.
import { scenarioToMarkdown as coreScenarioToMarkdown } from "executable-stories-core/utils/scenario-markdown";

export interface ScenarioActions {
  copyLink: (scenario: ReportScenario) => void;
  copyMarkdown: (scenario: ReportScenario) => void;
  copyPrompt: (scenario: ReportScenario) => void;
}

/**
 * Provided only inside <ReportInteractive>. When null (static render), scenarios
 * show no per-scenario action buttons.
 */
const ScenarioActionsContext = createContext<ScenarioActions | null>(null);
export const ScenarioActionsProvider = ScenarioActionsContext.Provider;
export function useScenarioActions(): ScenarioActions | null {
  return useContext(ScenarioActionsContext);
}

/**
 * A scenario rendered as Markdown — for pasting into PRs / issues / docs.
 *
 * Delegates to the shared serializer in core (`variant: "compact"`), the same
 * one behind the Astro site's `<slug>.md` twin endpoints, so what you copy here
 * and what an agent fetches there can never drift.
 */
export function scenarioToMarkdown(scenario: ReportScenario): string {
  return coreScenarioToMarkdown(scenario, { variant: "compact" });
}

/**
 * A failed scenario rendered as an investigation prompt for an AI agent — the
 * "cheap to verify" loop: hand the agent the failing behaviour + error verbatim.
 */
export function scenarioToPrompt(scenario: ReportScenario): string {
  const lines: string[] = [
    `A test scenario is ${scenario.status}. Investigate the likely cause and propose a fix.`,
    "",
    `Scenario: ${scenario.title}`,
    "Steps:",
  ];
  for (const step of scenario.steps) {
    const mark = step.status === "failed" ? " ⟵ failed here" : "";
    lines.push(`  ${step.keyword} ${step.text}${mark}`);
  }
  if (scenario.errorMessage) {
    lines.push("", "Error:", scenario.errorMessage.trim());
  }
  if (scenario.errorStack) {
    lines.push("", "Stack:", scenario.errorStack.trim());
  }
  return lines.join("\n");
}

/** Absolute permalink to a scenario in the current document. */
export function scenarioPermalink(scenario: ReportScenario): string {
  if (typeof location === "undefined") return `#${scenario.id}`;
  return `${location.href.split("#")[0]}#${scenario.id}`;
}
