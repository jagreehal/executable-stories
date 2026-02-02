import { expect, test } from "@jest/globals";
import { story, given, when, then, doc } from "../../../bdd.js";

story("User logs in", () => {
  given("user is on login page", async () => {});

  when("user submits valid credentials", async () => {});

  then("user sees the dashboard", async () => {
    expect(true).toBe(true);
  });
});

// Framework-native: test('xxx', () => { doc.story('xxx'); ... }) same as story('xxx', () => { ... })
test("User logs in (framework native)", () => {
  (doc.story as unknown as (title: string) => void)("User logs in (framework native)");
  expect(true).toBe(true);
});

story("User sees error on invalid login", () => {
  given("user is on login page", () => {});
  when("user submits invalid credentials", () => {});
  then("user sees an error message", () => {
    expect(true).toBe(true);
  });
});
