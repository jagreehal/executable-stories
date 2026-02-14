/**
 * Type definitions for executable-stories-jest.
 *
 * Shared story types are imported from executable-stories-formatters.
 * This module re-exports them and adds Jest-specific types.
 */

// Re-export shared story types from formatters
export type {
  StepKeyword,
  StepMode,
  DocPhase,
  DocEntry,
  StoryStep,
  StoryMeta,
} from 'executable-stories-formatters';

export { STORY_META_KEY } from 'executable-stories-formatters';

// ============================================================================
// Doc Options (for inline docs and standalone methods)
// ============================================================================

/** Options for kv() - key-value pair */
export interface KvOptions {
  label: string;
  value: unknown;
}

/** Options for json() - JSON code block */
export interface JsonOptions {
  label: string;
  value: unknown;
}

/** Options for code() - code block with optional language */
export interface CodeOptions {
  label: string;
  content: string;
  lang?: string;
}

/** Options for table() - markdown table */
export interface TableOptions {
  label: string;
  columns: string[];
  rows: string[][];
}

/** Options for link() - hyperlink */
export interface LinkOptions {
  label: string;
  url: string;
}

/** Options for section() - titled markdown section */
export interface SectionOptions {
  title: string;
  markdown: string;
}

/** Options for mermaid() - Mermaid diagram */
export interface MermaidOptions {
  code: string;
  title?: string;
}

/** Options for screenshot() - screenshot reference */
export interface ScreenshotOptions {
  path: string;
  alt?: string;
}

/** Options for custom() - custom doc entry */
export interface CustomOptions {
  type: string;
  data: unknown;
}

// ============================================================================
// Inline Docs for Steps
// ============================================================================

/**
 * Inline documentation options for step markers.
 * Pass to story.given(), story.when(), story.then() as second argument.
 */
export interface StoryDocs {
  note?: string;
  tag?: string | string[];
  kv?: Record<string, unknown>;
  code?: CodeOptions;
  json?: JsonOptions;
  table?: TableOptions;
  link?: LinkOptions;
  section?: SectionOptions;
  mermaid?: MermaidOptions;
  screenshot?: ScreenshotOptions;
  custom?: CustomOptions;
}

// ============================================================================
// Attachment Types
// ============================================================================

/** Options for attaching files or inline content to a test */
export interface AttachmentOptions {
  name: string;
  mediaType: string;
  path?: string;
  body?: string;
  encoding?: "BASE64" | "IDENTITY";
  charset?: string;
  fileName?: string;
}

/** Internal: attachment with step scope info */
export interface ScopedAttachment extends AttachmentOptions {
  stepIndex?: number;
  stepId?: string;
}

// ============================================================================
// Story Options
// ============================================================================

/**
 * Options for configuring a story via story.init().
 */
export interface StoryOptions {
  tags?: string[];
  ticket?: string | string[];
  meta?: Record<string, unknown>;
  /** URL template for OTel trace links. Uses {traceId} placeholder. Also settable via OTEL_TRACE_URL_TEMPLATE env var. */
  traceUrlTemplate?: string;
}
