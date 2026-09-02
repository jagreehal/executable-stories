import { describe, it, expect } from "vitest";
import { failuresToPrompt } from "../src/interactive/scenario-actions";
import { failedScenarios } from "../src/interactive/filter";
import { mixedReport, passingReport } from "./fixtures/sample-report";

describe("failuresToPrompt", () => {
  it("is empty when nothing failed, so the report offers no empty handoff", () => {
    expect(failuresToPrompt(failedScenarios(passingReport))).toBe("");
  });

  it("names the count up front so the agent knows the size of the job", () => {
    const prompt = failuresToPrompt(failedScenarios(mixedReport));
    expect(prompt.split("\n")[0]).toContain("1 test scenario");
  });

  it("carries each failing scenario's steps and error verbatim", () => {
    const prompt = failuresToPrompt(failedScenarios(mixedReport));
    expect(prompt).toContain("Delete");
    expect(prompt).toContain("When the user deletes the todo");
    expect(prompt).toContain("Expected list to be empty after deletion");
  });

  it("keeps every failure in one paste, numbered", () => {
    const two = [...failedScenarios(mixedReport), ...failedScenarios(mixedReport)];
    const prompt = failuresToPrompt(two);
    expect(prompt.split("\n")[0]).toContain("2 test scenarios");
    expect(prompt).toContain("1. Delete");
    expect(prompt).toContain("2. Delete");
  });
});
