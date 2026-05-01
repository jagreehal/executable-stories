import * as path from "node:path";

import { buildDemo, initDemo, previewDemo } from "./index";

interface ParsedArgs {
  command?: string;
  rest: string[];
  flags: Map<string, string | boolean>;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  switch (parsed.command) {
    case "init": {
      const target = parsed.rest[0] ?? "demo-site";
      const result = initDemo({
        targetDir: target,
        force: Boolean(parsed.flags.get("force")),
        productName: getStringFlag(parsed.flags, "product-name"),
      });
      console.log(`Demo site initialized at ${result.targetDir}`);
      console.log(`Config created at ${result.configPath}`);
      return;
    }

    case "build": {
      const input = getStringFlag(parsed.flags, "input");
      const site = getStringFlag(parsed.flags, "site");

      if (!input || !site) {
        throw new Error("build requires --input <run.json> and --site <site-dir>");
      }

      const result = await buildDemo({
        input,
        siteDir: site,
        configPath: getStringFlag(parsed.flags, "config"),
        allowMissingAssets: parseBooleanFlag(parsed.flags, "allow-missing-assets"),
        assetsBaseUrl: getStringFlag(parsed.flags, "assets-base-url"),
        assetsDir: getStringFlag(parsed.flags, "assets-dir"),
        strict: parseBooleanFlag(parsed.flags, "strict"),
      });

      console.log(`Generated ${result.pages.length} page(s)`);
      console.log(`Stories: ${path.resolve(result.storiesDir)}`);
      console.log(`Manifest: ${path.resolve(result.manifestPath)}`);
      return;
    }

    case "preview": {
      const site = getStringFlag(parsed.flags, "site");
      if (!site) {
        throw new Error("preview requires --site <site-dir>");
      }

      const mode = getStringFlag(parsed.flags, "mode");
      if (mode && mode !== "dev" && mode !== "preview" && mode !== "build") {
        throw new Error("--mode must be one of: dev, preview, build");
      }

      previewDemo({
        siteDir: site,
        mode: mode as "dev" | "preview" | "build" | undefined,
      });
      return;
    }

    case "help":
    case "--help":
    case "-h":
    default:
      printHelp();
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...restRaw] = argv;
  const rest: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < restRaw.length; i++) {
    const part = restRaw[i];

    if (!part.startsWith("--")) {
      rest.push(part);
      continue;
    }

    const key = part.slice(2);
    const next = restRaw[i + 1];

    if (!next || next.startsWith("--")) {
      flags.set(key, true);
      continue;
    }

    flags.set(key, next);
    i += 1;
  }

  return { command, rest, flags };
}

function getStringFlag(flags: Map<string, string | boolean>, key: string): string | undefined {
  const value = flags.get(key);
  return typeof value === "string" ? value : undefined;
}

function parseBooleanFlag(
  flags: Map<string, string | boolean>,
  key: string,
): boolean | undefined {
  const value = flags.get(key);
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;

  throw new Error(`--${key} expects a boolean value (true/false)`);
}

function printHelp(): void {
  console.log(
    `executable-stories-demo\n\nCommands:\n  init [dir] [--force] [--product-name <name>]\n  build --input <run.json> --site <site-dir> [--config <demo.config.json>] [--allow-missing-assets <true|false>] [--assets-base-url <url>] [--assets-dir <path>] [--strict]\n  preview --site <site-dir> [--mode dev|preview|build]`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
