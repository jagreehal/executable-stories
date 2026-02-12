/**
 * Cucumber JSON format types.
 *
 * Based on cucumber-js v11.x JSON formatter output.
 * @see https://github.com/cucumber/cucumber-js/blob/main/src/formatter/json_formatter.ts
 */

/** Cucumber JSON tag */
export interface IJsonTag {
  name: string;
  line?: number;
}

/** Cucumber JSON doc string (step argument) */
export interface IJsonDocString {
  content: string;
  content_type?: string;
  line: number;
}

/** Cucumber JSON data table row */
export interface IJsonTableRow {
  cells: string[];
}

/** Cucumber JSON data table (step argument) */
export interface IJsonDataTable {
  rows: IJsonTableRow[];
}

/** Cucumber JSON step argument */
export interface IJsonStepArgument {
  doc_string?: IJsonDocString;
  rows?: IJsonTableRow[];
}

/** Cucumber JSON embedding (attachment) */
export interface IJsonEmbedding {
  data: string;
  mime_type: string;
  name?: string;
}

/** Cucumber JSON step result */
export interface IJsonStepResult {
  /** Duration in nanoseconds */
  duration?: number;
  /** Error message if failed */
  error_message?: string;
  /** Status string */
  status: "passed" | "failed" | "skipped" | "pending" | "undefined" | "ambiguous";
}

/** Cucumber JSON step */
export interface IJsonStep {
  /** Step arguments (doc strings, data tables) */
  arguments?: IJsonStepArgument[];
  /** Embeddings (attachments) */
  embeddings?: IJsonEmbedding[];
  /** Step keyword with trailing space (e.g., "Given ") */
  keyword: string;
  /** Hidden step (background step, hook) */
  hidden?: boolean;
  /** Line number in feature file */
  line: number;
  /** Match info (step definition location) */
  match?: {
    location?: string;
  };
  /** Step name/text */
  name: string;
  /** Step result */
  result: IJsonStepResult;
}

/** Cucumber JSON scenario (element) */
export interface IJsonScenario {
  /** Scenario description */
  description: string;
  /** Scenario ID (slugified) */
  id: string;
  /** Scenario keyword */
  keyword: string;
  /** Line number in feature file */
  line: number;
  /** Scenario name */
  name: string;
  /** Scenario steps */
  steps: IJsonStep[];
  /** Scenario tags */
  tags: IJsonTag[];
  /** Element type (always "scenario" for us) */
  type: "scenario" | "background";
}

/** Cucumber JSON feature */
export interface IJsonFeature {
  /** Feature description */
  description: string;
  /** Feature elements (scenarios) */
  elements: IJsonScenario[];
  /** Feature ID (slugified) */
  id: string;
  /** Feature keyword */
  keyword: string;
  /** Line number (typically 1) */
  line: number;
  /** Feature name */
  name: string;
  /** Feature tags */
  tags: IJsonTag[];
  /** Feature file URI/path */
  uri: string;
}
