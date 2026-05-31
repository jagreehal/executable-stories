import { toScenarioIndex, type ScenarioIndex, type ScenarioIndexItem } from "./scenario-index-json";
import type { StoryReport } from "../types/story-report";
import type { TestRunResult } from "../types/test-result";
import { toStoryReport } from "../converters/story-report";

export interface BehaviorManifest {
  schemaVersion: "1.0";
  runId: string;
  generatedAtMs: number;
  summary: ScenarioIndex["summary"];
  sourceFiles: BehaviorSourceFile[];
  tags: BehaviorTag[];
  docCoverage: {
    scenariosWithDocs: number;
    scenariosWithoutDocs: number;
    docKinds: string[];
  };
  debugger: BehaviorDebuggerIssue[];
}

export interface BehaviorSourceFile {
  path: string;
  scenarioCount: number;
  failed: number;
  tags: string[];
}

export interface BehaviorTag {
  name: string;
  scenarioCount: number;
}

export interface BehaviorDebuggerIssue {
  severity: "warning";
  code: "missing-docs" | "missing-tags" | "missing-covers" | "missing-source-line";
  scenarioId: string;
  title: string;
  message: string;
}

export interface BehaviorManifestJsonOptions {
  pretty?: boolean;
}

export class BehaviorManifestJsonFormatter {
  private pretty: boolean;

  constructor(options: BehaviorManifestJsonOptions = {}) {
    this.pretty = options.pretty ?? true;
  }

  toManifest(run: TestRunResult): BehaviorManifest {
    return toBehaviorManifest(toStoryReport(run));
  }

  format(run: TestRunResult): string {
    const manifest = this.toManifest(run);
    return this.pretty ? JSON.stringify(manifest, null, 2) : JSON.stringify(manifest);
  }
}

export function toBehaviorManifest(report: StoryReport): BehaviorManifest {
  const index = toScenarioIndex(report);
  const bySource = new Map<string, BehaviorSourceFile>();
  const byTag = new Map<string, BehaviorTag>();
  const docKinds = new Set<string>();
  const debuggerIssues: BehaviorDebuggerIssue[] = [];

  for (const scenario of index.scenarios) {
    const source = bySource.get(scenario.sourceFile) ?? {
      path: scenario.sourceFile,
      scenarioCount: 0,
      failed: 0,
      tags: [],
    };
    source.scenarioCount += 1;
    if (scenario.status === "failed") source.failed += 1;
    source.tags = [...new Set([...source.tags, ...scenario.tags])].sort();
    bySource.set(scenario.sourceFile, source);

    for (const tag of scenario.tags) {
      const tagEntry = byTag.get(tag) ?? { name: tag, scenarioCount: 0 };
      tagEntry.scenarioCount += 1;
      byTag.set(tag, tagEntry);
    }

    for (const kind of scenario.docKinds) docKinds.add(kind);
    for (const step of scenario.steps) {
      for (const kind of step.docKinds) docKinds.add(kind);
    }

    if (!scenarioHasDocs(scenario)) {
      debuggerIssues.push({
        severity: "warning",
        code: "missing-docs",
        scenarioId: scenario.id,
        title: scenario.title,
        message: "Scenario has no doc entries.",
      });
    }
    if (scenario.tags.length === 0) {
      debuggerIssues.push({
        severity: "warning",
        code: "missing-tags",
        scenarioId: scenario.id,
        title: scenario.title,
        message: "Scenario has no tags.",
      });
    }
    if (scenario.covers.length === 0) {
      debuggerIssues.push({
        severity: "warning",
        code: "missing-covers",
        scenarioId: scenario.id,
        title: scenario.title,
        message: "Scenario declares no covers (product-code paths), so code→scenario lookup cannot find it.",
      });
    }
    if (scenario.sourceLine === undefined) {
      debuggerIssues.push({
        severity: "warning",
        code: "missing-source-line",
        scenarioId: scenario.id,
        title: scenario.title,
        message: "Scenario has no source line.",
      });
    }
  }

  const scenariosWithDocs = index.scenarios.filter(scenarioHasDocs).length;

  return {
    schemaVersion: "1.0",
    runId: report.runId,
    generatedAtMs: report.finishedAtMs,
    summary: index.summary,
    sourceFiles: [...bySource.values()].sort((a, b) => a.path.localeCompare(b.path)),
    tags: [...byTag.values()].sort((a, b) => a.name.localeCompare(b.name)),
    docCoverage: {
      scenariosWithDocs,
      scenariosWithoutDocs: index.scenarios.length - scenariosWithDocs,
      docKinds: [...docKinds].sort(),
    },
    debugger: debuggerIssues,
  };
}

function scenarioHasDocs(scenario: ScenarioIndexItem): boolean {
  return (
    scenario.docKinds.length > 0 ||
    scenario.steps.some((step) => step.docKinds.length > 0)
  );
}
