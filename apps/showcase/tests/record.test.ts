import { expect, it, vi } from 'vitest';
import { createRecorder } from '../../../packages/executable-stories-showcase/src/record.ts';
import type { Json } from '../../../packages/executable-stories-showcase/src/schema.ts';

vi.stubGlobal('location', new URL('http://app.test/'));

const json = (body: Json, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Start each request in order, then answer them in the given order. */
const record = async (
  requests: [url: string, response: Response, init?: RequestInit][],
  answerOrder = requests.map((_, i) => i),
) => {
  const recorder = createRecorder();
  requests.forEach((_, i) => recorder.start(`r${i}`));

  for (const i of answerOrder) {
    const [url, response, init] = requests[i];
    void recorder.bypass(`r${i}`, new Request(url, init), response);
  }

  await recorder.settled();

  return recorder.entries();
};

it('turns real responses into replayable network entries', async () => {
  expect(
    await record([
      ['http://app.test/api/me', json({ message: 'Signed out' }, 401)],
      ['http://app.test/api/login', json({ mfa: true }), { method: 'POST' }],
      ['http://app.test/api/me', json({ email: 'ada@example.com' })],
      ['http://api.test/items?page=2', json([2])],
      ['http://api.test/items?page=2', json([2])],
      ['http://app.test/', new Response('<html>', { headers: { 'content-type': 'text/html' } })],
    ]),
  ).toEqual([
    // Query-specific entries first: an entry without `query` matches any query string.
    {
      method: 'GET',
      path: 'http://api.test/items',
      query: { page: '2' },
      response: { status: 200, body: [2] },
    },
    {
      method: 'GET',
      path: '/api/me',
      sequence: [{ status: 401, body: { message: 'Signed out' } }, {
        status: 200,
        body: { email: 'ada@example.com' },
      }],
    },
    { method: 'POST', path: '/api/login', response: { status: 200, body: { mfa: true } } },
  ]);
});

it('keeps request order when responses arrive out of order', async () => {
  const [entry] = await record([['http://app.test/api/n', json(1)], ['http://app.test/api/n', json(2)]], [
    1,
    0,
  ]);

  expect(entry?.sequence?.map((r) => r.body)).toEqual([1, 2]);
});

it('groups query strings whatever their param order', async () => {
  const entries = await record([['http://app.test/s?a=1&b=2', json(1)], [
    'http://app.test/s?b=2&a=1',
    json(2),
  ]]);

  expect(entries).toEqual([
    {
      method: 'GET',
      path: '/s',
      query: { a: '1', b: '2' },
      sequence: [{ status: 200, body: 1 }, { status: 200, body: 2 }],
    },
  ]);
});

it('leaves out responses whose body is not JSON after all', async () => {
  const broken = new Response('not json', { headers: { 'content-type': 'application/json' } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  expect(await record([['http://app.test/api/x', broken], ['http://app.test/api/y', json(1)]])).toEqual([
    { method: 'GET', path: '/api/y', response: { status: 200, body: 1 } },
  ]);
});

it('skips requests that repeat a query key, which scenario queries cannot match', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  expect(await record([['http://app.test/s?tag=a&tag=b', json(1)]])).toEqual([]);
});

it('leaves secret query params out of the recorded entry, so replay matches any value', async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  const entries = await record([['http://app.test/search?q=fr&api_key=sk-live&token=abc', json([])]]);

  expect(entries).toEqual([{ method: 'GET', path: '/search', query: { q: 'fr' }, response: { status: 200, body: [] } }]);
});
