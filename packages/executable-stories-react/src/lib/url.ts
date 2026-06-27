/**
 * A URL is safe to put in the DOM (href/src/poster) only if it's relative (no
 * scheme) or uses http/https. Anything with another scheme — notably
 * `javascript:` (which runs in the page context), plus `data:` / `vbscript:` /
 * `file:` — is rejected. Report JSON carries adapter-supplied URLs, so every
 * report-sourced URL that reaches the DOM is treated as untrusted and passed
 * through here (DocHtml iframe src, DocVideo src/poster, …).
 */
export function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (scheme && !/^https?$/i.test(scheme[1] ?? "")) return undefined;
  return trimmed;
}
