"use client";

import { createContext, useContext } from "react";
import type { ReportScenario } from "executable-stories-core";

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

/** A scenario rendered as Markdown — for pasting into PRs / issues / docs. */
export function scenarioToMarkdown(scenario: ReportScenario): string {
  const lines: string[] = [`## ${scenario.title} _(${scenario.status})_`, ""];
  for (const step of scenario.steps) {
    lines.push(`- **${step.keyword}** ${step.text}`);
  }
  if (scenario.errorMessage) {
    lines.push("", "```", scenario.errorMessage.trim(), "```");
  }
  return lines.join("\n");
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
