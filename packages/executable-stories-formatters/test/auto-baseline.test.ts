import { describe, expect, it } from "vitest";

import { pickAutoBaseline } from "../src/compare";
import { stubs } from "./stubs";

describe("pickAutoBaseline", () => {
  it("prefers same-branch and different-commit candidates over newer unrelated ones", () => {
    const current = stubs.testRunResult({
      startedAtMs: 5000,
      gitSha: "cur1234",
      ci: { name: "github", branch: "feature/review", commitSha: "cur1234" },
    });

    const picked = pickAutoBaseline(current, [
      {
        file: "newer-other.json",
        run: stubs.testRunResult({
          startedAtMs: 6000,
          gitSha: "zzz9999",
          ci: { name: "github", branch: "main", commitSha: "zzz9999" },
        }),
      },
      {
        file: "older-same-branch.json",
        run: stubs.testRunResult({
          startedAtMs: 4000,
          gitSha: "old1111",
          ci: { name: "github", branch: "feature/review", commitSha: "old1111" },
        }),
      },
      {
        file: "older-same-commit.json",
        run: stubs.testRunResult({
          startedAtMs: 4500,
          gitSha: "cur1234",
          ci: { name: "github", branch: "feature/review", commitSha: "cur1234" },
        }),
      },
    ]);

    expect(picked?.file).toBe("older-same-branch.json");
  });
});
