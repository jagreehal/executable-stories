/**
 * Build Pickle envelopes from test cases and GherkinDocument data.
 *
 * Each TestCaseResult becomes one Pickle (the compiled, runnable scenario).
 */

import type { TestCaseResult } from "../../types/test-result";
import type { DocEntry, StepKeyword, StoryStep } from "../../types/story";
import type {
  Pickle,
  PickleStep,
  PickleTag,
  PickleStepArgument,
  PickleDocString,
  PickleTable,
  PickleTableRow,
  Envelope,
} from "../../types/cucumber-messages";
import {
  deterministicId,
  resolvePickleStepTypes,
} from "../../utils/cucumber-messages";

/**
 * Build Pickle envelopes for a group of test cases from one file.
 */
export function buildPickleEnvelopes(
  uri: string,
  testCases: TestCaseResult[],
  salt: string
): Envelope[] {
  const envelopes: Envelope[] = [];

  for (const tc of testCases) {
    const scenarioName = tc.story.scenario;
    const pickleId = deterministicId("pickle", salt, uri, scenarioName);
    const scenarioAstId = deterministicId("scenario", salt, uri, scenarioName);

    // Resolve step types with And/But inheritance
    const keywords = tc.story.steps.map((s) => s.keyword as StepKeyword);
    const resolvedTypes = resolvePickleStepTypes(keywords);

    const pickleSteps: PickleStep[] = tc.story.steps.map((step, i) => {
      const ps: PickleStep = {
        astNodeIds: [
          deterministicId("astStep", salt, uri, scenarioName, String(i)),
        ],
        id: deterministicId("pickleStep", salt, uri, scenarioName, String(i)),
        type: resolvedTypes[i],
        text: step.text,
      };

      const argument = buildPickleStepArgument(step);
      if (argument) ps.argument = argument;

      return ps;
    });

    const pickleTags: PickleTag[] = tc.tags.map((tag) => ({
      name: `@${tag}`,
      astNodeId: deterministicId("scenarioTag", salt, uri, scenarioName, tag),
    }));

    const pickle: Pickle = {
      id: pickleId,
      uri,
      name: scenarioName,
      language: "en",
      steps: pickleSteps,
      tags: pickleTags,
      astNodeIds: [scenarioAstId],
    };

    envelopes.push({ pickle });
  }

  return envelopes;
}

/**
 * Build a PickleStepArgument from step docs.
 * Priority: first table → PickleTable, else first doc-string-like → PickleDocString.
 */
function buildPickleStepArgument(step: StoryStep): PickleStepArgument | undefined {
  if (!step.docs || step.docs.length === 0) return undefined;

  // Table takes priority
  const tableDocs = step.docs.filter(
    (d): d is Extract<DocEntry, { kind: "table" }> => d.kind === "table"
  );
  if (tableDocs.length > 0) {
    return { dataTable: buildPickleTable(tableDocs[0]) };
  }

  // Doc-string-like entries
  for (const doc of step.docs) {
    const ds = docEntryToPickleDocString(doc);
    if (ds) return { docString: ds };
  }

  return undefined;
}

function docEntryToPickleDocString(doc: DocEntry): PickleDocString | undefined {
  switch (doc.kind) {
    case "code":
      return { mediaType: doc.lang, content: doc.content };
    case "note":
      return { mediaType: "text/plain", content: doc.text };
    case "section":
      return { mediaType: "text/markdown", content: doc.markdown };
    case "mermaid":
      return { mediaType: "text/x-mermaid", content: doc.code };
    case "kv":
      return {
        mediaType: "text/plain",
        content: `${doc.label}: ${typeof doc.value === "string" ? doc.value : JSON.stringify(doc.value)}`,
      };
    case "link":
      return { mediaType: "text/markdown", content: `[${doc.label}](${doc.url})` };
    case "custom":
      return { mediaType: "application/json", content: JSON.stringify(doc.data, null, 2) };
    case "tag":
      return { mediaType: "text/plain", content: doc.names.map((n) => `@${n}`).join(" ") };
    default:
      return undefined;
  }
}

function buildPickleTable(
  table: Extract<DocEntry, { kind: "table" }>
): PickleTable {
  const rows: PickleTableRow[] = [];

  // Header row
  rows.push({
    cells: table.columns.map((col) => ({ value: col })),
  });

  // Data rows
  for (const row of table.rows) {
    rows.push({
      cells: row.map((cell) => ({ value: cell })),
    });
  }

  return { rows };
}
