/**
 * Story types — the shared vocabulary for all framework adapters.
 *
 * These types were previously in executable-stories-core.
 * They now live in formatters so every adapter can import them
 * from the same place that defines RawRun (the output contract).
 */

// ============================================================================
// Step Keywords
// ============================================================================

/** BDD step keywords for scenario documentation */
export type StepKeyword = "Given" | "When" | "Then" | "And" | "But";

/** Step execution mode for docs rendering */
export type StepMode = "normal" | "skip" | "only" | "todo" | "fails" | "concurrent";

// ============================================================================
// Doc Entry Types
// ============================================================================

/** Phase tracks when the doc entry was added */
export type DocPhase = "static" | "runtime";

/** Union type for all documentation entry kinds */
export type DocEntry =
  | { kind: "note"; text: string; phase: DocPhase }
  | { kind: "tag"; names: string[]; phase: DocPhase }
  | { kind: "kv"; label: string; value: unknown; phase: DocPhase }
  | { kind: "code"; label: string; content: string; lang?: string; phase: DocPhase }
  | { kind: "table"; label: string; columns: string[]; rows: string[][]; phase: DocPhase }
  | { kind: "link"; label: string; url: string; phase: DocPhase }
  | { kind: "section"; title: string; markdown: string; phase: DocPhase }
  | { kind: "mermaid"; code: string; title?: string; phase: DocPhase }
  | { kind: "screenshot"; path: string; alt?: string; phase: DocPhase }
  | { kind: "custom"; type: string; data: unknown; phase: DocPhase };

// ============================================================================
// Story Step
// ============================================================================

/**
 * A single step in a scenario with its documentation entries.
 */
export interface StoryStep {
  /** Stable internal ID (auto-generated at creation, e.g., "step-0") */
  id?: string;
  /** The BDD keyword (Given, When, Then, And, But) */
  keyword: StepKeyword;
  /** The step description text */
  text: string;
  /** Step execution mode for docs rendering */
  mode?: StepMode;
  /** Rich documentation entries attached to this step */
  docs?: DocEntry[];
  /** Opt-in step duration in milliseconds */
  durationMs?: number;
  /** Whether this step wrapped a function body (step.fn / step.step) vs a text marker */
  wrapped?: boolean;
}

// ============================================================================
// Story Metadata
// ============================================================================

/**
 * Metadata for a complete scenario, attached to test metadata.
 * Used by reporters to generate documentation.
 */
export interface StoryMeta {
  /** The scenario title (from test name) */
  scenario: string;
  /** All steps in this scenario */
  steps: StoryStep[];
  /** Tags for filtering and categorization */
  tags?: string[];
  /** Ticket/issue references (normalized to array) */
  tickets?: string[];
  /** User-defined metadata */
  meta?: Record<string, unknown>;
  /** Parent describe/suite names for hierarchical grouping */
  suitePath?: string[];
  /** Story-level docs (before any steps) */
  docs?: DocEntry[];
  /** Order in which story.init() was called (for source ordering) */
  sourceOrder?: number;
}

/** Key used to store StoryMeta in test metadata */
export const STORY_META_KEY = "story";
