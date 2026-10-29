/**
 * Runs real `bun test` processes over generated fixture projects and reads the
 * raw run they leave behind.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { RawRunFile } from "../collector";
import { mergeRuns } from "../collector";

const src = path.resolve(import.meta.dir, "..");

const storyFile = `import { expect } from "bun:test";
import { describe, story, test } from ${JSON.stringify(path.join(src, "index.ts"))};

describe("Checkout", () => {
  test("pays by card", () => {
    story.init({ tags: ["payments"], ticket: "PAY-1", covers: ["src/pay.ts"] });
    story.given("a basket with one item");
    story.when("the customer pays");
    story.then("the order is placed");
    expect(1 + 1).toBe(2);
  });

  test("rejects an expired card", () => {
    story.init();
    story.given("an expired card");
    story.then("the payment is declined");
    expect("accepted").toBe("declined");
  });

  test.skip("pays by voucher", () => {});
  test.todo("pays in instalments");
});

test("breaks before declaring a story", () => {
  throw new Error("setup failed");
});
`;

/** The raw run, plus what bun printed to stderr (where it reports failures). */
function runBun(files: Record<string, string>, args: string[] = []): RawRunFile & { stderr: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-bun-"));
  fs.writeFileSync(
    path.join(dir, "bunfig.toml"),
    `[test]\npreload = [${JSON.stringify(path.join(src, "preload.ts"))}]\n`,
  );
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  const proc = Bun.spawnSync(["bun", "test", ...args], {
    cwd: dir,
    // CI=true as on a CI runner, where bun turns any access to `.only` into an error.
    env: { ...process.env, CI: "true", GITHUB_SHA: "abc123", EXECUTABLE_STORIES_OUTPUT: undefined },
    stdout: "ignore",
    stderr: "pipe",
  });
  const run = JSON.parse(fs.readFileSync(path.join(dir, ".executable-stories/raw-run.json"), "utf8")) as RawRunFile;
  return Object.assign(run, { stderr: proc.stderr.toString() });
}

describe("raw run written by the preload", () => {
  const run = runBun({ "checkout.test.ts": storyFile });
  const byTitle = (title: string) => run.testCases.find((t) => t.title === title);

  test("records status for pass, fail, skip and todo", () => {
    expect(byTitle("pays by card")?.status).toBe("pass");
    expect(byTitle("rejects an expired card")?.status).toBe("fail");
    expect(byTitle("pays by voucher")?.status).toBe("skip");
    expect(byTitle("pays in instalments")?.status).toBe("todo");
  });

  test("carries the story, suite path, file and line", () => {
    const tc = byTitle("pays by card");
    expect(tc?.titlePath).toEqual(["Checkout", "pays by card"]);
    expect(tc?.sourceFile).toBe("checkout.test.ts");
    expect(tc?.sourceLine).toBe(5);
    expect(tc?.story?.tags).toEqual(["payments"]);
    expect(tc?.story?.tickets).toEqual([{ id: "PAY-1" }]);
    expect(tc?.story?.covers).toEqual(["src/pay.ts"]);
    expect(tc?.story?.steps.map((s) => `${s.keyword} ${s.text}`)).toEqual([
      "Given a basket with one item",
      "When the customer pays",
      "Then the order is placed",
    ]);
  });

  test("keeps the error and fails the last step started", () => {
    expect(byTitle("rejects an expired card")?.error?.message).toContain("declined");
    expect(byTitle("rejects an expired card")?.stepEvents?.map((e) => e.status)).toEqual(["pass", "fail"]);
  });

  test("prints the story's steps under the failure, and keeps them out of the report", () => {
    expect(run.stderr).toContain(
      "Story steps:\n  ✓ Given an expired card\n  ✗ Then the payment is declined",
    );
    expect(byTitle("rejects an expired card")?.error?.message).not.toContain("Story steps:");
  });

  test("marks a file incomplete when a test fails before story.init()", () => {
    expect(byTitle("breaks before declaring a story")).toBeUndefined();
    expect(run.incompleteSourceFiles).toEqual(["checkout.test.ts"]);
  });

  test("records run metadata", () => {
    expect(run.schemaVersion).toBe(1);
    expect(run.runScope).toBe("full");
    expect(run.gitSha).toBe("abc123");
    expect(run.coveredSourceFiles).toEqual(["checkout.test.ts"]);
  });
});

test("the trail marks the step that failed", () => {
  const { stderr } = runBun({
    "wrapped.test.ts": `import { story, test } from ${JSON.stringify(path.join(src, "index.ts"))};

test("async body throws", async () => {
  story.init();
  story.given("setup", () => {});
  await story.when("it breaks", async () => { throw new Error("kaput"); });
});

test("fails after a finished step", () => {
  story.init();
  story.given("setup", () => {});
  throw new Error("later");
});

test("a caught throw does not own a later failure", () => {
  story.init();
  try {
    story.given("a rejected input", () => { throw new Error("rejected"); });
  } catch {}
  story.then("the total is 3");
  throw new Error("expected 3");
});

test("nested steps", () => {
  story.init();
  story.when("the order is placed", () => {
    story.and("payment is taken", () => { throw new Error("declined"); });
  });
});
`,
  });
  expect(stderr).toContain("kaput\n\nStory steps:\n  ✓ Given setup\n  ✗ When it breaks");
  expect(stderr).toContain("later\n\nStory steps:\n  ✓ Given setup\n  ✗ (failed after the last step)");
  expect(stderr).toContain("expected 3\n\nStory steps:\n  ✓ Given a rejected input\n  ✗ Then the total is 3");
  expect(stderr).toContain("declined\n\nStory steps:\n  ✓ When the order is placed\n  ✗ And payment is taken");
});

test("a test that bun fails after its body resolves is recorded as a failure", () => {
  const run = runBun({
    "late.test.ts": `import { afterEach, expect, onTestFinished } from "bun:test";
import { describe, story, test } from ${JSON.stringify(path.join(src, "index.ts"))};

expect.extend({ toBeOne: (received: unknown) => ({ pass: received === 1, message: () => "expected 1" }) });

describe("hooked", () => {
  afterEach(() => { throw new Error("cleanup failed"); });
  test("afterEach throws", () => { story.init(); story.given("a body that passes"); });
});

test("too few assertions", () => {
  story.init();
  expect.assertions(2);
  expect(1).toBe(1);
});

test("onTestFinished throws", () => {
  story.init();
  onTestFinished(() => { throw new Error("cleanup failed"); });
});

test("custom matcher", () => {
  story.init();
  expect.assertions(1);
  (expect(1) as unknown as { toBeOne(): void }).toBeOne();
});

test("enough assertions", async () => {
  story.init();
  expect.hasAssertions();
  await expect(Promise.resolve(1)).resolves.toBe(1);
});
`,
  });
  const byTitle = (title: string) => run.testCases.find((t) => t.title === title);
  expect(byTitle("afterEach throws")?.status).toBe("fail");
  expect(byTitle("afterEach throws")?.error?.message).toContain("afterEach");
  expect(byTitle("too few assertions")?.status).toBe("fail");
  expect(byTitle("too few assertions")?.error?.message).toContain("expected 2 assertion(s), but test ended with 1");
  expect(byTitle("onTestFinished throws")?.status).toBe("fail");
  expect(byTitle("custom matcher")?.status).toBe("pass");
  expect(byTitle("enough assertions")?.status).toBe("pass");
});

test("--concurrent still records scenarios", () => {
  const run = runBun({ "checkout.test.ts": storyFile }, ["--concurrent"]);
  expect(run.testCases.find((t) => t.title === "pays by card")?.status).toBe("pass");
  expect(run.testCases.find((t) => t.title === "rejects an expired card")?.status).toBe("fail");
});

test("--concurrent does not claim a pass when an afterEach failed", () => {
  const run = runBun(
    {
      "hooked.test.ts": `import { afterEach } from "bun:test";
import { story, test } from ${JSON.stringify(path.join(src, "index.ts"))};
afterEach(() => { throw new Error("cleanup failed"); });
test("slow", async () => { story.init(); await new Promise((r) => setTimeout(r, 20)); });
test("fast", async () => { story.init(); await new Promise((r) => setTimeout(r, 10)); });
`,
    },
    ["--concurrent"],
  );
  expect(run.testCases.map((t) => t.status)).toEqual(["unknown", "unknown"]);
  expect(run.testCases[0]?.error?.message).toContain("afterEach");
});

test("a retried test keeps only its last attempt, and says which attempt it was", () => {
  const run = runBun({
    "flaky.test.ts": `import { describe, story, test } from ${JSON.stringify(path.join(src, "index.ts"))};
let attempt = 0;
test("passes second time", () => {
  story.init();
  story.given("attempt " + ++attempt);
  if (attempt === 1) throw new Error("first attempt");
}, { retry: 3 });
`,
  });
  const tc = run.testCases.find((t) => t.title === "passes second time");
  expect(tc?.status).toBe("pass");
  expect(tc?.error).toBeUndefined();
  expect(tc?.retry).toBe(1);
  expect(tc?.retries).toBe(3);
  expect(tc?.story?.steps.map((s) => s.text)).toEqual(["attempt 2"]);
  expect(tc?.story?.steps[0]?.id).toBe("step-0");
});

test("a name filter makes the run filtered", () => {
  const run = runBun({ "checkout.test.ts": storyFile }, ["-t", "pays by card"]);
  expect(run.runScope).toBe("filtered");
  expect(run.testCases.find((t) => t.title === "pays by card")?.status).toBe("pass");
  expect(run.testCases.find((t) => t.title === "rejects an expired card")).toBeUndefined();
});

test("mergeRuns replaces a file's cases and keeps the others", () => {
  const base = { schemaVersion: 1 as const, projectRoot: "/p", meta: { adapter: "bun" as const, bunRunId: "1" } };
  const merged = mergeRuns(
    { ...base, runScope: "full", coveredSourceFiles: ["a.test.ts"], testCases: [{ status: "pass", sourceFile: "a.test.ts" }] },
    { ...base, runScope: "filtered", coveredSourceFiles: ["b.test.ts"], testCases: [{ status: "fail", sourceFile: "b.test.ts" }] },
  );
  expect(merged.testCases.map((t) => t.sourceFile)).toEqual(["a.test.ts", "b.test.ts"]);
  expect(merged.coveredSourceFiles).toEqual(["a.test.ts", "b.test.ts"]);
  expect(merged.runScope).toBe("filtered");
});

// Under --isolate each file gets its own preload afterAll.
test("--isolate merges each file's flush into one run", () => {
  const second = storyFile.replaceAll("Checkout", "Refunds");
  const run = runBun({ "checkout.test.ts": storyFile, "refunds.test.ts": second }, ["--isolate"]);
  expect(run.coveredSourceFiles).toEqual(["checkout.test.ts", "refunds.test.ts"]);
  expect(new Set(run.testCases.map((t) => t.sourceFile))).toEqual(new Set(["checkout.test.ts", "refunds.test.ts"]));
});
