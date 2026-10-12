import { createInterface } from 'node:readline';
import { type Json, parseJson } from 'executable-stories-showcase';
import { z } from 'zod';
import { CliError } from './errors.js';

export type Content = { type: 'text'; text: string; } | { type: 'image'; data: string; mimeType: string; };

export interface McpTool {
  name: string;
  description: string;
  inputSchema: z.core.JSONSchema.BaseSchema;
  call(args: Json): Promise<Content[]>;
}

/** Define a tool whose arguments are checked against `input` before `run` sees them. */
export function tool<S extends z.ZodObject>(
  def: { name: string; description: string; input: S; run(args: z.output<S>): Promise<Content[]>; },
): McpTool {
  return {
    name: def.name,
    description: def.description,
    inputSchema: z.toJSONSchema(def.input, { io: 'input' }),
    call: async (args) => def.run(def.input.parse(args)),
  };
}

const Message = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.looseObject({}).optional(),
});

const CallParams = z.object({ name: z.string(), arguments: z.json().optional() });

const ok = <T>(id: string | number, result: T) => ({ jsonrpc: '2.0', id, result });

/**
 * Minimal MCP over JSON-RPC: initialize, ping, tools/list and tools/call. Returns the
 * response to send, or null for notifications.
 */
export function createMcpHandler(tools: McpTool[], info: { name: string; version: string; }) {
  const byName = new Map(tools.map((t) => [t.name, t]));
  // Tools share one browser page: run calls one at a time, in arrival order, so an overlapping
  // navigation or click can't land in the middle of another call.
  let queue: Promise<void> = Promise.resolve();

  const serial = <T>(work: () => Promise<T>) => {
    const run = queue.then(work);
    queue = run.then(() => {}, () => {});

    return run;
  };

  return async (raw: Json) => {
    const parsed = Message.safeParse(raw);

    if (!parsed.success) {
      return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } };
    }

    const { id, method, params } = parsed.data;

    if (id === undefined) return null; // a notification, e.g. notifications/initialized

    switch (method) {
      case 'initialize':
        return ok(id, {
          // Answer with the client's version: the subset used here is the same in all of them.
          protocolVersion: z.string().catch('2025-06-18').parse(params?.protocolVersion),
          capabilities: { tools: {} },
          serverInfo: info,
        });
      case 'ping':
        return ok(id, {});
      case 'tools/list':
        return ok(id, {
          tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
        });
      case 'tools/call': {
        const call = CallParams.safeParse(params);
        const found = call.success ? byName.get(call.data.name) : undefined;

        if (!call.success || !found) {
          return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Unknown tool' } };
        }

        try {
          return ok(id, { content: await serial(() => found.call(call.data.arguments ?? {})) });
        } catch (err) {
          const code = err instanceof CliError ? `[${err.code}] ` : '';

          const message = err instanceof z.ZodError
            ? z.prettifyError(err)
            : err instanceof Error
            ? err.message
            : String(err);

          return ok(id, { content: [{ type: 'text', text: `${code}${message}` }], isError: true });
        }
      }

      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
  };
}

/** Serve newline-delimited JSON-RPC on stdin/stdout. Logs must go to stderr. */
export function serveStdio(handle: ReturnType<typeof createMcpHandler>) {
  const lines = createInterface({ input: process.stdin });
  const pending = new Set<Promise<void>>();

  lines.on('line', (line) => {
    if (!line.trim()) return;
    let message: Json;

    try {
      message = parseJson(line);
    } catch {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`,
      );

      return;
    }

    const reply = handle(message).then((response) => {
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    });
    pending.add(reply);
    void reply.finally(() => pending.delete(reply));
  });

  // Finish calls still running when stdin closes, so piped requests get their answers.
  return new Promise<void>((resolve) => lines.on('close', resolve)).then(() => Promise.all(pending)).then(() => {});
}
