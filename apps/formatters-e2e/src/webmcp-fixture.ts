import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test as base, type Page } from "@playwright/test";
import { ReportGenerator } from "executable-stories-formatters";
import type { TestRunResult } from "executable-stories-formatters";

/**
 * A `document.modelContext` test double, installed before any page script runs.
 *
 * Chrome ships WebMCP behind a flag, so the everyday suite has no browser API to
 * drive. This stands in for one, reproducing the behaviours measured against
 * Chrome 152 that catch people out:
 *
 *   1. `getTools()` sorts by name, ignoring registration order.
 *   2. A descriptor's `inputSchema` comes back as a JSON string, not an object.
 *   3. `executeTool()` takes a JSON *string*; an object rejects.
 *   4. A duplicate name throws `InvalidStateError`.
 *   5. A handler that throws *rejects* with a generic `UnknownError`. It does
 *      not resolve with the message.
 *   6. A handler returning `undefined` resolves with the string "undefined".
 *
 * `webmcp-native.contract.ts` drives real Chrome with the flags on, and is what
 * proves this copy still matches. Keep the two in step.
 */
export const installWebMcpShim = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const registry = new Map<
      string,
      { definition: Record<string, unknown>; execute: (input: unknown) => unknown }
    >();

    const fail = (name: string, message: string): never => {
      const error = new Error(message);
      error.name = name;
      throw error;
    };

    const descriptor = (name: string) => {
      const { definition } = registry.get(name)!;
      return {
        name,
        description: definition["description"] as string,
        // The browser hands back a serialised schema, not the object you passed.
        inputSchema: JSON.stringify(definition["inputSchema"] ?? { type: "object" }),
        title: (definition["title"] as string) ?? "",
        annotations: definition["annotations"] ?? {},
      };
    };

    const modelContext = {
      async registerTool(
        tool: Record<string, unknown>,
        options?: { signal?: AbortSignal },
      ) {
        const name = tool["name"] as string;
        if (typeof name !== "string" || name === "" || /\s/.test(name)) {
          fail("InvalidStateError", `Invalid tool name: ${String(name)}`);
        }
        if (typeof tool["description"] !== "string" || tool["description"] === "") {
          fail("InvalidStateError", "A tool needs a non-empty description");
        }
        if (typeof tool["execute"] !== "function") {
          throw new TypeError("execute must be a function");
        }
        if (registry.has(name)) fail("InvalidStateError", `Duplicate tool name: ${name}`);

        registry.set(name, {
          definition: tool,
          execute: tool["execute"] as (input: unknown) => unknown,
        });
        // An AbortSignal owns the registration — how a component drops its
        // tools on unmount.
        options?.signal?.addEventListener("abort", () => {
          registry.delete(name);
        });
      },

      async getTools() {
        return [...registry.keys()].sort().map((name) => descriptor(name));
      },

      async executeTool(tool: { name: string }, inputJson: string) {
        const entry = registry.get(tool?.name);
        if (!entry) fail("NotFoundError", `No such tool: ${tool?.name}`);
        if (typeof inputJson !== "string") {
          fail("UnknownError", "Failed to parse input arguments");
        }
        let input: unknown;
        try {
          input = JSON.parse(inputJson);
        } catch {
          fail("UnknownError", "Failed to parse input arguments");
        }
        let result: unknown;
        try {
          result = await entry!.execute(input);
        } catch {
          // The browser rejects. It does not hand the agent the message.
          fail(
            "UnknownError",
            "Tool was executed but the invocation failed. For example, the script function threw an error",
          );
        }
        // Everything reaches the agent as text, `undefined` included.
        return typeof result === "string" ? result : String(JSON.stringify(result));
      },
    };

    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: modelContext,
    });
  });
};

/**
 * Render the real `--format html` artifact and load it.
 *
 * Deliberately the generator, not a hand-assembled document: the thing under
 * test is the shipped file, island bundle and all. A tool that registers in
 * jsdom but not from the inlined IIFE is exactly the failure this catches.
 */
export async function loadStoryReport(page: Page, run: TestRunResult): Promise<void> {
  // The generator writes files and returns their paths, so the report is read
  // back off disk — the artifact exactly as a CI job would publish it, not a
  // string assembled a second way for the test's convenience.
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "es-webmcp-"));
  let html: string;
  try {
    html = await renderToDisk(run, outputDir);
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
  // Route interception rather than setContent(): the report needs a real origin
  // for localStorage and for the URL fragment it keeps its view state in.
  await page.route("https://report.test/", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("https://report.test/", { waitUntil: "domcontentloaded" });
}

async function renderToDisk(run: TestRunResult, outputDir: string): Promise<string> {
  const outputs = await new ReportGenerator({ formats: ["html"], outputDir }).generate(run);
  const written = outputs.get("html")?.[0];
  if (!written) throw new Error("the html formatter produced no output");
  return fs.readFile(written, "utf8");
}

/** Call a tool the way an agent does, and parse what comes back. */
export async function callTool(
  page: Page,
  name: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const raw = await callToolRaw(page, name, args);
  return JSON.parse(raw) as Record<string, unknown>;
}

/** For the paths that answer with a plain message rather than a JSON payload. */
export async function callToolRaw(
  page: Page,
  name: string,
  args: Record<string, unknown> = {},
): Promise<string> {
  return page.evaluate(
    async ([toolName, json]) => {
      const tools = await document.modelContext!.getTools();
      const tool = tools.find((t: { name: string }) => t.name === toolName);
      if (!tool) throw new Error(`tool not registered: ${toolName}`);
      return document.modelContext!.executeTool(tool, json!);
    },
    [name, JSON.stringify(args)] as const,
  );
}

export async function toolNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const tools = await document.modelContext!.getTools();
    return tools.map((t: { name: string }) => t.name);
  });
}

/** `page` arrives with the shim already installed. */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await installWebMcpShim(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
