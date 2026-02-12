/**
 * executable-stories CLI
 *
 * Reads raw test results as JSON and generates reports.
 *
 * Usage:
 *   executable-stories format run.json --format html,markdown
 *   executable-stories format --stdin --format html
 *   executable-stories validate run.json
 */

import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

import { validateRawRun } from "./validation/schema-validator";
import { synthesizeStories } from "./converters/synthesize";
import { canonicalizeRun } from "./converters/acl/index";
import { assertValidRun } from "./converters/acl/validate";
import { ReportGenerator } from "./index";
import { parseNdjson } from "./converters/ndjson-parser";
import type { OutputFormat } from "./types/options";

// ============================================================================
// Exit Codes
// ============================================================================

const EXIT_SUCCESS = 0;
const EXIT_SCHEMA_VALIDATION = 1;
const EXIT_CANONICAL_VALIDATION = 2;
const EXIT_GENERATION = 3;
const EXIT_USAGE = 4;

// ============================================================================
// CLI Argument Parsing
// ============================================================================

const HELP_TEXT = `
executable-stories — Generate reports from test results JSON.

USAGE
  executable-stories format <file> [options]
  executable-stories format --stdin [options]
  executable-stories validate <file>
  executable-stories validate --stdin

SUBCOMMANDS
  format     Read raw test results and generate reports
  validate   Validate a JSON file against the schema (no output generated)

OPTIONS
  --format <formats>            Comma-separated formats (default: html)
                                  html              Custom HTML report (accessible, dark mode, mermaid)
                                  cucumber-html     Official Cucumber HTML report
                                  markdown          Markdown documentation
                                  junit             JUnit XML
                                  cucumber-json     Cucumber JSON
                                  cucumber-messages Raw NDJSON (Cucumber Messages)
  --input-type <type>           Input type: raw, canonical, or ndjson (default: raw)
  --output-dir <dir>            Output directory (default: reports)
  --output-name <name>          Base filename (default: test-results)
  --include <globs>             Comma-separated globs to include test cases by sourceFile (e.g. "**/*.Story*.cs")
  --exclude <globs>             Comma-separated globs to exclude test cases by sourceFile (e.g. "**/obj/**")
  --synthesize-stories          Synthesize story metadata for plain test results (default)
  --no-synthesize-stories       Disable story synthesis (strict mode)
  --html-title <title>          HTML report title (default: Test Results)
  --html-no-syntax-highlighting Disable syntax highlighting in HTML (enabled by default)
  --html-no-mermaid             Disable mermaid diagrams in HTML (enabled by default)
  --html-no-markdown            Disable markdown parsing in HTML (enabled by default)
  --stdin                       Read JSON from stdin instead of file
  --json-summary                Print machine-parsable JSON summary
  --emit-canonical <path>       Write canonical JSON to given path
  --help                        Show this help message

EXIT CODES
  0  Success
  1  Schema validation failure
  2  Canonical validation failure
  3  Formatter/generation failure
  4  Bad arguments / usage error
`.trim();

interface CliArgs {
  subcommand: "format" | "validate";
  inputFile?: string;
  stdin: boolean;
  formats: OutputFormat[];
  inputType: "raw" | "canonical" | "ndjson";
  outputDir: string;
  outputName: string;
  include: string[];
  exclude: string[];
  synthesizeStories: boolean;
  htmlTitle: string;
  htmlNoSyntaxHighlighting: boolean;
  htmlNoMermaid: boolean;
  htmlNoMarkdown: boolean;
  jsonSummary: boolean;
  emitCanonical?: string;
}

function parseCliArgs(argv: string[]): CliArgs {
  // Strip node + script path
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    process.exit(EXIT_SUCCESS);
  }

  const subcommand = args[0];
  if (subcommand !== "format" && subcommand !== "validate") {
    console.error(`Unknown subcommand: "${subcommand}". Use "format" or "validate".`);
    process.exit(EXIT_USAGE);
  }

  // Parse remaining args with node:util parseArgs
  const { values, positionals } = parseArgs({
    args: args.slice(1),
    options: {
      format: { type: "string", default: "html" },
      "input-type": { type: "string", default: "raw" },
      "output-dir": { type: "string", default: "reports" },
      "output-name": { type: "string", default: "test-results" },
      include: { type: "string" },
      exclude: { type: "string" },
      "synthesize-stories": { type: "boolean", default: true },
      "no-synthesize-stories": { type: "boolean", default: false },
      "html-title": { type: "string", default: "Test Results" },
      "html-no-syntax-highlighting": { type: "boolean", default: false },
      "html-no-mermaid": { type: "boolean", default: false },
      "html-no-markdown": { type: "boolean", default: false },
      stdin: { type: "boolean", default: false },
      "json-summary": { type: "boolean", default: false },
      "emit-canonical": { type: "string" },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(EXIT_SUCCESS);
  }

  const inputFile = positionals[0];
  const useStdin = values.stdin as boolean;

  if (!useStdin && !inputFile) {
    console.error("Error: No input file specified. Use a positional argument or --stdin.");
    process.exit(EXIT_USAGE);
  }

  const inputType = values["input-type"] as string;
  if (inputType !== "raw" && inputType !== "canonical" && inputType !== "ndjson") {
    console.error(`Error: --input-type must be "raw", "canonical", or "ndjson", got "${inputType}".`);
    process.exit(EXIT_USAGE);
  }

  // Parse comma-separated formats
  const validFormats = new Set(["html", "markdown", "junit", "cucumber-json", "cucumber-messages", "cucumber-html"]);
  const formatStr = values.format as string;
  const formats = formatStr.split(",").map((f) => f.trim()) as OutputFormat[];
  for (const f of formats) {
    if (!validFormats.has(f)) {
      console.error(`Error: Unknown format "${f}". Valid: html, markdown, junit, cucumber-json, cucumber-messages, cucumber-html.`);
      process.exit(EXIT_USAGE);
    }
  }

  const noSynthesize = values["no-synthesize-stories"] as boolean;

  const parseGlobs = (v: string | undefined): string[] =>
    v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return {
    subcommand: subcommand as "format" | "validate",
    inputFile,
    stdin: useStdin,
    formats,
    inputType: inputType as "raw" | "canonical" | "ndjson",
    outputDir: values["output-dir"] as string,
    outputName: values["output-name"] as string,
    include: parseGlobs(values.include as string | undefined),
    exclude: parseGlobs(values.exclude as string | undefined),
    synthesizeStories: !noSynthesize,
    htmlTitle: values["html-title"] as string,
    htmlNoSyntaxHighlighting: values["html-no-syntax-highlighting"] as boolean,
    htmlNoMermaid: values["html-no-mermaid"] as boolean,
    htmlNoMarkdown: values["html-no-markdown"] as boolean,
    jsonSummary: values["json-summary"] as boolean,
    emitCanonical: values["emit-canonical"] as string | undefined,
  };
}

// ============================================================================
// Input Reading
// ============================================================================

async function readInput(args: CliArgs): Promise<string> {
  if (args.stdin) {
    return readStdin();
  }
  const filePath = path.resolve(args.inputFile!);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(EXIT_USAGE);
  }
  return fs.readFileSync(filePath, "utf8");
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk as string));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

// ============================================================================
// Validation Pipeline
// ============================================================================

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Invalid JSON — ${msg}`);
    process.exit(EXIT_USAGE);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseCliArgs(process.argv);
  const startMs = Date.now();

  // Read input
  const text = await readInput(args);

  // === NDJSON input pipeline ===
  if (args.inputType === "ndjson") {
    if (args.subcommand === "validate") {
      // Validate each line is valid JSON with exactly one envelope field
      const lines = text.trim().split("\n").filter(Boolean);
      const validKeys = new Set([
        "meta", "source", "gherkinDocument", "pickle",
        "testRunStarted", "testCase", "testCaseStarted",
        "testStepStarted", "testStepFinished", "testCaseFinished",
        "testRunFinished", "attachment",
      ]);
      for (let i = 0; i < lines.length; i++) {
        try {
          const obj = JSON.parse(lines[i]);
          const keys = Object.keys(obj);
          if (keys.length !== 1 || !validKeys.has(keys[0])) {
            console.error(`Line ${i + 1}: invalid envelope (keys: ${keys.join(", ")})`);
            process.exit(EXIT_SCHEMA_VALIDATION);
          }
        } catch {
          console.error(`Line ${i + 1}: invalid JSON`);
          process.exit(EXIT_SCHEMA_VALIDATION);
        }
      }
      console.log(`Valid NDJSON (${lines.length} envelopes).`);
      process.exit(EXIT_SUCCESS);
    }

    // Parse NDJSON → TestRunResult
    let run;
    try {
      run = parseNdjson(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`NDJSON parse failed: ${msg}`);
      process.exit(EXIT_SCHEMA_VALIDATION);
    }

    // Emit canonical if requested
    if (args.emitCanonical) {
      const outPath = path.resolve(args.emitCanonical);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(run, null, 2), "utf8");
    }

    try {
      const result = await generateReports(run, args);
      printResult(result, args, startMs);
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Generation failed: ${msg}`);
      process.exit(EXIT_GENERATION);
    }
  }

  const data = parseJson(text);

  if (args.subcommand === "validate") {
    // Validate-only mode
    if (args.inputType === "canonical") {
      try {
        assertValidRun(data as any);
        console.log("Valid canonical TestRunResult.");
        process.exit(EXIT_SUCCESS);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(msg);
        process.exit(EXIT_CANONICAL_VALIDATION);
      }
    }

    // Check schemaVersion
    const obj = data as Record<string, unknown>;
    if (obj.schemaVersion !== 1) {
      console.error(
        `Unsupported schemaVersion ${obj.schemaVersion}. Supported: 1.`
      );
      process.exit(EXIT_SCHEMA_VALIDATION);
    }

    const result = validateRawRun(data);
    if (!result.valid) {
      console.error("Schema validation failed:");
      for (const err of result.errors) {
        console.error(`  ${err}`);
      }
      process.exit(EXIT_SCHEMA_VALIDATION);
    }

    console.log("Valid RawRun (schemaVersion 1).");
    process.exit(EXIT_SUCCESS);
  }

  // === format subcommand ===

  if (args.inputType === "canonical") {
    // Skip schema validation, go straight to canonical validation
    try {
      assertValidRun(data as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Canonical validation failed:\n${msg}`);
      process.exit(EXIT_CANONICAL_VALIDATION);
    }

    const run = data as any;

    // Emit canonical if requested
    if (args.emitCanonical) {
      const outPath = path.resolve(args.emitCanonical);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(run, null, 2), "utf8");
    }

    try {
      const result = await generateReports(run, args);
      printResult(result, args, startMs);
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Generation failed: ${msg}`);
      process.exit(EXIT_GENERATION);
    }
  }

  // Raw input pipeline
  // 1. Check schemaVersion
  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    console.error(
      `Unsupported schemaVersion ${obj.schemaVersion}. Supported: 1.`
    );
    process.exit(EXIT_SCHEMA_VALIDATION);
  }

  // 2. Ajv schema validation
  const schemaResult = validateRawRun(data);
  if (!schemaResult.valid) {
    console.error("Schema validation failed:");
    for (const err of schemaResult.errors) {
      console.error(`  ${err}`);
    }
    process.exit(EXIT_SCHEMA_VALIDATION);
  }

  // 3. Synthesize stories (optional)
  let raw = data as any;
  let droppedMissingStory = 0;

  if (args.synthesizeStories) {
    raw = synthesizeStories(raw);
  } else {
    // Count and warn about dropped test cases
    const before = raw.testCases.length;
    const withStory = raw.testCases.filter(
      (tc: any) => tc.story != null
    ).length;
    droppedMissingStory = before - withStory;
    if (droppedMissingStory > 0) {
      console.error(
        `Dropped ${droppedMissingStory} test cases missing story (use --synthesize-stories to include)`
      );
    }
  }

  // 4. Canonicalize
  const canonical = canonicalizeRun(raw);

  // 5. Assert canonical validity
  try {
    assertValidRun(canonical);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Canonical validation failed:\n${msg}`);
    process.exit(EXIT_CANONICAL_VALIDATION);
  }

  // Emit canonical if requested
  if (args.emitCanonical) {
    const outPath = path.resolve(args.emitCanonical);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(canonical, null, 2), "utf8");
  }

  // 6. Generate reports
  try {
    const result = await generateReports(canonical, args, droppedMissingStory);
    printResult(result, args, startMs, droppedMissingStory);
    process.exit(EXIT_SUCCESS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Generation failed: ${msg}`);
    process.exit(EXIT_GENERATION);
  }
}

// ============================================================================
// Report Generation
// ============================================================================

interface CliResult {
  files: string[];
  counts: { passed: number; failed: number; skipped: number; pending: number };
}

async function generateReports(
  run: any,
  args: CliArgs,
  _droppedMissingStory = 0
): Promise<CliResult> {
  const generator = new ReportGenerator({
    include: args.include,
    exclude: args.exclude,
    formats: args.formats,
    outputDir: args.outputDir,
    outputName: args.outputName,
    html: {
      title: args.htmlTitle,
      syntaxHighlighting: !args.htmlNoSyntaxHighlighting,
      mermaidEnabled: !args.htmlNoMermaid,
      markdownEnabled: !args.htmlNoMarkdown,
    },
  });

  const resultMap = await generator.generate(run);

  // Collect all generated file paths
  const files: string[] = [];
  for (const paths of resultMap.values()) {
    files.push(...paths);
  }

  // Count statuses
  const counts = { passed: 0, failed: 0, skipped: 0, pending: 0 };
  for (const tc of run.testCases) {
    const status = tc.status as keyof typeof counts;
    if (status in counts) {
      counts[status]++;
    }
  }

  return { files, counts };
}

function printResult(
  result: CliResult,
  args: CliArgs,
  startMs: number,
  droppedMissingStory = 0
) {
  const durationMs = Date.now() - startMs;

  if (args.jsonSummary) {
    const summary: Record<string, unknown> = {
      files: result.files,
      counts: result.counts,
      durationMs,
    };
    if (droppedMissingStory > 0) {
      summary.droppedMissingStory = droppedMissingStory;
    }
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const f of result.files) {
      console.log(f);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(EXIT_USAGE);
});
