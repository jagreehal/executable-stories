/**
 * Renderer registries — extension points for custom rendering of doc entries.
 *
 * - customRenderers: keyed by user-defined `story.custom({ type })` strings.
 * - renderers: optional overrides for the three heavy built-ins
 *   (mermaid, code, section). Other doc kinds are not overridable — drop
 *   to primitives if you need a fully custom layout.
 */

import type { ReactNode } from "react";
import type {
  ReportDocCode,
  ReportDocCustom,
  ReportDocMermaid,
  ReportDocSection,
} from "executable-stories-formatters";

export type CustomRenderer = (entry: ReportDocCustom) => ReactNode;
export type CustomRenderers = Record<string, CustomRenderer>;

export interface BuiltinRenderers {
  mermaid?: (entry: ReportDocMermaid) => ReactNode;
  code?: (entry: ReportDocCode) => ReactNode;
  section?: (entry: ReportDocSection) => ReactNode;
}
