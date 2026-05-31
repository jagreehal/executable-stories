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
  NormalizedTicket,
} from 'executable-stories-formatters';

export { STORY_META_KEY } from 'executable-stories-formatters';

// ============================================================================
// Ticket Input Types
// ============================================================================

/** A ticket reference: either a plain string ID or an object with id and optional url */
export type TicketInput = string | { id: string; url?: string };

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
  ticket?: TicketInput | TicketInput[];
  /** Product-code paths/globs this scenario exercises (project-root-relative). */
  covers?: string[];
  meta?: Record<string, unknown>;
  /** URL template for OTel trace links. Uses {traceId} placeholder. Also settable via OTEL_TRACE_URL_TEMPLATE env var. */
  traceUrlTemplate?: string;
  /** Playwright fixtures (first argument of the test callback). When set, step callbacks receive this as their first argument. */
  fixtures?: unknown;
}

/** Options for story.console() – captures page console messages as a doc entry. */
export interface ConsoleOptions {
  /** The Playwright Page object (typed as unknown to avoid importing Page here). */
  page: unknown;
  /** Label shown above the console output block. Defaults to "Console". */
  label?: string;
  /** Also capture page errors (uncaught exceptions). Defaults to false. */
  includeErrors?: boolean;
}

/** Options for story.observePageErrors() */
export interface ObservePageErrorsOptions {
  /**
   * The Playwright Page object. Typed as `unknown` to avoid importing
   * `@playwright/test` from this types module; requires Playwright >= 1.56
   * for `page.pageErrors()` and `page.consoleMessages()`.
   */
  page: unknown;
  /** Label shown in docs. Defaults to "Browser Runtime Errors". */
  label?: string;
  /** Regexes for messages to suppress (known non-actionable noise). */
  ignore?: RegExp[];
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
