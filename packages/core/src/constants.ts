import type { StepKeyword } from "./types.js";

export const STEP_KEYWORDS = ["Given", "When", "Then", "And", "But"] as const;

export const KEYWORD_ALIASES = {
  arrange: "Given",
  act: "When",
  assert: "Then",
  setup: "Given",
  context: "Given",
  execute: "When",
  action: "When",
  verify: "Then",
  check: "Then",
} as const satisfies Record<string, StepKeyword>;

export type KeywordAlias = keyof typeof KEYWORD_ALIASES;
