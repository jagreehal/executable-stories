import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  getBehaviorDiff,
  getScenario,
  getScenariosForPaths,
  listScenarios,
  loadStoryReport,
  readOnlyTools,
  resolveFocusedRunFramework,
  resolveReportPath,
  runFocusedScenario,
} from "./index.js";

const reportPathSchema = {
  reportPath: z
    .string()
    .optional()
    .describe("Path to StoryReport JSON. Defaults to reports/index.story-report.json."),
};

const filterSchema = {
  ...reportPathSchema,
  statuses: z
    .array(z.enum(["passed", "failed", "skipped", "pending"]))
    .optional()
    .describe("Filter by scenario status (any match)."),
  tags: z.array(z.string()).optional().describe("Filter by tag (any match)."),
  sourceFiles: z
    .array(z.string())
    .optional()
    .describe("Filter by source file substring/glob (any match)."),
};

const frameworkSchema = z
  .enum(["vitest", "jest", "playwright", "cypress"])
  .optional()
  .describe("Host test framework. Inferred from source file when possible.");

const server = new McpServer({
  name: "executable-stories",
  version: "0.2.0",
});

for (const tool of readOnlyTools) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: reportPathSchema,
    },
    async ({ reportPath }) =>
      json(tool.run(loadStoryReport(resolveReportPath(reportPath)))),
  );
}

server.registerTool(
  "list_scenarios",
  {
    title: "List scenarios",
    description: "List executable story scenarios, optionally filtered by status, tag, or source file.",
    inputSchema: filterSchema,
  },
  async ({ reportPath, statuses, tags, sourceFiles }) =>
    json(
      listScenarios(loadStoryReport(resolveReportPath(reportPath)), {
        statuses,
        tags,
        sourceFiles,
      }),
    ),
);

server.registerTool(
  "get_scenarios_for_paths",
  {
    title: "Get scenarios for paths",
    description:
      "Find scenarios whose declared `covers` globs match the given product-code paths (e.g. a changed-file list).",
    inputSchema: {
      ...reportPathSchema,
      paths: z.array(z.string()).min(1).describe("Product-code paths or globs to look up."),
    },
  },
  async ({ reportPath, paths }) =>
    json(getScenariosForPaths(loadStoryReport(resolveReportPath(reportPath)), paths)),
);

server.registerTool(
  "get_behavior_diff",
  {
    title: "Get behavior diff",
    description:
      "Compare two StoryReports by scenario id: regressed, fixed, added, removed, changed, unchanged.",
    inputSchema: {
      baselineReportPath: z.string().describe("Path to the baseline StoryReport JSON."),
      currentReportPath: z
        .string()
        .optional()
        .describe("Path to the current StoryReport JSON. Defaults to the standard report path."),
    },
  },
  async ({ baselineReportPath, currentReportPath }) =>
    json(
      getBehaviorDiff(
        loadStoryReport(resolveReportPath(baselineReportPath)),
        loadStoryReport(resolveReportPath(currentReportPath)),
      ),
    ),
);

server.registerTool(
  "get_scenario",
  {
    title: "Get scenario",
    description: "Get one scenario by StoryReport scenario id or exact title.",
    inputSchema: {
      ...reportPathSchema,
      idOrTitle: z.string().describe("Scenario id or exact scenario title."),
    },
  },
  async ({ reportPath, idOrTitle }) => {
    const report = loadStoryReport(resolveReportPath(reportPath));
    const lookup = getScenario(report, idOrTitle);
    if (!lookup) {
      return json({ error: `Scenario not found: ${idOrTitle}` });
    }
    return json(lookup);
  },
);

server.registerTool(
  "run_scenario",
  {
    title: "Run scenario",
    description:
      "Run one scenario through the host test framework (vitest, jest, playwright, or cypress). Executes real tests.",
    inputSchema: {
      ...reportPathSchema,
      idOrTitle: z.string().describe("Scenario id or exact scenario title."),
      framework: frameworkSchema,
      cwd: z
        .string()
        .optional()
        .describe("Working directory for the test command. Defaults to process.cwd()."),
    },
  },
  async ({ reportPath, idOrTitle, framework, cwd }) => {
    const report = loadStoryReport(resolveReportPath(reportPath));
    const lookup = getScenario(report, idOrTitle);
    if (!lookup) {
      return json({ error: `Scenario not found: ${idOrTitle}` });
    }

    const sourceFile = lookup.feature.sourceFile;
    const resolvedFramework = resolveFocusedRunFramework({ sourceFile, framework });
    const result = await runFocusedScenario({
      framework: resolvedFramework,
      sourceFile,
      scenarioTitle: lookup.scenario.title,
      cwd: cwd ?? process.cwd(),
    });

    return json({
      scenario: {
        id: lookup.scenario.id,
        title: lookup.scenario.title,
        sourceFile,
      },
      framework: resolvedFramework,
      ...result,
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

function json(value: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}
