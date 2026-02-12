/**
 * Highlight step parameters (quoted strings, standalone numbers) in step text.
 * Pure function following fn(args, deps) pattern.
 */

export interface HighlightStepParamsDeps {
  escapeHtml: (str: string) => string;
}

/**
 * Regex matches:
 * - `"[^"]*"` — double-quoted strings (matched first, so numbers inside quotes are part of the string)
 * - `(?<![\w.])\d+(?:\.\d+)?(?![\w.])` — standalone numbers with dot-aware boundaries
 */
const STEP_PARAM_PATTERN = /"[^"]*"|(?<![\w.\-])\d+(?:\.\d+)?(?![\w.\-])/g;

export function highlightStepParams(
  text: string,
  deps: HighlightStepParamsDeps,
): string {
  const matches = Array.from(text.matchAll(STEP_PARAM_PATTERN));

  if (matches.length === 0) {
    return deps.escapeHtml(text);
  }

  let result = "";
  let lastIndex = 0;

  for (const match of matches) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Append escaped plain text before this match
    if (matchStart > lastIndex) {
      result += deps.escapeHtml(text.slice(lastIndex, matchStart));
    }

    // Wrap the matched param in a span (also escape its content)
    result += `<span class="step-param">${deps.escapeHtml(match[0])}</span>`;

    lastIndex = matchEnd;
  }

  // Append any remaining plain text after the last match
  if (lastIndex < text.length) {
    result += deps.escapeHtml(text.slice(lastIndex));
  }

  return result;
}
