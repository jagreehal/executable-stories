/**
 * Review markdown formatter — renders a {@link ReviewResult} as a PR-comment-friendly
 * review of AI-authored changes.
 *
 * Reading order matches reviewer attention: the 🔴 uncovered-change band first
 * (what changed with no evidence), then 🟡 weak evidence, then claims grouped by
 * audience (stakeholder behaviour, then engineer detail), each showing graded
 * proof. Mirrors {@link RunDiffMarkdownFormatter}.
 */

import type {
  ChangedFileReview,
  CodeDiffEvidence,
  EvidenceStrength,
  ReviewClaim,
  ReviewResult,
} from "../types/review";

export interface ReviewMarkdownOptions {
  title?: string;
}

const STRENGTH_BADGE: Record<EvidenceStrength, string> = {
  strong: "🟢 strong",
  moderate: "🟡 moderate",
  weak: "🟠 weak",
  none: "🔴 none",
};

function statusIcon(status: ReviewClaim["status"]): string {
  switch (status) {
    case "passed":
      return "✅";
    case "failed":
      return "❌";
    case "skipped":
      return "⊘";
    default:
      return "•";
  }
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** First line of an intent narrative, for the at-a-glance summary. */
function intentSummary(intent: string): string {
  const firstLine = intent.split("\n").find((l) => l.trim().length > 0) ?? "";
  const trimmed = firstLine.trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
}

function renderTicket(ticket: { id: string; url?: string }): string {
  return ticket.url ? `[${ticket.id}](${ticket.url})` : `\`${ticket.id}\``;
}

function renderUncoveredBand(lines: string[], files: ChangedFileReview[]): void {
  const uncovered = files.filter((f) => f.band === "uncovered");
  if (uncovered.length === 0) return;
  lines.push(`## 🔴 Changed code with no evidence (${uncovered.length})`);
  lines.push("");
  lines.push("Start here — these changed source files have no claim or test behind them.");
  lines.push("");
  for (const file of uncovered) {
    lines.push(`- \`${file.path}\` _(${file.changeKind})_`);
  }
  lines.push("");
}

function renderWeakBand(lines: string[], files: ChangedFileReview[]): void {
  const weak = files.filter((f) => f.band === "weak");
  if (weak.length === 0) return;
  lines.push(`## 🟡 Changed code with weak evidence (${weak.length})`);
  lines.push("");
  for (const file of weak) {
    const covered = file.claims
      .map((c) => `${escapeCell(c.scenario)} (${c.strength})`)
      .join(", ");
    lines.push(`- \`${file.path}\` _(${file.changeKind})_ — only: ${covered}`);
  }
  lines.push("");
}

function renderClaim(lines: string[], claim: ReviewClaim): void {
  lines.push(`### ${statusIcon(claim.status)} ${claim.scenario}`);
  lines.push("");
  lines.push(`- File: \`${claim.sourceFile}:${claim.sourceLine}\``);
  if (claim.changeType !== "unknown") {
    lines.push(`- Change: \`${claim.changeType}\``);
  }
  const tickets = claim.testCase.story.tickets ?? [];
  if (tickets.length > 0) {
    lines.push(`- Tickets: ${tickets.map(renderTicket).join(", ")}`);
  }
  lines.push(
    `- Evidence: ${STRENGTH_BADGE[claim.strength]} — ${claim.strengthReasons.join("; ")}`
  );
  if (claim.coversFiles.length > 0) {
    lines.push(
      `- Covers: ${claim.coversFiles.map((f) => `\`${f}\``).join(", ")}`
    );
  }
  if (claim.intent) {
    lines.push(`- Why: ${escapeCell(intentSummary(claim.intent))}`);
  }
  lines.push("");
}

function renderAudienceSection(
  lines: string[],
  title: string,
  claims: ReviewClaim[]
): void {
  if (claims.length === 0) return;
  lines.push(`## ${title} (${claims.length})`);
  lines.push("");
  for (const claim of claims) {
    renderClaim(lines, claim);
  }
}

/** Patches above this render as a link/notice instead of a fenced block. */
const MAX_PATCH_EMBED_BYTES = 64 * 1024;

/**
 * A fence longer than the longest backtick run in the content, so a patch
 * containing ``` (e.g. a diff of a Markdown file) cannot close the block early.
 */
function fenceFor(content: string): string {
  const runs = content.match(/`{3,}/g);
  const length = runs ? Math.max(...runs.map((r) => r.length)) + 1 : 3;
  return "`".repeat(length);
}

/**
 * Static Code Diff fallback: comparison metadata, ordered annotations with
 * scenario references and anchor-state notices, and the patch (fenced when
 * small, linked otherwise). No pretence of an interactive viewer.
 */
function renderCodeDiff(lines: string[], evidence: CodeDiffEvidence): void {
  lines.push(`## Code diff evidence: ${evidence.title}`);
  lines.push("");
  if (evidence.baseLabel || evidence.headLabel) {
    lines.push(
      `Comparing \`${evidence.baseLabel ?? "base"}\` → \`${evidence.headLabel ?? "head"}\`.`
    );
    lines.push("");
  }
  if (evidence.patchUrl !== undefined) {
    // Only https: is presented as a linkable URL; anything else stays inert code text.
    lines.push(
      evidence.patchUrl.startsWith("https://")
        ? `Canonical patch: ${evidence.patchUrl}`
        : `Canonical patch: \`${evidence.patchUrl.replace(/`/g, "")}\``
    );
    lines.push("");
  }

  evidence.annotations.forEach((annotation, i) => {
    lines.push(`### ${annotation.label ?? `Annotation ${i + 1}`}`);
    lines.push("");
    lines.push(annotation.text);
    lines.push("");
    if (annotation.resolution.state === "orphaned") {
      lines.push(
        "> ⚠️ Orphaned annotation — could not locate these lines in the current patch."
      );
      lines.push("");
    } else if (annotation.resolution.state === "ambiguous") {
      lines.push(
        "> ⚠️ Ambiguous anchor — these lines appear in more than one place in the current patch."
      );
      lines.push("");
    } else if (annotation.resolution.file !== undefined) {
      lines.push(`Location: \`${annotation.resolution.file}\``);
      lines.push("");
    }
    if (annotation.scenarios.length === 0) {
      lines.push("_Not covered by a scenario._");
    } else {
      for (const ref of annotation.scenarios) {
        lines.push(
          ref.resolved && ref.status
            ? `- ${statusIcon(ref.status)} ${escapeCell(ref.scenario ?? ref.id)} (\`${ref.id}\`)`
            : `- ⚠️ \`${ref.id}\` — unverified reference (scenario not in this run)`
        );
      }
    }
    lines.push("");
  });

  if (Buffer.byteLength(evidence.patch, "utf8") <= MAX_PATCH_EMBED_BYTES) {
    const fence = fenceFor(evidence.patch);
    lines.push("<details><summary>Raw patch (audit)</summary>");
    lines.push("");
    lines.push(`${fence}diff`);
    lines.push(evidence.patch.trimEnd());
    lines.push(fence);
    lines.push("");
    lines.push("</details>");
  } else {
    lines.push(
      `_Patch too large to embed${evidence.patchUrl ? " — see the canonical patch link above" : ""}._`
    );
  }
  lines.push("");
}

export class ReviewMarkdownFormatter {
  private title: string;

  constructor(options: ReviewMarkdownOptions = {}) {
    this.title = options.title ?? "Evidence Review";
  }

  format(review: ReviewResult): string {
    const lines: string[] = [];
    const { summary, context } = review;

    lines.push(`# ${this.title}`);
    lines.push("");
    if (context.baseRef || context.headRef) {
      lines.push(
        `Comparing \`${context.baseRef ?? "base"}\` → \`${context.headRef ?? "head"}\`.`
      );
      lines.push("");
    }

    lines.push("## Review priority");
    lines.push("");
    if (summary.changedSourceFiles === 0) {
      lines.push(
        "No changed source files supplied — showing claims and evidence only."
      );
    } else if (summary.uncovered > 0) {
      lines.push(
        `Review the ${summary.uncovered} unaccounted-for file(s) first: changed code with no evidence behind it.`
      );
    } else if (summary.weaklyCovered > 0) {
      lines.push(
        `No unaccounted-for changes. Review ${summary.weaklyCovered} weakly-covered file(s) next.`
      );
    } else {
      lines.push("Every changed source file is backed by at least moderate evidence.");
    }
    lines.push("");

    if (summary.changedSourceFiles > 0) {
      lines.push("| 🔴 Uncovered | 🟡 Weak | 🟢 Covered | Changed files |");
      lines.push("| ---: | ---: | ---: | ---: |");
      lines.push(
        `| ${summary.uncovered} | ${summary.weaklyCovered} | ${summary.covered} | ${summary.changedSourceFiles} |`
      );
      lines.push("");
    }

    lines.push("| Claims | Stakeholder | Engineer | Strong | Moderate | Weak | None |");
    lines.push("| ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
    lines.push(
      `| ${summary.totalClaims} | ${summary.byAudience.stakeholder} | ${summary.byAudience.engineer} | ${summary.byStrength.strong} | ${summary.byStrength.moderate} | ${summary.byStrength.weak} | ${summary.byStrength.none} |`
    );
    lines.push("");

    renderUncoveredBand(lines, review.changedFiles);
    renderWeakBand(lines, review.changedFiles);

    renderAudienceSection(
      lines,
      "Stakeholder behaviour",
      review.claims.filter((c) => c.audience === "stakeholder")
    );
    renderAudienceSection(
      lines,
      "Engineer changes",
      review.claims.filter((c) => c.audience === "engineer")
    );

    for (const evidence of review.codeDiffs) {
      renderCodeDiff(lines, evidence);
    }

    return lines.join("\n").trimEnd();
  }
}
