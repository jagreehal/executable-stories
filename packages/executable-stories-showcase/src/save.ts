import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { SAVE_ENDPOINT } from './link.js';
import { JsonSchema, ScenarioSchema } from './schema.js';

// The panel's "Save to project" endpoint, shared by the Vite plugin and the Next.js route.

const MAX_BODY = 20 * 1024 * 1024;

const SaveRequestSchema = z.object({ scenario: JsonSchema, overwrite: z.boolean().optional() });

interface SaveReply {
  error?: string;
  /** Saved file, relative to the project root. */
  path?: string;
  /** Saved file, absolute. */
  file?: string;
  /** Scenarios folder, relative to the project root. */
  dir?: string;
}

export interface SaveTarget {
  /** Absolute folder scenarios are written into. */
  dir: string;
  /** Absolute project root; replies show paths relative to it. */
  root: string;
  /** Page origins allowed to save cross-origin. Without it, only same-origin requests may. */
  origins?: string[];
}

/**
 * GET reports the folder; POST `{ scenario, overwrite? }` writes `<dir>/<name>.json`.
 * JSON from an allowed origin on a loopback host only, schema-checked, and never replaces a
 * file unless `overwrite` is set.
 */
export async function handleSaveRequest(
  request: Request,
  { dir, root, origins }: SaveTarget,
): Promise<Response> {
  const display = (file: string) => relative(root, file).replaceAll('\\', '/');
  const reply = (status: number, body: SaveReply) => Response.json(body, { status });

  if (!allowedOrigin(request.headers, origins)) {
    return reply(403, { error: 'Save refused: only the app on localhost may write files' });
  }

  if (request.method === 'GET') return reply(200, { dir: display(dir) });

  if (request.method !== 'POST') return reply(405, { error: 'Use GET or POST' });

  // A JSON content type also forces a CORS preflight, which only allowed origins pass.
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return reply(415, { error: 'Send application/json' });
  }

  let body: z.output<typeof SaveRequestSchema>;

  try {
    body = SaveRequestSchema.parse(JSON.parse(await readCapped(request)));
  } catch (err) {
    return reply(400, { error: err instanceof z.ZodError ? z.prettifyError(err) : String(err) });
  }

  // The schema's kebab-case name rule also keeps the file inside `dir`.
  const parsed = ScenarioSchema.safeParse(body.scenario);

  if (!parsed.success) return reply(400, { error: z.prettifyError(parsed.error) });

  const { name } = parsed.data;

  if (name.includes(',')) return reply(400, { error: "A saved scenario name can't contain a comma" });

  const file = join(dir, `${name}.json`);

  if (existsSync(file) && !body.overwrite) {
    return reply(409, { error: `${display(file)} already exists`, path: display(file) });
  }

  mkdirSync(dir, { recursive: true });
  // Write what the panel sent, not the parsed form, so defaults don't bloat the file.
  writeFileSync(file, `${JSON.stringify(body.scenario, null, 2)}\n`);

  return reply(200, { path: display(file), file });
}

/**
 * The save endpoint as Node middleware. Headers can be forged by any client and the socket
 * can't, so only connections from this machine reach the handler.
 */
export function createSaveHandler(target: SaveTarget) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin;

    // Cross-origin saves (the Next.js save server) need CORS for the origins the target allows.
    if (origin && target.origins?.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-methods', 'GET, POST');
      res.setHeader('access-control-allow-headers', 'content-type');
      res.statusCode = 204;
      res.end();

      return;
    }

    let response: Response;

    try {
      response = isLoopbackAddress(req.socket.remoteAddress)
        ? await handleSaveRequest(toRequest(req), target)
        : Response.json({ error: 'Save refused: only this machine may write files' }, { status: 403 });
    } catch (err) {
      // A bad Host header or a dropped connection: answer rather than leave the request hanging.
      response = Response.json({ error: String(err) }, { status: 500 });
    }

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  };
}

/**
 * Start a save server on 127.0.0.1, unreachable from other machines whatever the app server
 * listens on. Resolves to its save URL.
 */
export function startSaveServer(target: SaveTarget): Promise<string> {
  const handle = createSaveHandler(target);
  const server = createServer((req, res) => void handle(req, res));

  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const { port } = z.object({ port: z.number() }).parse(server.address());
      server.unref(); // never keeps the dev process alive on its own
      done(`http://127.0.0.1:${port}${SAVE_ENDPOINT}`);
    });
  });
}

/** True for a loopback peer address, as Node reports it in `socket.remoteAddress`. */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const ip = address.replace(/^::ffff:/, '');

  return ip === '::1' || /^127(\.\d{1,3}){3}$/.test(ip);
}

function allowedOrigin(headers: Headers, origins: string[] | undefined): boolean {
  const host = headers.get('host') ?? '';

  // DNS rebinding points an attacker's domain at 127.0.0.1, making its requests "same-origin";
  // the Host header still names that domain, so only loopback hosts may write.
  if (!isLoopbackHost(host)) return false;

  const origin = headers.get('origin');

  // No Origin: same-origin GET, curl or a test. Browsers always send it on cross-origin requests.
  if (!origin) return true;

  if (origins) return origins.includes(origin);

  try {
    return new URL(origin).host === host;
  } catch {
    return false; // "null" from sandboxed frames and file:// pages
  }
}

function isLoopbackHost(host: string): boolean {
  let hostname: string;

  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    return false;
  }

  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '[::1]'
    || /^127(\.\d{1,3}){3}$/.test(hostname);
}

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers();

  for (let i = 0; i < req.rawHeaders.length; i += 2) headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);

  const method = req.method ?? 'GET';

  // Streamed, so the handler can refuse a request before reading (or capping) its body.
  const body = method === 'GET' || method === 'HEAD' ? undefined : new ReadableStream<Uint8Array>({
    start(controller) {
      req.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      req.on('end', () => controller.close());
      req.on('error', (err) => controller.error(err));
    },
    cancel() {
      req.destroy();
    },
  });

  const init: RequestInit & { duplex: 'half'; } = { method, headers, body, duplex: 'half' };

  return new Request(new URL(req.url ?? '/', `http://${headers.get('host') ?? 'localhost'}`), init);
}

async function readCapped(request: Request): Promise<string> {
  const reader = request.body?.getReader();

  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;
    size += value.length;

    if (size > MAX_BODY) {
      await reader.cancel();
      throw new Error('Scenario too large');
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}
