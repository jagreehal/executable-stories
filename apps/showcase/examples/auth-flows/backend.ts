import { createEmulator, type Emulator } from 'emulate';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

// Stands in for your real API, so there is something real to record. The emailed code is
// always 123456 and the only magic link that works is ?token=valid-link. "Sign in with Google"
// goes to Google's emulator (emulate), which shows a picker of the seeded users.
type Route = (body: Record<string, string>, cookie: string) => [status: number, json: object];

const routes = new Map<string, Route>(Object.entries(
  {
    'POST /api/login': ({ password }) =>
      password === 'password' ? [200, { mfa: 'email' }] : [401, { message: 'Wrong email or password' }],
    'POST /api/verify-code': ({ email, code }) =>
      code === '123456' ? [200, { token: `real-${email}`, email }] : [401, { message: 'That code is wrong' }],
    'POST /api/magic-link': ({ token }) =>
      token === 'valid-link'
        ? [200, { token: 'real-ada@example.com', email: 'ada@example.com' }]
        : [410, { message: 'This link has expired' }],
    'GET /api/me': (_, cookie) => {
      const email = /session=real-([^;]+)/.exec(cookie)?.[1];

      return email ? [200, { email: decodeURIComponent(email) }] : [401, { message: 'Signed out' }];
    },
  } satisfies Record<string, Route>,
));

const readBody = async (req: IncomingMessage) => {
  let text = '';

  for await (const chunk of req) text += String(chunk);

  return text ? JSON.parse(text) : {};
};

const redirect = (res: ServerResponse, location: string, cookie?: string) => {
  res.writeHead(302, cookie ? { location, 'set-cookie': cookie } : { location }).end();
};

// The OAuth authorization code flow, server side, against the emulator instead of Google.
const google = (emulator: Emulator) => {
  const callback = (req: IncomingMessage) => `http://${req.headers.host}/api/google/callback`;
  const client = { client_id: 'auth-flows', client_secret: 'secret' };

  return {
    start(req: IncomingMessage, res: ServerResponse) {
      const state = randomUUID();

      const params = new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: callback(req),
        scope: 'openid email profile',
        response_type: 'code',
        state,
      });

      redirect(res, `${emulator.url}/o/oauth2/v2/auth?${params}`, `oauth_state=${state}; Path=/; HttpOnly`);
    },
    async callback(req: IncomingMessage, res: ServerResponse) {
      const params = new URL(req.url ?? '', 'http://x').searchParams;
      const fail = (message: string) => redirect(res, `/?auth_error=${encodeURIComponent(message)}`);

      if (params.get('state') !== /oauth_state=([^;]+)/.exec(req.headers.cookie ?? '')?.[1]) {
        return fail('Google sign-in failed: state mismatch');
      }

      const token = await fetch(`${emulator.url}/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...client,
          code: params.get('code'),
          redirect_uri: callback(req),
          grant_type: 'authorization_code',
        }),
      }).then((r) => r.json());

      if (!token.access_token) return fail('Google sign-in failed');

      const user = await fetch(`${emulator.url}/oauth2/v2/userinfo`, {
        headers: { authorization: `Bearer ${token.access_token}` },
      }).then((r) => r.json());

      redirect(res, '/', `session=real-${encodeURIComponent(user.email)}; Path=/`);
    },
  };
};

export const backend = (): Plugin => ({
  name: 'auth-backend',
  async configureServer(server) {
    // No oauth_clients seeded, so the emulator accepts any client and redirect URI.
    const emulator = await createEmulator({
      service: 'google',
      port: 0,
      seed: { google: { users: [{ email: 'ada@example.com', name: 'Ada Lovelace' }] } },
    });

    server.httpServer?.once('close', () => void emulator.close());
    const oauth = google(emulator);

    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const path = req.url?.split('?')[0];

      if (path === '/api/google/start') return oauth.start(req, res);

      if (path === '/api/google/callback') {
        void oauth.callback(req, res);

        return;
      }

      const route = routes.get(`${req.method} ${path}`);

      if (!route) return next();
      void readBody(req).then((body) => {
        const [status, json] = route(body, req.headers.cookie ?? '');
        res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(json));
      });
    });
  },
});
