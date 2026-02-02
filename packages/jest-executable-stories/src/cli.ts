#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";

type CollateOptions = {
  outFile: string;
  patterns: string[];
  format: "json" | "md" | "auto";
};

function parseArgs(argv: string[]): { command: string | null; options: CollateOptions } {
  const options: CollateOptions = {
    outFile: "docs/story-index.json",
    patterns: [],
    format: "auto",
  };
  const args = [...argv];
  const command = args.shift() ?? null;

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) break;
    if (arg === "--config" && args[0]) {
      const configPath = args.shift()!;
      applyConfig(options, configPath);
      continue;
    }
    if (arg === "--out" && args[0]) {
      options.outFile = args.shift()!;
    } else if (arg === "--glob" && args[0]) {
      options.patterns.push(args.shift()!);
    } else if (arg === "--format" && args[0]) {
      options.format = parseFormat(args.shift()!);
    } else if (arg.startsWith("--glob=")) {
      options.patterns.push(arg.slice("--glob=".length));
    } else if (arg.startsWith("--format=")) {
      options.format = parseFormat(arg.slice("--format=".length));
    } else if (!arg.startsWith("--")) {
      options.patterns.push(arg);
    }
  }

  return { command, options };
}

function collateJsonReports(options: CollateOptions): number {
  const patterns = options.patterns.length > 0 ? options.patterns : ["**/*.json"];
  const files = fg.sync(patterns, { dot: false, onlyFiles: true });
  const reports: Array<Record<string, unknown>> = [];
  const scenarios: Array<Record<string, unknown>> = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw) as { meta?: Record<string, unknown>; scenarios?: unknown[] };
      const parsedScenarios = Array.isArray(parsed.scenarios) ? parsed.scenarios : [];
      if (!parsed.meta && parsedScenarios.length === 0) continue;

      const report = {
        path: file,
        meta: parsed.meta ?? {},
      };
      reports.push(report);
      for (const scenario of parsedScenarios) {
        scenarios.push({
          ...((scenario as Record<string, unknown>) ?? {}),
          reportPath: file,
        });
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    reports,
    scenarios,
  };

  const outFile = path.resolve(process.cwd(), options.outFile);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", "utf8");
  return 0;
}

function collateMarkdownReports(options: CollateOptions): number {
  const patterns = options.patterns.length > 0 ? options.patterns : ["**/*.md"];
  const files = fg.sync(patterns, { dot: false, onlyFiles: true });
  const reports: Array<Record<string, unknown>> = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const meta = extractFrontMatter(raw);
      if (!meta) continue;
      reports.push({ path: file, meta });
    } catch {
      // Ignore unreadable files
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    reports,
    scenarios: [],
  };

  const outFile = path.resolve(process.cwd(), options.outFile);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", "utf8");
  return 0;
}

function extractFrontMatter(markdown: string): Record<string, unknown> | null {
  if (!markdown.startsWith("---")) return null;
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return null;
  const raw = markdown.slice(3, end).trim();
  if (!raw) return null;
  return parseYaml(raw);
}

function parseYaml(raw: string): Record<string, unknown> {
  const lines = raw.split("\n");
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [{ indent: -1, obj: root }];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const trimmed = line.trim();
    const _current = stack[stack.length - 1];
    if (trimmed.startsWith("- ")) {
      // Arrays are not used in our front-matter; ignore for now
      continue;
    }
    const [key, ...rest] = trimmed.split(":");
    const valueRaw = rest.join(":").trim();
    const value = valueRaw === "" ? {} : parseYamlValue(valueRaw);
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const target = stack[stack.length - 1].obj;
    if (valueRaw === "") {
      const nested: Record<string, unknown> = {};
      target[key] = nested;
      stack.push({ indent, obj: nested });
    } else {
      target[key] = value;
    }
  }

  return root;
}

function parseYamlValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  const num = Number(value);
  if (!Number.isNaN(num) && value !== "") return num;
  return value;
}

function applyConfig(options: CollateOptions, configPath: string): void {
  const fullPath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(fullPath)) return;
  const raw = fs.readFileSync(fullPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<CollateOptions>;
  if (parsed.outFile) options.outFile = parsed.outFile;
  if (parsed.patterns) options.patterns.push(...parsed.patterns);
  if (parsed.format) options.format = parseFormat(parsed.format);
}

function parseFormat(value: string): "json" | "md" | "auto" {
  if (value === "json" || value === "md" || value === "auto") return value;
  return "auto";
}

const { command, options } = parseArgs(process.argv.slice(2));

if (!command || command === "help" || command === "--help" || command === "-h") {
  console.log("jest-executable-stories collate --glob \"**/*.json\" --out docs/story-index.json");
  console.log("jest-executable-stories collate --format md --glob \"**/*.md\" --out docs/story-index.json");
  process.exit(0);
}

if (command === "collate") {
  if (options.format === "md") {
    process.exit(collateMarkdownReports(options));
  }
  if (options.format === "json") {
    process.exit(collateJsonReports(options));
  }
  // auto
  const patterns = options.patterns.length > 0 ? options.patterns : ["**/*.json"];
  if (patterns.some((p) => p.endsWith(".md"))) {
    process.exit(collateMarkdownReports(options));
  }
  process.exit(collateJsonReports(options));
}

console.error(`Unknown command: ${command}`);
process.exit(1);
