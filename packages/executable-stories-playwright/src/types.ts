/**
 * Type definitions for executable-stories-playwright.
 *
 * Shared story types are re-exported from the formatters package.
 * Playwright-specific types are defined here.
 */

// ============================================================================
// Re-export shared story types from formatters
// ============================================================================

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
// Playwright-specific doc option types (for inline docs on steps)
// ============================================================================

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

// ============================================================================
// Playwright-specific types
// ============================================================================

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

/** A scoped attachment stored in context. */
export interface ScopedAttachment {
  name: string;
  mediaType: string;
  path?: string;
  body?: string | Buffer;
  stepId?: string;
}
