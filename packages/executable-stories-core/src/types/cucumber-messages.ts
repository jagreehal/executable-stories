/**
 * Cucumber Messages types for NDJSON output.
 *
 * Minimal own types (no @cucumber/messages dependency) — consistent with
 * the project's zero-external-deps-at-runtime approach.
 *
 * Based on the Cucumber Messages protocol:
 * https://github.com/cucumber/messages
 */

// ============================================================================
// Primitives
// ============================================================================

/** Protobuf-style timestamp { seconds, nanos } */
export interface Timestamp {
  seconds: number;
  nanos: number;
}

/** Protobuf-style duration { seconds, nanos } */
export interface Duration {
  seconds: number;
  nanos: number;
}

/** Location in a source file */
export interface Location {
  line: number;
  column?: number;
}

// ============================================================================
// Meta
// ============================================================================

export interface Meta {
  protocolVersion: string;
  implementation: { name: string; version: string };
  runtime: { name: string; version: string };
  os: { name: string };
  cpu: { name: string };
}

// ============================================================================
// Source
// ============================================================================

export interface Source {
  uri: string;
  data: string;
  mediaType: "text/x.cucumber.gherkin+plain";
}

// ============================================================================
// GherkinDocument AST
// ============================================================================

export interface Tag {
  location: Location;
  name: string;
  id: string;
}

export type KeywordType = "Unknown" | "Context" | "Action" | "Outcome" | "Conjunction";

export interface DocString {
  location: Location;
  mediaType?: string;
  content: string;
  delimiter: string;
}

export interface TableCell {
  location: Location;
  value: string;
}

export interface TableRow {
  location: Location;
  cells: TableCell[];
  id: string;
}

export interface DataTable {
  location: Location;
  rows: TableRow[];
}

export interface Step {
  location: Location;
  keyword: string;
  keywordType: KeywordType;
  text: string;
  id: string;
  docString?: DocString;
  dataTable?: DataTable;
}

export interface Scenario {
  location: Location;
  tags: Tag[];
  keyword: string;
  name: string;
  description: string;
  steps: Step[];
  id: string;
}

export interface Background {
  location: Location;
  keyword: string;
  name: string;
  description: string;
  steps: Step[];
  id: string;
}

export type FeatureChild =
  | { background: Background; scenario?: undefined }
  | { scenario: Scenario; background?: undefined };

export interface Feature {
  location: Location;
  tags: Tag[];
  language: string;
  keyword: string;
  name: string;
  description: string;
  children: FeatureChild[];
}

export interface GherkinDocument {
  uri: string;
  feature: Feature;
}

// ============================================================================
// Pickle (compiled scenario)
// ============================================================================

export type PickleStepType = "Unknown" | "Context" | "Action" | "Outcome";

export interface PickleDocString {
  mediaType?: string;
  content: string;
}

export interface PickleTableCell {
  value: string;
}

export interface PickleTableRow {
  cells: PickleTableCell[];
}

export interface PickleTable {
  rows: PickleTableRow[];
}

export interface PickleStepArgument {
  docString?: PickleDocString;
  dataTable?: PickleTable;
}

export interface PickleStep {
  astNodeIds: string[];
  id: string;
  type: PickleStepType;
  text: string;
  argument?: PickleStepArgument;
}

export interface PickleTag {
  name: string;
  astNodeId: string;
}

export interface Pickle {
  id: string;
  uri: string;
  name: string;
  language: string;
  steps: PickleStep[];
  tags: PickleTag[];
  astNodeIds: string[];
}

// ============================================================================
// Test Execution
// ============================================================================

export type TestStepResultStatus =
  | "UNKNOWN"
  | "PASSED"
  | "SKIPPED"
  | "PENDING"
  | "UNDEFINED"
  | "AMBIGUOUS"
  | "FAILED";

export interface TestStepResult {
  duration: Duration;
  status: TestStepResultStatus;
  message?: string;
}

export interface TestStep {
  id: string;
  pickleStepId?: string;
  stepDefinitionIds?: string[];
}

export interface TestCase {
  id: string;
  pickleId: string;
  testSteps: TestStep[];
}

export interface TestRunStarted {
  timestamp: Timestamp;
}

export interface TestCaseStarted {
  id: string;
  testCaseId: string;
  timestamp: Timestamp;
  attempt: number;
}

export interface TestStepStarted {
  testCaseStartedId: string;
  testStepId: string;
  timestamp: Timestamp;
}

export interface TestStepFinished {
  testCaseStartedId: string;
  testStepId: string;
  testStepResult: TestStepResult;
  timestamp: Timestamp;
}

export interface TestCaseFinished {
  testCaseStartedId: string;
  timestamp: Timestamp;
  willBeRetried: boolean;
}

export interface TestRunFinished {
  timestamp: Timestamp;
  success: boolean;
}

// ============================================================================
// Attachments
// ============================================================================

export type AttachmentContentEncoding = "IDENTITY" | "BASE64";

export interface CucumberAttachment {
  testCaseStartedId: string;
  testStepId?: string;
  body: string;
  mediaType: string;
  contentEncoding: AttachmentContentEncoding;
}

// ============================================================================
// Envelope (top-level message wrapper)
// ============================================================================

/**
 * Each NDJSON line is one Envelope with exactly one field set.
 */
export type Envelope =
  | { meta: Meta }
  | { source: Source }
  | { gherkinDocument: GherkinDocument }
  | { pickle: Pickle }
  | { testRunStarted: TestRunStarted }
  | { testCase: TestCase }
  | { testCaseStarted: TestCaseStarted }
  | { testStepStarted: TestStepStarted }
  | { testStepFinished: TestStepFinished }
  | { testCaseFinished: TestCaseFinished }
  | { testRunFinished: TestRunFinished }
  | { attachment: CucumberAttachment };
