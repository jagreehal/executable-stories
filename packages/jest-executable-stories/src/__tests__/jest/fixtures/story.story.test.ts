import { expect } from "@jest/globals";
import { scenario } from "../../../bdd.js";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", async () => {});

  when("user submits valid credentials", async () => {});

  then("user sees the dashboard", async () => {
    expect(true).toBe(true);
  });
});

scenario("User sees error on invalid login", ({ given, when, then }) => {
  given("user is on login page", () => {});
  when("user submits invalid credentials", () => {});
  then("user sees an error message", () => {
    expect(true).toBe(true);
  });
});
