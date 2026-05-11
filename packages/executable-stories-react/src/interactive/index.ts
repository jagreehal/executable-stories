/**
 * Client-only entry. Importing this module pulls in everything that uses
 * useState/useEffect; the package.json export points Next.js at a bundle
 * with a "use client" directive at the top so the App Router treats it
 * correctly.
 */

export { ReportInteractive } from "./ReportInteractive";
export type { ReportInteractiveProps } from "./ReportInteractive";
export { ReportSearch } from "./ReportSearch";
export type { ReportSearchProps } from "./ReportSearch";
export { ReportFailureBanner } from "./ReportFailureBanner";
export type { ReportFailureBannerProps } from "./ReportFailureBanner";
export { ReportShortcutsHelp } from "./ReportShortcutsHelp";
export type { ReportShortcutsHelpProps } from "./ReportShortcutsHelp";
export { filterReport, listFailures, normalizeQuery } from "./filter";
export type { FailureRef } from "./filter";
export { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
export type { KeyboardShortcutHandlers } from "./use-keyboard-shortcuts";
export { useDeepLinkScroll } from "./use-deep-link-scroll";
