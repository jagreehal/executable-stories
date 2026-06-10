/**
 * Scan generated HTML for local asset references.
 *
 * Targets: src="..." on img/video/iframe, href="..." on a.attachment.
 * Skips: data: URIs, http/https URLs, empty strings, fragment-only refs.
 * Returns deduplicated list of local path strings.
 */
export function scanHtmlAssets(html: string): string[] {
  const seen = new Set<string>();

  // Only match src="..." on <img>, <video>, and <iframe> elements, and
  // href="..." on <a class="attachment"> elements.
  // This avoids treating ordinary doc links as bundleable assets.
  const patterns: RegExp[] = [
    /<(?:img|video|iframe)\b[^>]*?\bsrc=["']([^"']+)["']/g,
    /<a\b[^>]*?\bclass=["']attachment["'][^>]*?\bhref=["']([^"']+)["']/g,
    /<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*?\bclass=["']attachment["']/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const ref = match[1];
      if (isLocalAssetRef(ref) && !seen.has(ref)) {
        seen.add(ref);
      }
    }
  }

  return [...seen];
}

function isLocalAssetRef(ref: string): boolean {
  if (!ref) return false;
  if (ref.startsWith("data:")) return false;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return false;
  if (ref.startsWith("#")) return false;
  return true;
}
