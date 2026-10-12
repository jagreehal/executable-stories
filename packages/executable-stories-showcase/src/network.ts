import { delay, http, HttpResponse } from 'msw';
import type { NetworkEntry } from './schema.js';

const verbs = {
  GET: http.get,
  POST: http.post,
  PUT: http.put,
  PATCH: http.patch,
  DELETE: http.delete,
  HEAD: http.head,
  OPTIONS: http.options,
} satisfies Record<NetworkEntry['method'], typeof http.get>;

// The worker can't see a request's destination, so code is recognised by its path.
const isCode = (href: string) => {
  const { pathname } = new URL(href);

  return /\.(m?[jt]sx?|css|s[ac]ss|less|html?|wasm)$/i.test(pathname)
    || pathname.startsWith('/@') || pathname.includes('/node_modules/');
};

/** Turn scenario network entries into MSW handlers. First match wins. */
export function toHandlers(entries: NetworkEntry[] = []) {
  return entries.map((entry) => {
    const responses = entry.sequence ?? [entry.response!];
    let calls = 0;

    return verbs[entry.method](entry.path, async ({ request }): Promise<Response | undefined> => {
      // Fixtures answer the app's requests, never a page load or code: a scenario from a shared
      // link could otherwise serve its own HTML or scripts (a lazy chunk) on the app's origin.
      if (request.mode === 'navigate' || isCode(request.url)) return undefined;

      if (entry.query) {
        const params = new URL(request.url).searchParams;
        const matches = Object.entries(entry.query).every(([k, v]) => params.get(k) === v);

        if (!matches) return undefined; // fall through to the next handler
      }

      const r = responses[Math.min(calls++, responses.length - 1)];

      if (r.delay !== undefined) await delay(r.delay);
      // nosniff stops a browser running a fixture as a script, whatever URL loaded it.
      const headers = new Headers(r.headers);
      headers.set('x-content-type-options', 'nosniff');

      if (/script|wasm/i.test(headers.get('content-type') ?? '')) return undefined;
      const init = { status: r.status, headers };

      if (r.text !== undefined) return HttpResponse.text(r.text, init);

      if (r.body === undefined) return new HttpResponse(null, init);

      return HttpResponse.json(r.body, init);
    });
  });
}
