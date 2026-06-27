import type { ReactNode } from "react";

/**
 * Highlight step parameters (double-quoted strings, standalone numbers) in step
 * text — the React equivalent of the report's highlightStepParams. Returns a
 * node array so the matched params can be wrapped in a styled <span> without
 * dangerouslySetInnerHTML.
 *
 * Regex mirrors the string renderer exactly:
 * - `"[^"]*"`  double-quoted strings (numbers inside quotes stay part of the string)
 * - `(?<![\w.-])\d+(?:\.\d+)?(?![\w.-])`  standalone numbers, dot/word-boundary aware
 */
const STEP_PARAM_PATTERN = /"[^"]*"|(?<![\w.-])\d+(?:\.\d+)?(?![\w.-])/g;

export function highlightStepParams(text: string): ReactNode {
  const matches = Array.from(text.matchAll(STEP_PARAM_PATTERN));
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  matches.forEach((match, i) => {
    const start = match.index;
    const end = start + match[0].length;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    nodes.push(
      <span key={i} className="font-medium text-step-param italic">
        {match[0]}
      </span>,
    );
    lastIndex = end;
  });
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
