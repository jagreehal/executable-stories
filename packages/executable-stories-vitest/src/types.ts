/**
 * Type definitions for executable-stories-vitest.
 *
 * Shared story types (StepKeyword, DocEntry, StoryStep, StoryMeta, etc.)
 * are imported from executable-stories-formatters — the single source of truth.
 * This module re-exports them and adds Vitest-specific types.
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
// Vitest-specific Types
// ============================================================================

/**
 * Inline documentation options for step markers.
 * Pass to story.given(), story.when(), story.then() as second argument.
 *
 * @example
 * ```ts
 * story.given('valid credentials', {
 *   json: { label: 'Credentials', value: { email: 'test@example.com', password: '***' } },
 *   note: 'Password is masked for security'
 * });
 * ```
 */
export interface StoryDocs {
  /** Add a free-text note */
  note?: string;
  /** Add tag(s) for categorization */
  tag?: string | string[];
  /** Add key-value pairs */
  kv?: Record<string, unknown>;
  /** Add a code block with label and optional language */
  code?: { label: string; content: string; lang?: string };
  /** Add a JSON data block with label */
  json?: { label: string; value: unknown };
  /** Add a markdown table with label */
  table?: { label: string; columns: string[]; rows: string[][] };
  /** Add a hyperlink */
  link?: { label: string; url: string };
  /** Add a titled section with markdown content */
  section?: { title: string; markdown: string };
  /** Add a Mermaid diagram with optional title */
  mermaid?: { code: string; title?: string };
  /** Add a screenshot reference */
  screenshot?: { path: string; alt?: string };
  /** Add a custom documentation entry */
  custom?: { type: string; data: unknown };
}

/**
 * Options for configuring a story via story.init().
 *
 * @example
 * ```ts
 * it('admin deletes user', ({ task }) => {
 *   story.init(task, {
 *     tags: ['admin', 'destructive'],
 *     ticket: 'JIRA-456'
 *   });
 * });
 * ```
 */
export interface StoryOptions {
  /** Tags for filtering and categorizing stories */
  tags?: string[];
  /** Ticket/issue reference(s) for requirements traceability */
  ticket?: string | string[];
  /** Arbitrary user-defined metadata */
  meta?: Record<string, unknown>;
}

// ============================================================================
// Vitest Task Type (minimal interface)
// ============================================================================

/** Minimal Vitest suite interface for suite path extraction */
export interface VitestSuite {
  /** Suite name */
  name?: string;
  /** Parent suite (optional) */
  suite?: VitestSuite;
}

/**
 * Minimal Vitest task interface for story.init().
 * This is the { task } from it('name', ({ task }) => { ... }).
 *
 * Uses generic type parameter to be compatible with Vitest's actual TaskMeta type.
 */
export interface VitestTask<TMeta = Record<string, unknown>> {
  /** The test/task name */
  name: string;
  /** Task metadata object where we store story data */
  meta: TMeta;
  /** Parent suite (optional) */
  suite?: VitestSuite;
  /** The test file (optional) */
  file?: { name?: string };
}
