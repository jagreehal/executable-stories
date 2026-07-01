/**
 * Type definitions for executable-stories-playwright.
 *
 * Shared story types are re-exported from the formatters package.
 * Playwright-specific types are defined here.
 */

import type { Page } from '@playwright/test';

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
  /**
   * Path to an already-captured screenshot file. Required unless `page` is
   * given. If both are given, the fresh capture is also written to this path
   * (same as passing `path` to `page.screenshot()` directly).
   */
  path?: string;
  alt?: string;
  /**
   * Capture the screenshot directly instead of reading an existing file —
   * pass the `page` fixture and story.screenshot() takes the screenshot
   * itself. This removes the most common cause of a broken/"unavailable"
   * screenshot in reports: a `page.screenshot({ path })` call that was
   * forgotten, mistyped, or drifted out of sync with the `path` passed here.
   * Only supported on the top-level `story.screenshot()` call, not inside
   * inline step docs (`story.then(text, { screenshot: {...} })`), since those
   * run synchronously.
   */
  page?: Page;
  /** Forwarded to `page.screenshot()` when `page` is provided. Defaults to `true`. */
  fullPage?: boolean;
}

export interface VideoOptions {
  /** Path to the video file, relative to the report output (or an http(s) URL). */
  path: string;
  /** Caption shown beneath the player. */
  caption?: string;
  /** Path to a poster image shown before playback. */
  poster?: string;
}

export interface CustomOptions {
  type: string;
  data: unknown;
}

/** Options for html() - HTML embedded in a sandboxed iframe. Exactly one of path/url/content. */
export interface HtmlOptions {
  /** Local HTML file path (inlined into the report by default). */
  path?: string;
  /** Remote URL rendered via iframe src. */
  url?: string;
  /** Inline HTML content rendered via iframe srcdoc. */
  content?: string;
  title?: string;
  /** Iframe height: number → px, string passed through (e.g. '60vh'). Default 400px. */
  height?: number | string;
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
  /** URL template for OTel trace links. Uses {traceId} placeholder. Also settable via OTEL_TRACE_URL_TEMPLATE env var. */
  traceUrlTemplate?: string;
  /** Playwright fixtures (first argument of the test callback). When set, step callbacks receive this as their first argument. */
  fixtures?: unknown;
  /**
   * Auto-promote the Playwright screen recording (requires `video: "on"` in the
   * Playwright config) into a featured inline video doc entry. The reporter
   * surfaces the recorded `.webm` so the scenario shows a playable walkthrough
   * with no per-test `story.video()` call.
   */
  featureVideo?: boolean;
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
