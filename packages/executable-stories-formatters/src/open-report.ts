/**
 * Open a generated report in the default browser (`--open`).
 *
 * Uses the platform opener directly rather than a dependency: one spawn, no
 * package. Detached and unref'd so the CLI can exit immediately without
 * waiting on the browser, and failures are reported but never fatal — the
 * report was written successfully either way, which is the part that matters.
 */
import { spawn } from "node:child_process";
import path from "node:path";

/** The platform command that opens a file with its default application. */
export function openCommand(platform: NodeJS.Platform): { command: string; args: string[] } {
  if (platform === "darwin") return { command: "open", args: [] };
  if (platform === "win32") return { command: "cmd", args: ["/c", "start", ""] };
  return { command: "xdg-open", args: [] };
}

/** Pick the file `--open` should show: the HTML report if one was written. */
export function pickOpenTarget(files: string[]): string | undefined {
  return files.find((f) => f.endsWith(".html"));
}

/**
 * Open `file` in the default browser. Returns false (with a warning on stderr)
 * when there is nothing openable or the opener could not be spawned.
 */
export function openInBrowser(file: string | undefined, platform: NodeJS.Platform = process.platform): boolean {
  if (!file) {
    console.error("--open: no HTML report was generated (add html to --format).");
    return false;
  }
  const { command, args } = openCommand(platform);
  try {
    const child = spawn(command, [...args, path.resolve(file)], { stdio: "ignore", detached: true });
    child.on("error", (err) => {
      console.error(`--open: could not open ${file}: ${err.message}`);
    });
    child.unref();
    return true;
  } catch (err) {
    console.error(`--open: could not open ${file}: ${(err as Error).message}`);
    return false;
  }
}
