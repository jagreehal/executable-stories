import type { TestRunResult } from "executable-stories-core/types/test-result";
import {
  type DeploymentEntry,
  type DeploymentLedger,
  createEmptyLedger,
  getLatestDeployment,
  loadLedger,
  saveLedger,
} from "./ledger";

export interface RecordDeploymentArgs {
  run: TestRunResult;
  environment: string;
  tag?: string;
  ledgerPath: string;
  runFilePath: string;
}

export interface RecordDeploymentResult {
  entry: DeploymentEntry;
  ledgerPath: string;
}

export function recordDeployment(args: RecordDeploymentArgs): RecordDeploymentResult {
  const ledger = loadLedger(args.ledgerPath);

  const previous = getLatestDeployment(ledger, args.environment);

  const entry: DeploymentEntry = {
    environment: args.environment,
    tag: args.tag,
    sha: args.run.gitSha,
    runFile: args.runFilePath,
    scenarioIds: args.run.testCases.map((tc) => tc.id),
    scenarioStatuses: Object.fromEntries(args.run.testCases.map((tc) => [tc.id, tc.status])),
    timestamp: new Date(args.run.finishedAtMs).toISOString(),
    summary: countStatuses(args.run),
  };

  ledger.deployments.push(entry);

  if (previous) {
    const previousIds = new Set(previous.scenarioIds);
    const added = entry.scenarioIds.filter((id) => !previousIds.has(id)).length;
    const removed = previous.scenarioIds.filter((id) => !entry.scenarioIds.includes(id)).length;
    if (added > 0 || removed > 0) {
      // Log drift info but don't block — informative only
    }
  }

  saveLedger(ledger, args.ledgerPath);

  return { entry, ledgerPath: args.ledgerPath };
}

export interface DeploymentStatus {
  environments: Record<
    string,
    {
      latest: DeploymentEntry;
      previousDeployment?: DeploymentEntry;
    }
  >;
  ledgerPath: string;
}

export function getDeploymentStatus(ledgerPath: string): DeploymentStatus {
  const ledger = loadLedger(ledgerPath);
  const environments: DeploymentStatus["environments"] = {};

  for (const entry of ledger.deployments) {
    environments[entry.environment] = {
      latest: entry,
      previousDeployment: environments[entry.environment]?.latest,
    };
  }

  return { environments, ledgerPath };
}

export interface EnvironmentDrift {
  environmentA: string;
  environmentB: string;
  onlyInA: string[];
  onlyInB: string[];
  inBoth: string[];
  statusChanged: Array<{
    id: string;
    statusA: string;
    statusB: string;
  }>;
  aEntry: DeploymentEntry;
  bEntry: DeploymentEntry;
}

export function getEnvironmentDrift(
  ledgerPath: string,
  envA: string,
  envB: string,
): EnvironmentDrift {
  const ledger = loadLedger(ledgerPath);
  const aEntry = getLatestDeployment(ledger, envA);
  const bEntry = getLatestDeployment(ledger, envB);

  if (!aEntry) {
    throw new Error(`No deployment found for environment "${envA}"`);
  }
  if (!bEntry) {
    throw new Error(`No deployment found for environment "${envB}"`);
  }

  const aIds = new Set(aEntry.scenarioIds);
  const bIds = new Set(bEntry.scenarioIds);

  const onlyInA = aEntry.scenarioIds.filter((id) => !bIds.has(id));
  const onlyInB = bEntry.scenarioIds.filter((id) => !aIds.has(id));
  const inBoth = aEntry.scenarioIds.filter((id) => bIds.has(id));
  const statusChanged = inBoth
    .map((id) => ({
      id,
      statusA: aEntry.scenarioStatuses?.[id] ?? "unknown",
      statusB: bEntry.scenarioStatuses?.[id] ?? "unknown",
    }))
    .filter((item) => item.statusA !== item.statusB);

  return { environmentA: envA, environmentB: envB, onlyInA, onlyInB, inBoth, statusChanged, aEntry, bEntry };
}

function countStatuses(run: TestRunResult): DeploymentEntry["summary"] {
  const summary = { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 };
  for (const tc of run.testCases) {
    summary.total++;
    if (tc.status in summary) {
      summary[tc.status as keyof typeof summary]++;
    }
  }
  return summary;
}
