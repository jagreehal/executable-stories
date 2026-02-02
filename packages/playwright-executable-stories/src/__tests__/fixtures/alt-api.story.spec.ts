/**
 * Fixture to exercise alternate APIs: doc.story(), steps/step objects,
 * top-level step functions, and repeated keyword handling.
 */
import { story, given, when, then, steps as bddSteps, step, arrange, doc } from "../../../dist/index.js";
import { expect } from "@playwright/test";

doc.story("Alt API story", (steps) => {
  steps.given("first precondition", async () => {});
  step.given("second precondition", async () => {});
  arrange("third precondition", async () => {});

  steps.when("user acts", async () => {});
  bddSteps.when("user confirms", async () => {});
  when("action completes", async () => {});

  steps.then("result appears", async () => {});
  step.then("result is persisted", async () => {});
  then("result is verified", async () => {
    expect(true).toBe(true);
  });
});

story("Alt API story without steps param", () => {
  given("standalone precondition", async () => {});
  then("standalone verification", async () => {
    expect(true).toBe(true);
  });
});

story("Optional step callback story", () => {
  given("precondition with no impl");
  arrange("arrange-only step");
  when("action with no impl");
  then("outcome with no impl", async () => {
    expect(true).toBe(true);
  });
});
