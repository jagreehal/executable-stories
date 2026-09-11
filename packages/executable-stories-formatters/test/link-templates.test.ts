/**
 * Top-level link templates (`ticketUrlTemplate`, `permalinkBaseUrl`,
 * `traceUrlTemplate`) are the default for every format that renders a link, so
 * a project says where its tickets live once instead of once per format. A
 * per-format option of the same name still wins, which is what lets one output
 * point somewhere else without unsettling the rest.
 */
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import type { Logger, WriteFile } from "../src/types/options";
import { ReportGenerator, canonicalizeRun, type GenerateDeps } from "../src/index";

function createMockDeps(): GenerateDeps {
  return {
    logger: mock<Logger>(),
    writeFile: vi.fn().mockResolvedValue(undefined) as WriteFile,
    readFile: (filePath: string) => {
      throw new Error(`ENOENT: ${filePath}`);
    },
    listDir: () => undefined,
  };
}

function written(deps: GenerateDeps, filePath: string): string {
  const call = (deps.writeFile as ReturnType<typeof vi.fn>).mock.calls.find(
    (c) => c[0] === filePath,
  );
  if (!call) throw new Error(`writeFile was not called with ${filePath}`);
  return call[1] as string;
}

const RAW_RUN = {
  schemaVersion: 1,
  projectRoot: "/repo",
  startedAtMs: 1_700_000_000_000,
  finishedAtMs: 1_700_000_001_000,
  testCases: [
    {
      title: "Payment captured",
      sourceFile: "src/pay.story.test.ts",
      sourceLine: 12,
      status: "pass",
      story: {
        scenario: "Payment captured",
        steps: [{ keyword: "then", text: "the payment is captured", assertions: 1 }],
        tickets: [{ id: "PAY-1042" }],
      },
    },
  ],
};

async function markdownFrom(options: Record<string, unknown>): Promise<string> {
  const deps = createMockDeps();
  const generator = new ReportGenerator(
    { formats: ["markdown"], outputDir: "reports", outputName: "index", ...options },
    deps,
  );
  await generator.generate(canonicalizeRun(RAW_RUN as never));
  return written(deps, "reports/index.md");
}

describe("top-level link templates", () => {
  it("gives markdown its ticket links", async () => {
    const md = await markdownFrom({
      ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
    });
    expect(md).toContain("[PAY-1042](https://jira.example.com/browse/PAY-1042)");
  });

  it("gives markdown its source permalinks", async () => {
    const md = await markdownFrom({
      permalinkBaseUrl: "https://github.com/org/repo/blob/main",
    });
    expect(md).toContain("https://github.com/org/repo/blob/main/src/pay.story.test.ts#L12");
  });

  it("yields to a per-format template", async () => {
    const md = await markdownFrom({
      ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
      markdown: { ticketUrlTemplate: "https://linear.app/team/issue/{ticket}" },
    });
    expect(md).toContain("[PAY-1042](https://linear.app/team/issue/PAY-1042)");
    expect(md).not.toContain("jira.example.com");
  });

  it("leaves a ticket as plain text when nothing sets a template", async () => {
    const md = await markdownFrom({});
    expect(md).toContain("`PAY-1042`");
    expect(md).not.toContain("](http");
  });
});
