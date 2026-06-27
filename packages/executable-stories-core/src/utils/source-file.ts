/**
 * Source-file helpers shared by the output router (index.ts) and the Astro
 * formatter (astro.ts). Kept in their own module to avoid an index ⇄ astro
 * import cycle.
 */

/** A story test file's clean stem, e.g. "tests/unit/convert-currency.story.test.ts" → "convert-currency". */
export function cleanTestStem(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  // Strip the test-framework extension chain (optional `.story`, then
  // test/spec/cy, then language ext), preserving meaningful infixes like `.msw`.
  const stripped = base.replace(/\.(story\.)?(test|spec|cy)\.[cm]?[jt]sx?$/i, "");
  if (stripped !== base) return stripped;
  return base.replace(/\.[^.]+$/, ""); // no test marker → drop the final extension only
}

/** A human, title-cased label from a source file, e.g. "convert-currency.story.test.ts" → "Convert Currency". */
export function humanizeSourceFile(fileName: string): string {
  return cleanTestStem(fileName)
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
