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
} from 'executable-stories-formatters';

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
}

/** All inline doc options that can be passed to step markers. */
export interface StoryDocs {
  note?: string;
  tag?: string | string[];
  kv?: Record<string, unknown>;
  json?: JsonOptions;
  table?: TableOptions;
  link?: LinkOptions;
  code?: CodeOptions;
  section?: SectionOptions;
  mermaid?: MermaidOptions;
  screenshot?: ScreenshotOptions;
  custom?: CustomOptions;
}

/** Options for story.init(). */
export interface StoryOptions {
  tags?: string[];
  ticket?: string | string[];
  meta?: Record<string, unknown>;
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

export interface CustomOptions {
  type: string;
  data: unknown;
}
