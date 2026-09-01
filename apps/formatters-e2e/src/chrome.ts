import { existsSync } from "node:fs";

/**
 * Chrome's WebMCP implementation sits behind flags, and Playwright's bundled
 * Chromium does not carry it at all. Only the native lane
 * (`webmcp-native.contract.ts`) needs this.
 */
export const CHROME_FLAGS = [
  "--enable-experimental-web-platform-features",
  "--enable-features=WebMCPTesting,DevToolsWebMCPSupport",
];

const CANDIDATES = [
  process.env["CHROME_BIN"],
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome-unstable",
  "/usr/bin/google-chrome",
];

/**
 * Resolve the browser, or explain what to install.
 *
 * Leaving `executablePath` undefined makes Playwright quietly fall back to
 * bundled Chromium, and the run then fails as a missing *API* rather than a
 * missing *browser*. Say which it is, at config load, before anything runs.
 */
export function requireChrome(): string {
  const found = CANDIDATES.find((p): p is string => !!p && existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome found for the WebMCP native lane. Install Google Chrome Canary, " +
        "or point CHROME_BIN at a Chrome that ships WebMCP.",
    );
  }
  return found;
}
