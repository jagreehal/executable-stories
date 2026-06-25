/**
 * Scan generated HTML for local asset references.
 *
 * Targets: src="..." on img/video/iframe, href="..." on a.attachment.
 * Skips: data: URIs, http/https URLs, empty strings, fragment-only refs.
 * Returns deduplicated list of local path strings.
 */
export function scanHtmlAssets(html: string): string[] {
  const seen = new Set<string>();

  // Strip <script> and <style> blocks before matching: an interactive report
  // inlines the hydration island (minified JS) and the report JSON, both of
  // which contain src=-like text (e.g. `src="${e}"`) that is code/data, not a
  // real element. The actual <img>/<video> elements live in the markup outside
  // these blocks; the embedded JSON is rewritten separately in bundle-assets.
  const scannable = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

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
    while ((match = pattern.exec(scannable)) !== null) {
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
