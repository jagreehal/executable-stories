import * as fs from "node:fs";
import * as path from "node:path";

export interface DeploymentEntry {
  environment: string;
  tag?: string;
  sha?: string;
  runFile: string;
  scenarioIds: string[];
  scenarioStatuses?: Record<string, string>;
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
  };
}

export interface DeploymentLedger {
  deployments: DeploymentEntry[];
  schemaVersion: 1;
}

export function createEmptyLedger(): DeploymentLedger {
  return {
    deployments: [],
    schemaVersion: 1,
  };
}

export function loadLedger(ledgerPath: string): DeploymentLedger {
  const resolved = path.resolve(ledgerPath);
  if (!fs.existsSync(resolved)) {
    return createEmptyLedger();
  }
  try {
    const raw = JSON.parse(fs.readFileSync(resolved, "utf8"));
    if (raw.schemaVersion !== 1) {
      throw new Error(`Unsupported ledger schemaVersion: ${raw.schemaVersion}`);
    }
    return raw as DeploymentLedger;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load deployment ledger at ${resolved}: ${msg}`, { cause: err });
  }
}

export function saveLedger(ledger: DeploymentLedger, ledgerPath: string): void {
  const resolved = path.resolve(ledgerPath);
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(ledger, null, 2), "utf8");
}

export function getLatestDeployment(
  ledger: DeploymentLedger,
  environment: string,
): DeploymentEntry | undefined {
  return [...ledger.deployments]
    .reverse()
    .find((d) => d.environment === environment);
}
