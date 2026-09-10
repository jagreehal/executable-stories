/**
 * Where a markdown report points at media, and how to repoint it.
 *
 * One module because finding a reference and rewriting it must use the same
 * definition of what a reference is. Two copies drift, and the failure is
 * silent: the collector uploads a file the rewriter never swaps in, so the
 * comment shows a broken image and the branch grows an orphan blob.
 */

/**
 * Every shape a report writes media in:
 *   ![alt](src)                     screenshots, and a video the markdown
 *                                   formatter degraded to an image
 *   <source src="…">                the markdown formatter's video player
 *   <video src="…">                 the HTML formatter's
 *
 * Group 1 is the alt text, group 2 the markdown src, group 3 the tag src.
 */
const MEDIA_REF =
  /!\[([^\]]*)\]\(([^)\s]+)\)|<(?:video|source)\b[^>]*?\ssrc="([^"]+)"/g;

/** Every distinct media reference, in document order. */
export function findReferences(markdown) {
  const refs = new Map(); // ref -> { alt }
  for (const match of markdown.matchAll(MEDIA_REF)) {
    const ref = match[2] ?? match[3];
    if (ref && !refs.has(ref)) {
      refs.set(ref, { alt: match[2] ? (match[1] ?? "") : "" });
    }
  }
  return refs;
}

/**
 * Point every reference in `urlByRef` at its new URL, in a single pass.
 *
 * Deliberately not a sequence of string replacements. Replacing refs one at a
 * time rewrites text an earlier replacement inserted: with `assets/a.png` and
 * `a.png` both hosted, swapping the long one first produces a URL that still
 * ends in `a.png`, and swapping the short one then corrupts it into
 * `https://…/002-https://…/001-a.png`. Ordering does not save you — the shorter
 * ref appears *inside* the substituted URL, not merely before it. Matching
 * reference positions once, and substituting only within each match, cannot
 * cascade however the refs overlap.
 */
export function rewriteReferences(markdown, urlByRef) {
  if (!urlByRef || Object.keys(urlByRef).length === 0) return markdown;

  return markdown.replace(MEDIA_REF, (match, alt, mdSrc, tagSrc) => {
    const ref = mdSrc ?? tagSrc;
    const url = urlByRef[ref];
    if (!url) return match;
    return mdSrc !== undefined
      ? `![${alt ?? ""}](${url})`
      : match.replace(`src="${tagSrc}"`, `src="${url}"`);
  });
}
