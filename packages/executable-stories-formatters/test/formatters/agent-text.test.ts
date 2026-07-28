import { describe, expect, it } from "vitest";

import { AgentTextFormatter } from "../../src/index";
import { stubs } from "../stubs";

function run() {
  return stubs.testRunResult({
    testCases: [
      stubs.testCaseResult({
        id: "a",
        status: "passed",
        sourceFile: "src/basket.test.ts",
        story: stubs.storyMeta({
          feature: "Basket",
          scenario: "Adds an item",
          tags: ["basket", "smoke"],
          tickets: [{ id: "US-1", url: "https://tracker/US-1" }],
          suitePath: [],
          steps: [
            { keyword: "Given", text: "an empty basket" },
            {
              keyword: "When",
              text: "a widget is added",
              docs: [
                { kind: "kv", phase: "runtime", label: "Price", value: 9.99 },
                { kind: "state", phase: "runtime", label: "Basket", value: { items: 1 } },
              ],
            },
            { keyword: "Then", text: "the basket has one item" },
          ],
          docs: [
            { kind: "note", phase: "static", text: "Prices include VAT." },
            {
              kind: "table",
              phase: "static",
              label: "Limits",
              columns: ["Field", "Max"],
              rows: [["items", "50"]],
            },
          ],
        }),
      }),
      stubs.testCaseResult({
        id: "b",
        status: "failed",
        sourceFile: "src/basket.test.ts",
        errorMessage: "expected 2 to be 1",
        story: stubs.storyMeta({
          feature: "Basket",
          scenario: "Rejects a 51st item",
          tags: [],
          tickets: [],
          suitePath: [],
          steps: [{ keyword: "Then", text: "the add is rejected" }],
        }),
      }),
    ],
  });
}

describe("AgentTextFormatter", () => {
  it("renders the whole run as flat text: header, features, steps, docs, errors", () => {
    const text = new AgentTextFormatter().format(run());

    // Self-describing header with counts.
    expect(text).toContain("Test run: 2 scenarios (1 passed, 1 failed).");
    // Feature line carries the source file.
    expect(text).toContain("feature basket · src/basket.test.ts");
    // Scenario line: status word, title, tags; tickets on their own line.
    expect(text).toContain("PASS Adds an item [basket smoke]");
    expect(text).toContain("  ticket US-1 https://tracker/US-1");
    // Steps keep keywords; step docs are indented beneath their step.
    expect(text).toContain("  When a widget is added\n    Price: 9.99\n    state Basket: {\"items\":1}");
    // Scenario-level docs render compactly.
    expect(text).toContain("  Prices include VAT.");
    expect(text).toContain("  table Limits: Field | Max\n    items | 50");
    // Failures surface the error message.
    expect(text).toContain("FAIL Rejects a 51st item");
    expect(text).toContain("  error: expected 2 to be 1");
    // Token diet: no ids, hashes, or durations.
    expect(text).not.toMatch(/durationMs|hash|"id"/);
  });
});
