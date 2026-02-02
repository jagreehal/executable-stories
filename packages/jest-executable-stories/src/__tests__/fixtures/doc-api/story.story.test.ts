/**
 * Fixture test for doc API. Run via vitest --config=src/__tests__/fixtures/doc-api/vitest.config.mts
 */
import { story, given, when, then, doc } from "../../../index.js";
import { expect } from "vitest";

story("Doc API test", () => {
  given("a precondition with static docs", () => {});
  doc.note("This is a static note");
  doc.kv("Test user", "admin@example.com");

  when("action with runtime and static docs", async () => {
    doc.code("Request payload", { action: "login", user: "test" });
    doc.runtime.kv("Captured value", "captured-at-runtime");
  });

  when.skip("skipped step with static doc");
  doc.note("This note appears even though the step is skipped");

  then("verification with table and link", () => {
    doc.table("Test Matrix", ["Browser", "Status"], [
      ["Chrome", "Pass"],
      ["Firefox", "Pass"],
    ]);
    doc.link("Documentation", "https://example.com/docs");
    expect(true).toBe(true);
  });
});
