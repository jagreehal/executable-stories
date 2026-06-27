/**
 * `executable-stories new <template> "<name>"` — scaffold a hand-written docs
 * page that is pre-wired to executable stories.
 *
 * Confluence's killer feature is "anyone can start a page from a template". This
 * brings that to the living-docs site, except every template links to the tests
 * that keep it honest: ADRs and incidents carry a `verifiedBy` badge, runbooks
 * use self-verifying checklist steps.
 *
 * Templates assume the standard `init-astro` layout (pages live under
 * `src/content/docs/<subdir>/`, components under `src/components/`).
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type TemplateName =
  | "adr"
  | "runbook"
  | "decision-log"
  | "incident"
  | "scenario-note";

export const TEMPLATES: TemplateName[] = [
  "adr",
  "runbook",
  "decision-log",
  "incident",
  "scenario-note",
];

export interface ScaffoldOptions {
  template: string;
  /** Human title for the page; falls back to a generic name. */
  name?: string;
  /** Stable story-report scenario id for scenario-note templates. */
  scenarioId?: string;
  /** Docs root. Default: "src/content/docs". */
  baseDir?: string;
  force?: boolean;
  /** Injectable for deterministic output in tests. */
  today?: Date;
}

export interface ScaffoldResult {
  template: TemplateName;
  path: string;
  title: string;
}

interface TemplateSpec {
  /** Subdirectory under baseDir (also drives sidebar grouping). */
  subdir: string;
  /** Build the file's basename (without extension). */
  filename: (slug: string, ctx: BuildContext) => string;
  /** Build the MDX content. */
  content: (ctx: BuildContext) => string;
}

interface BuildContext {
  name: string;
  slug: string;
  scenarioId?: string;
  isoDate: string;
  /** Next ADR-style sequence number, zero-padded; computed from existing files. */
  seq: string;
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function isoDate(today: Date): string {
  return today.toISOString().slice(0, 10);
}

/** Next 4-digit sequence by scanning a directory for `NNNN-*` files. */
function nextSeq(dir: string): string {
  let max = 0;
  try {
    for (const entry of fs.readdirSync(dir)) {
      const match = /^(\d{1,4})-/.exec(entry);
      if (match) max = Math.max(max, Number.parseInt(match[1], 10));
    }
  } catch {
    // Directory doesn't exist yet — start at 1.
  }
  return String(max + 1).padStart(4, "0");
}

const COMPONENTS = "../../../components";

const TEMPLATE_SPECS: Record<TemplateName, TemplateSpec> = {
  adr: {
    subdir: "adr",
    filename: (slug, ctx) => `${ctx.seq}-${slug}`,
    content: (ctx) => `---
title: 'ADR ${ctx.seq} — ${ctx.name}'
description: '${ctx.name}'
# Link the stories that prove this decision. The badge under the title turns
# red the moment any of them fail, so this record can't drift from the code.
verifiedBy: []
---

## Status

**Proposed** — proposed · accepted · superseded · deprecated

## Context

_What problem are we solving? What constraints and forces apply?_

## Decision

_What did we decide to do?_

## Consequences

_What becomes easier, and what becomes harder, as a result?_

## Verified by

Add the story ids or tags that exercise this decision to \`verifiedBy\` in the
frontmatter above. Until you do, the badge reads **Unverified** — by design.
`,
  },

  runbook: {
    subdir: "runbooks",
    filename: (slug) => slug,
    content: (ctx) => `---
title: 'Runbook — ${ctx.name}'
description: 'Operational runbook for ${ctx.name}'
---

import Checklist from '${COMPONENTS}/Checklist.astro';
import VerifiedStep from '${COMPONENTS}/VerifiedStep.astro';

_When to use this runbook, prerequisites, and who to contact._

## Steps

Each step linked with \`story=\` shows a live green check when its test passed in
the last run — so this runbook is trustworthy, not aspirational.

<Checklist>
  <VerifiedStep story="">Describe the first action, and link the story that verifies it.</VerifiedStep>
  <VerifiedStep>A manual step with no automated check.</VerifiedStep>
</Checklist>

## Rollback

_How to safely undo if something goes wrong._
`,
  },

  "decision-log": {
    subdir: "decisions",
    filename: (slug) => slug,
    content: (ctx) => `---
title: 'Decision log — ${ctx.name}'
description: 'Running log of decisions for ${ctx.name}'
---

A lightweight running log. For weightier decisions, scaffold a full ADR with
\`executable-stories new adr\`.

| Date | Decision | Owner | Verified by |
| ---- | -------- | ----- | ----------- |
| ${ctx.isoDate} | _What was decided_ | _Who_ | _story id or tag_ |
`,
  },

  incident: {
    subdir: "incidents",
    filename: (slug, ctx) => `${ctx.isoDate}-${slug}`,
    content: (ctx) => `---
title: 'Incident — ${ctx.name}'
description: 'Post-mortem for ${ctx.name}'
# Link the regression story added to stop this recurring.
verifiedBy: []
---

## Summary

_What happened, who was affected, and for how long._

## Timeline

| Time | Event |
| ---- | ----- |
| ${ctx.isoDate} | Detected |

## Root cause

_The underlying cause, not just the trigger._

## Resolution

_How it was fixed._

## Action items

- [ ] Add a regression story and link it in \`verifiedBy\` so a silent recurrence
  becomes a failing badge.
`,
  },

  "scenario-note": {
    subdir: "notes",
    filename: (_slug, ctx) => ctx.scenarioId ?? ctx.slug,
    content: (ctx) => `---
title: 'Business context — ${ctx.name}'
description: 'Stakeholder context for ${ctx.name}'
scenarioId: ${ctx.scenarioId}
# Link this note back to the scenario it explains so the badge and explorer stay aligned.
verifiedBy: [${ctx.scenarioId}]
---

This page is hand-written commentary for a generated scenario. The generated
stories render live from the run JSON, so this page is never overwritten.

## Why this behavior matters

_Describe the business rule, policy, customer promise, or operational nuance._

## Caveats

- _What readers should know when this scenario passes_
- _Any assumptions, exclusions, or follow-up links_
`,
  },
};

export function isTemplateName(value: string): value is TemplateName {
  return (TEMPLATES as string[]).includes(value);
}

export function scaffoldDoc(options: ScaffoldOptions): ScaffoldResult {
  const { template } = options;
  if (!isTemplateName(template)) {
    throw new Error(
      `Unknown template "${template}". Available: ${TEMPLATES.join(", ")}.`,
    );
  }

  const spec = TEMPLATE_SPECS[template];
  const baseDir = options.baseDir ?? path.join("src", "content", "docs");
  const today = options.today ?? new Date();
  const name = (options.name ?? "").trim() || defaultName(template);
  const slug = slugify(name);
  const scenarioId = normalizeScenarioId(options.scenarioId);
  const dir = path.join(baseDir, spec.subdir);

  if (template === "scenario-note" && !scenarioId) {
    throw new Error(`Template "scenario-note" requires --scenario-id.`);
  }

  const ctx: BuildContext = {
    name,
    slug,
    scenarioId,
    isoDate: isoDate(today),
    seq: nextSeq(dir),
  };

  const filename = `${spec.filename(slug, ctx)}.mdx`;
  const filePath = path.join(dir, filename);

  if (fs.existsSync(filePath) && !options.force) {
    throw new Error(
      `File "${filePath}" already exists. Use --force to overwrite.`,
    );
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, spec.content(ctx), "utf8");

  return { template, path: filePath, title: titleFor(template, ctx) };
}

function defaultName(template: TemplateName): string {
  switch (template) {
    case "adr":
      return "Untitled decision";
    case "runbook":
      return "Untitled runbook";
    case "decision-log":
      return "Decisions";
    case "incident":
      return "Untitled incident";
    case "scenario-note":
      return "Untitled scenario note";
  }
}

function titleFor(template: TemplateName, ctx: BuildContext): string {
  switch (template) {
    case "adr":
      return `ADR ${ctx.seq} — ${ctx.name}`;
    case "runbook":
      return `Runbook — ${ctx.name}`;
    case "decision-log":
      return `Decision log — ${ctx.name}`;
    case "incident":
      return `Incident — ${ctx.name}`;
    case "scenario-note":
      return `Business context — ${ctx.name}`;
  }
}

function normalizeScenarioId(input: string | undefined): string | undefined {
  const value = input?.trim();
  if (!value) return undefined;
  if (value.includes("/") || value.includes("\\")) {
    throw new Error(`scenarioId must not contain path separators.`);
  }
  return value;
}
