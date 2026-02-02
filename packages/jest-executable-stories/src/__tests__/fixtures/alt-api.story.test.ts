/**
 * Fixture to exercise alternate APIs: doc.story(), steps/step objects,
 * top-level step functions, and repeated keyword handling.
 */
import { story, given, when, then, steps as bddSteps, step, arrange, doc } from "../../index.js";
import { expect } from "vitest";

doc.story("Alt API story", (steps) => {
  steps.given("first precondition", () => {});
  step.given("second precondition", () => {});
  arrange("third precondition", () => {});

  steps.when("user acts", () => {});
  bddSteps.when("user confirms", () => {});
  when("action completes", () => {});

  steps.then("result appears", () => {});
  step.then("result is persisted", () => {});
  then("result is verified", () => {
    expect(true).toBe(true);
  });
});

story("Alt API story without steps param", () => {
  given("standalone precondition", () => {});
  then("standalone verification", () => {
    expect(true).toBe(true);
  });
});

story("Optional step callback story", () => {
  given("precondition with no impl");
  arrange("arrange-only step");
  when("action with no impl");
  then("outcome with no impl", () => {
    expect(true).toBe(true);
  });
});
