import type { TestRunResult } from "../types/test-result";

export interface BaselineCandidate {
  file: string;
  run: TestRunResult;
}

function getCommit(run: TestRunResult): string | undefined {
  return run.ci?.commitSha ?? run.gitSha;
}

function getBranch(run: TestRunResult): string | undefined {
  return run.ci?.branch;
}

export function pickAutoBaseline(
  currentRun: TestRunResult,
  candidates: BaselineCandidate[]
): BaselineCandidate | undefined {
  const currentBranch = getBranch(currentRun);
  const currentCommit = getCommit(currentRun);

  return [...candidates].sort((a, b) => {
    const aSameBranch =
      Boolean(currentBranch && getBranch(a.run) && currentBranch === getBranch(a.run));
    const bSameBranch =
      Boolean(currentBranch && getBranch(b.run) && currentBranch === getBranch(b.run));
    if (aSameBranch !== bSameBranch) {
      return Number(bSameBranch) - Number(aSameBranch);
    }

    const aDifferentCommit =
      Boolean(currentCommit && getCommit(a.run) && currentCommit !== getCommit(a.run));
    const bDifferentCommit =
      Boolean(currentCommit && getCommit(b.run) && currentCommit !== getCommit(b.run));
    if (aDifferentCommit !== bDifferentCommit) {
      return Number(bDifferentCommit) - Number(aDifferentCommit);
    }

    const aOlder = a.run.startedAtMs < currentRun.startedAtMs;
    const bOlder = b.run.startedAtMs < currentRun.startedAtMs;
    if (aOlder !== bOlder) {
      return Number(bOlder) - Number(aOlder);
    }

    return b.run.startedAtMs - a.run.startedAtMs;
  })[0];
}
