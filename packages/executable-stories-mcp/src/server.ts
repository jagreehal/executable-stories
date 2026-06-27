import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  getBehaviorDiff,
  getDeploymentStatus as getDeploymentStatusFn,
  getEnvironmentDrift as getEnvironmentDriftFn,
  getLoopStatus,
  getScenario,
  getScenariosForPaths,
  getTrajectory,
  listScenarios,
  loadStoryReport,
  readOnlyTools,
  resolveReportPath,
  runChanged,
  runScenarioById,
  runScenarios,
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
  .enum(["vitest", "jest", "playwright", "cypress", "go", "pytest", "rust", "dotnet"])
  .optional()
  .describe(
    "Host test framework. Auto-detected from the source file for playwright/cypress/go/pytest; required for vitest/jest/rust/dotnet.",
  );

const runRefreshSchema = {
  cwd: z
    .string()
    .optional()
    .describe("Working directory for the test command. Defaults to process.cwd()."),
  rawRunPath: z
    .string()
    .optional()
    .describe(
      "Path to the raw run JSON the focused run emits, used to refresh the report. Defaults to .executable-stories/raw-run.json.",
    ),
  refreshReport: z
    .boolean()
    .optional()
    .describe("Merge the run result back into the StoryReport (default true)."),
};

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
  "get_trajectory",
  {
    title: "Get trajectory",
    description:
      "Session delta — 'passed N → M since you started'. Folds the current StoryReport into a persisted session baseline and returns the count deltas vs the session start and vs the previous run. Idempotent per run (re-reading the same report does not advance the loop). Use as the observe signal in an agent loop. Set reset to start a fresh session.",
    inputSchema: {
      ...reportPathSchema,
      reset: z
        .boolean()
        .optional()
        .describe("Re-pin the session baseline to the current run (start a fresh loop)."),
    },
  },
  async ({ reportPath, reset }) =>
    json(getTrajectory(loadStoryReport(resolveReportPath(reportPath)), { reset })),
);

server.registerTool(
  "run_scenario",
  {
    title: "Run scenario",
    description:
      "Run one scenario through the host test framework. Executes real tests, then merges the result back into the StoryReport so the observe tools see fresh state.",
    inputSchema: {
      ...reportPathSchema,
      idOrTitle: z.string().describe("Scenario id or exact scenario title."),
      framework: frameworkSchema,
      ...runRefreshSchema,
    },
  },
  async ({ reportPath, idOrTitle, framework, cwd, rawRunPath, refreshReport }) => {
    const resolvedReportPath = resolveReportPath(reportPath);
    const report = loadStoryReport(resolvedReportPath);
    const outcome = await runScenarioById({
      report,
      reportPath: resolvedReportPath,
      idOrTitle,
      framework,
      cwd,
      rawRunPath,
      refreshReport,
    });
    return json(outcome);
  },
);

server.registerTool(
  "run_scenarios",
  {
    title: "Run scenarios",
    description:
      "Run several scenarios by id or title, in sequence, refreshing the report after each. Use to verify a set of behaviours in one call.",
    inputSchema: {
      ...reportPathSchema,
      idsOrTitles: z.array(z.string()).min(1).describe("Scenario ids or exact titles to run."),
      framework: frameworkSchema,
      ...runRefreshSchema,
    },
  },
  async ({ reportPath, idsOrTitles, framework, cwd, rawRunPath, refreshReport }) => {
    const resolvedReportPath = resolveReportPath(reportPath);
    const report = loadStoryReport(resolvedReportPath);
    const outcomes = await runScenarios({
      report,
      reportPath: resolvedReportPath,
      idsOrTitles,
      framework,
      cwd,
      rawRunPath,
      refreshReport,
    });
    return json({ outcomes });
  },
);

server.registerTool(
  "run_changed",
  {
    title: "Run changed",
    description:
      "Code → run: find the scenarios whose declared `covers` globs match the given changed-file paths, then run them. The 'I edited these files, verify the behaviours that cover them' act in an agent loop.",
    inputSchema: {
      ...reportPathSchema,
      paths: z.array(z.string()).min(1).describe("Product-code paths or globs that changed."),
      framework: frameworkSchema,
      ...runRefreshSchema,
    },
  },
  async ({ reportPath, paths, framework, cwd, rawRunPath, refreshReport }) => {
    const resolvedReportPath = resolveReportPath(reportPath);
    const report = loadStoryReport(resolvedReportPath);
    const result = await runChanged({
      report,
      reportPath: resolvedReportPath,
      paths,
      framework,
      cwd,
      rawRunPath,
      refreshReport,
    });
    return json(result);
  },
);

server.registerTool(
  "get_loop_status",
  {
    title: "Get loop status",
    description:
      "The one-read 'am I done?' for an agent loop. Returns the failing scenarios, the regression set (vs an optional baseline), the session trajectory, and a single `done` verdict (nothing failing and nothing regressed).",
    inputSchema: {
      ...reportPathSchema,
      baselineReportPath: z
        .string()
        .optional()
        .describe("Baseline StoryReport to compute regressions against (omit to skip regressions)."),
    },
  },
  async ({ reportPath, baselineReportPath }) =>
    json(
      getLoopStatus(loadStoryReport(resolveReportPath(reportPath)), {
        baseline: baselineReportPath
          ? loadStoryReport(resolveReportPath(baselineReportPath))
          : undefined,
      }),
    ),
);

server.registerTool(
  "get_deployment_status",
  {
    title: "Get deployment status",
    description:
      "Show the latest deployment for each environment from the deployment ledger. Which scenarios are deployed to dev, staging, and production?",
    inputSchema: {
      ledgerPath: z
        .string()
        .optional()
        .describe(
          "Path to the deployment ledger JSON. Defaults to .executable-stories/deployments.json.",
        ),
    },
  },
  async ({ ledgerPath }) => json(getDeploymentStatusFn(ledgerPath)),
);

server.registerTool(
  "get_environment_drift",
  {
    title: "Get environment drift",
    description:
      "Compare two environments to find which scenarios exist in one but not the other. Use this to detect configuration/code drift between dev and prod.",
    inputSchema: {
      envA: z.string().describe("First environment name (e.g. dev)."),
      envB: z.string().describe("Second environment name (e.g. production)."),
      ledgerPath: z
        .string()
        .optional()
        .describe(
          "Path to the deployment ledger JSON. Defaults to .executable-stories/deployments.json.",
        ),
    },
  },
  async ({ envA, envB, ledgerPath }) => json(getEnvironmentDriftFn(envA, envB, ledgerPath)),
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
