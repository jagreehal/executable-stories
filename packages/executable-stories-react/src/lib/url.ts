/**
 * URL trust boundary for report-sourced strings reaching the DOM. The
 * implementation lives in executable-stories-core/utils/url (shared with the
 * Astro state-catalog thumbnails); this module stays as the package-local
 * import point. Subpath import: the core package root pulls in Node-only
 * converters, which breaks browser bundles.
 */
export { safeUrl, safeImageUrl, isLocalFsPath } from "executable-stories-core/utils/url";
