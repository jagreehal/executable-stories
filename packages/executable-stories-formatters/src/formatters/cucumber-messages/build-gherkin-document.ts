/**
 * Build a GherkinDocument envelope from synthesized feature data.
 */

import type { TestCaseResult } from "../../types/test-result";
import type { DocEntry, StepKeyword, StoryStep } from "../../types/story";
import type {
  GherkinDocument,
  Feature,
  FeatureChild,
  Scenario,
  Step,
  Tag,
  Envelope,
  DocString,
  DataTable,
  TableRow,
  TableCell,
} from "../../types/cucumber-messages";
import type { SynthesizedFeature } from "./synthesize-feature";
import { deterministicId, keywordToKeywordType } from "../../utils/cucumber-messages";

/**
 * Build GherkinDocument + Source envelopes for a group of test cases from one file.
 */
export function buildGherkinDocumentEnvelopes(
  uri: string,
  testCases: TestCaseResult[],
  synthesized: SynthesizedFeature,
  salt: string
): { sourceEnvelope: Envelope; gherkinDocumentEnvelope: Envelope } {
  const { lineMap, featureName, featureTags, text } = synthesized;

  // Build feature-level tags
  const featureTagNodes: Tag[] = featureTags.map((tag, i) => ({
    location: {
      line: lineMap.featureTagLine ?? 1,
      column: undefined,
    },
    name: `@${tag}`,
    id: deterministicId("featureTag", salt, uri, tag),
  }));

  // Build children (scenarios)
  const children: FeatureChild[] = [];

  for (const tc of testCases) {
    const scenarioName = tc.story.scenario;
    const scenarioInfo = lineMap.scenarios.get(scenarioName);
    if (!scenarioInfo) continue;

    const scenarioId = deterministicId("scenario", salt, uri, scenarioName);

    // Build scenario tags
    const scenarioTags: Tag[] = tc.tags.map((tag) => ({
      location: {
        line: lineMap.scenarioTagLines.get(scenarioName) ?? scenarioInfo.scenarioLine,
      },
      name: `@${tag}`,
      id: deterministicId("scenarioTag", salt, uri, scenarioName, tag),
    }));

    // Build steps with keyword type tracking for And/But inheritance
    let lastNonConjunctionType: "Context" | "Action" | "Outcome" = "Context";
    const steps: Step[] = tc.story.steps.map((step, i) => {
      const keyword = step.keyword as StepKeyword;
      let kwType = keywordToKeywordType(keyword);

      if (kwType === "Conjunction") {
        kwType = lastNonConjunctionType;
      } else if (kwType === "Context" || kwType === "Action" || kwType === "Outcome") {
        lastNonConjunctionType = kwType;
      }

      const stepLine = scenarioInfo.stepLines.get(i) ?? 0;
      const astStep: Step = {
        location: { line: stepLine },
        keyword: `${keyword} `,
        keywordType: keywordToKeywordType(keyword),
        text: step.text,
        id: deterministicId("astStep", salt, uri, scenarioName, String(i)),
      };

      // Convert doc entries to DocString/DataTable
      const { docString, dataTable } = buildStepArguments(step, stepLine);
      if (docString) astStep.docString = docString;
      if (dataTable) astStep.dataTable = dataTable;

      return astStep;
    });

    const scenario: Scenario = {
      location: { line: scenarioInfo.scenarioLine },
      tags: scenarioTags,
      keyword: "Scenario",
      name: scenarioName,
      description: "",
      steps,
      id: scenarioId,
    };

    children.push({ scenario });
  }

  const feature: Feature = {
    location: { line: lineMap.featureLine },
    tags: featureTagNodes,
    language: "en",
    keyword: "Feature",
    name: featureName,
    description: "",
    children,
  };

  const gherkinDocument: GherkinDocument = { uri, feature };

  return {
    sourceEnvelope: {
      source: {
        uri,
        data: text,
        mediaType: "text/x.cucumber.gherkin+plain",
      },
    },
    gherkinDocumentEnvelope: { gherkinDocument },
  };
}

/**
 * Convert step doc entries to DocString or DataTable for the GherkinDocument AST.
 *
 * Priority: first "table" doc → DataTable, else first "code"/"note"/"section"/"mermaid" → DocString.
 * Screenshots are handled as attachments, not arguments.
 */
function buildStepArguments(
  step: StoryStep,
  stepLine: number
): { docString?: DocString; dataTable?: DataTable } {
  if (!step.docs || step.docs.length === 0) return {};

  // Look for table first (takes priority)
  const tableDocs = step.docs.filter((d): d is Extract<DocEntry, { kind: "table" }> => d.kind === "table");
  if (tableDocs.length > 0) {
    const table = tableDocs[0];
    return { dataTable: buildDataTable(table, stepLine + 1) };
  }

  // Look for doc-string-like entries
  for (const doc of step.docs) {
    const ds = docEntryToDocString(doc, stepLine + 1);
    if (ds) return { docString: ds };
  }

  return {};
}

function docEntryToDocString(doc: DocEntry, line: number): DocString | undefined {
  switch (doc.kind) {
    case "code":
      return {
        location: { line },
        mediaType: doc.lang,
        content: doc.content,
        delimiter: '"""',
      };
    case "note":
      return {
        location: { line },
        mediaType: "text/plain",
        content: doc.text,
        delimiter: '"""',
      };
    case "section":
      return {
        location: { line },
        mediaType: "text/markdown",
        content: doc.markdown,
        delimiter: '"""',
      };
    case "mermaid":
      return {
        location: { line },
        mediaType: "text/x-mermaid",
        content: doc.code,
        delimiter: '"""',
      };
    case "kv":
      return {
        location: { line },
        mediaType: "text/plain",
        content: `${doc.label}: ${typeof doc.value === "string" ? doc.value : JSON.stringify(doc.value)}`,
        delimiter: '"""',
      };
    case "link":
      return {
        location: { line },
        mediaType: "text/markdown",
        content: `[${doc.label}](${doc.url})`,
        delimiter: '"""',
      };
    case "custom":
      return {
        location: { line },
        mediaType: "application/json",
        content: JSON.stringify(doc.data, null, 2),
        delimiter: '"""',
      };
    case "tag":
      return {
        location: { line },
        mediaType: "text/plain",
        content: doc.names.map((n) => `@${n}`).join(" "),
        delimiter: '"""',
      };
    // screenshot and other kinds are not converted to doc strings
    default:
      return undefined;
  }
}

function buildDataTable(
  table: Extract<DocEntry, { kind: "table" }>,
  line: number
): DataTable {
  const rows: TableRow[] = [];

  // Header row
  rows.push({
    location: { line },
    cells: table.columns.map((col) => ({
      location: { line },
      value: col,
    })),
    id: "",
  });

  // Data rows
  for (let r = 0; r < table.rows.length; r++) {
    const rowLine = line + 1 + r;
    rows.push({
      location: { line: rowLine },
      cells: table.rows[r].map((cell) => ({
        location: { line: rowLine },
        value: cell,
      })),
      id: "",
    });
  }

  return {
    location: { line },
    rows,
  };
}
