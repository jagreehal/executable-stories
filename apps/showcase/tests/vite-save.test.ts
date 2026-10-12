import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSaveRoute } from '../../../packages/executable-stories-showcase/src/next.ts';
import { createSaveHandler, isLoopbackAddress } from '../../../packages/executable-stories-showcase/src/save.ts';
import type { Json } from '../../../packages/executable-stories-showcase/src/schema.ts';

describe('executable-stories-showcase/vite save endpoint', () => {
  const root = mkdtempSync(join(tmpdir(), 'ss-vite-'));
  const dir = join(root, 'src/scenarios');
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const handle = createSaveHandler({ dir, root });
    server = createServer((req, res) => void handle(req, res));
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const { port } = z.object({ port: z.number() }).parse(server.address());
    url = `http://127.0.0.1:${port}/`;
  });

  afterAll(() => new Promise<void>((done) => server.close(() => done())));

  const post = (body: Json, headers: Record<string, string> = {}) =>
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  it('reports the folder it saves into', async () => {
    const res = await fetch(url);

    expect(await res.json()).toEqual({ dir: 'src/scenarios' });
  });

  it('writes the scenario as sent, then refuses to overwrite unless asked', async () => {
    const scenario = { name: 'saved-one', extends: 'default', ready: 'text="Hi"' };
    const first = await post({ scenario });

    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ path: 'src/scenarios/saved-one.json' });
    expect(JSON.parse(readFileSync(join(dir, 'saved-one.json'), 'utf8'))).toEqual(scenario);

    const again = await post({ scenario: { ...scenario, ready: 'text="Bye"' } });

    expect(again.status).toBe(409);

    const forced = await post({ scenario: { ...scenario, ready: 'text="Bye"' }, overwrite: true });

    expect(forced.status).toBe(200);
    expect(JSON.parse(readFileSync(join(dir, 'saved-one.json'), 'utf8')).ready).toBe('text="Bye"');
  });

  it('rejects names that could escape the folder, and invalid scenarios', async () => {
    const escape = await post({ scenario: { name: '../../evil' } });

    expect(escape.status).toBe(400);
    expect(existsSync(join(root, 'evil.json'))).toBe(false);
    expect((await post({ scenario: { name: 'x', network: 'nope' } })).status).toBe(400);
    expect((await post('not an object')).status).toBe(400);
  });

  it('refuses cross-origin and non-JSON requests', async () => {
    expect((await post({ scenario: { name: 'evil' } }, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post({ scenario: { name: 'evil' } }, { origin: 'null' })).status).toBe(403);

    const form = await fetch(url, {
      method: 'POST',
      body: 'scenario=x',
      headers: { 'content-type': 'text/plain' },
    });

    expect(form.status).toBe(415);
    expect(existsSync(join(dir, 'evil.json'))).toBe(false);
  });

  // fetch can't set Host (a forbidden header), so these go through node:http.
  const rawPost = (headers: Record<string, string>, body: string) =>
    new Promise<number>((done, fail) => {
      const req = request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
      }, (res) => {
        res.resume();
        done(res.statusCode ?? 0);
      });

      req.on('error', fail);
      req.end(body);
    });

  it("refuses non-loopback hosts, so DNS rebinding can't write", async () => {
    const body = JSON.stringify({ scenario: { name: 'rebound' } });

    // Rebinding: evil.example now resolves to 127.0.0.1, so Origin and Host agree.
    expect(await rawPost({ host: 'evil.example:5173', origin: 'http://evil.example:5173' }, body)).toBe(403);
    expect(await rawPost({ host: 'evil.example:5173' }, body)).toBe(403);
    expect(await rawPost({ host: '127.evil.example' }, body)).toBe(403);
    expect(existsSync(join(dir, 'rebound.json'))).toBe(false);
    expect(await rawPost({ host: 'localhost:5173', origin: 'http://localhost:5173' }, body)).toBe(200);
  });

  it('accepts its own origin', async () => {
    const res = await post({ scenario: { name: 'same-origin' } }, { origin: url.slice(0, -1) });

    expect(res.status).toBe(200);
  });

  it('leaves a file it never wrote alone when the write is refused', async () => {
    writeFileSync(join(dir, 'kept.json'), '{"name":"kept"}\n');

    expect((await post({ scenario: { name: 'kept', ready: 'x' } })).status).toBe(409);
    expect(readFileSync(join(dir, 'kept.json'), 'utf8')).toBe('{"name":"kept"}\n');
  });
});

describe('isLoopbackAddress', () => {
  it.each(
    [
      ['127.0.0.1', true],
      ['127.1.2.3', true],
      ['::1', true],
      ['::ffff:127.0.0.1', true],
      ['192.168.1.20', false],
      ['::ffff:10.0.0.5', false],
      ['fe80::1', false],
      [undefined, false],
    ] as const,
  )('%s → %s', (address, expected) => {
    expect(isLoopbackAddress(address)).toBe(expected);
  });
});

describe('executable-stories-showcase/next save route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const probe = async (dir: string) => {
    const { GET } = createSaveRoute({ dir });

    const res = await GET(
      new Request('http://localhost:3000/__executable-stories-showcase/save', { headers: { host: 'localhost:3000' } }),
    );

    return z.object({ dir: z.string(), url: z.string() }).parse(await res.json());
  };

  it('points the panel at a save server on 127.0.0.1 that saves for the app origin', async () => {
    const root = mkdtempSync(join(tmpdir(), 'ss-next-'));
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PORT', '3000');
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    const { dir, url } = await probe('scenarios');

    expect(dir).toBe('scenarios');
    expect(new URL(url).hostname).toBe('127.0.0.1');
    // Same folder, same server: route reloads don't start another one.
    expect((await probe('scenarios')).url).toBe(url);

    const preflight = await fetch(url, {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'POST' },
    });

    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');

    const save = (origin: string) =>
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify({ scenario: { name: 'from-next' } }),
      });

    expect((await save('http://evil.example')).status).toBe(403);
    expect((await save('http://localhost:4000')).status).toBe(403);
    expect(existsSync(join(root, 'scenarios/from-next.json'))).toBe(false);

    const ok = await save('http://localhost:3000');

    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(existsSync(join(root, 'scenarios/from-next.json'))).toBe(true);
  });

  it('answers 404 outside next dev, so production never starts a save server', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { GET } = createSaveRoute();

    expect((await GET(new Request('http://x/__executable-stories-showcase/save'))).status).toBe(404);
  });
});
