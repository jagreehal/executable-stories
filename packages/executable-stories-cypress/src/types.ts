/**
 * Shared types between browser (story-api) and Node (store, reporter).
 * No Cypress or Node-only imports so both environments can use them.
 */

// Import shared types for local use and re-export
import type {
  StepKeyword as _StepKeyword,
  StoryMeta as _StoryMeta,
} from 'executable-stories-formatters';

// Re-export shared types for convenience (type-only to keep browser-safe)
export type {
  StepKeyword,
  StepMode,
  DocPhase,
  DocEntry,
  StoryStep,
  StoryMeta,
  NormalizedTicket,
} from 'executable-stories-formatters';

// ============================================================================
// Ticket Input Types
// ============================================================================

/** A ticket reference: either a plain string ID or an object with id and optional url */
export type TicketInput = string | { id: string; url?: string };

// Local aliases for use within this file
type StoryMeta = _StoryMeta;

/** Scoped attachment stored in context. */
export interface ScopedAttachment {
  name: string;
  mediaType: string;
  path?: string;
  body?: string | Buffer;
  encoding?: 'BASE64' | 'IDENTITY';
  charset?: string;
  fileName?: string;
  stepIndex?: number;
  stepId?: string;
}

/** Payload sent from browser to Node via cy.task for the reporter to merge with run results */
export interface RecordMetaPayload {
  specRelative: string;
  titlePath: string[];
  meta: StoryMeta;
  attachments?: ScopedAttachment[];
  otelSpans?: ReadonlyArray<Record<string, unknown>>;
}

/** All inline doc options that can be passed to step markers. */
export interface StoryDocs {
  note?: string;
  tag?: string | string[];
  kv?: Record<string, unknown>;
  json?: JsonOptions;
  state?: StateOptions;
  table?: TableOptions;
  link?: LinkOptions;
  code?: CodeOptions;
  section?: SectionOptions;
  mermaid?: MermaidOptions;
  screenshot?: ScreenshotOptions;
  video?: VideoOptions;
  html?: HtmlOptions;
  custom?: CustomOptions;
}

/** Options for story.init(). */
export interface StoryOptions {
  tags?: string[];
  ticket?: TicketInput | TicketInput[];
  /** Product-code paths/globs this scenario exercises (project-root-relative). */
  covers?: string[];
  meta?: Record<string, unknown>;
  traceUrlTemplate?: string;
}

/** Options for story.attach(). */
export interface AttachmentOptions {
  name: string;
  mediaType: string;
  path?: string;
  body?: string | Buffer;
}

export interface KvOptions {
  label: string;
  value: unknown;
}

export interface JsonOptions {
  label: string;
  value: unknown;
}

export interface StateOptions {
  /** Optional snapshot name. Consecutive states with the same label are diffed downstream. */
  label?: string;
  /** JSON-serializable snapshot of the world at this step. */
  value: unknown;
}

export interface CodeOptions {
  label: string;
  content: string;
  lang?: string;
}

export interface TableOptions {
  label: string;
  columns: string[];
  rows: string[][];
}

export interface LinkOptions {
  label: string;
  url: string;
}

export interface SectionOptions {
  title: string;
  markdown: string;
}

export interface MermaidOptions {
  code: string;
  title?: string;
}

export interface ScreenshotOptions {
  path: string;
  alt?: string;
}

export interface VideoOptions {
  path: string;
  caption?: string;
  poster?: string;
}

/** Options for html() - HTML embedded in a sandboxed iframe. Exactly one of path/url/content. */
export interface HtmlOptions {
  /** Local HTML file path (inlined into the report by default) */
  path?: string;
  /** Remote URL rendered via iframe src */
  url?: string;
  /** Inline HTML content rendered via iframe srcdoc */
  content?: string;
  title?: string;
  /** Iframe height: number → px, string passed through (e.g. '60vh'). Default 400px. */
  height?: number | string;
}

export interface CustomOptions {
  type: string;
  data: unknown;
}
