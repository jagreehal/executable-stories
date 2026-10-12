import { type FormEvent, useEffect, useState } from 'react';
import { useScenarioState } from 'executable-stories-showcase-react';
import { z } from 'zod';

const AuthSchema = z.discriminatedUnion('screen', [
  z.object({ screen: z.literal('loading') }),
  z.object({ screen: z.literal('login'), error: z.string().optional() }),
  z.object({ screen: z.literal('code'), email: z.string(), error: z.string().optional() }),
  z.object({ screen: z.literal('dashboard'), email: z.string() }),
]);

type Auth = z.infer<typeof AuthSchema>;

type Payload = Record<string, string>;

const api = async (path: string, body?: Payload) => {
  const init = body
    && { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };

  const res = await fetch(path, init);
  const data = await res.json();

  if (!res.ok) throw new Error(data.message);

  return data;
};

const signIn = (token: string, email: string): Auth => {
  document.cookie = `session=${encodeURIComponent(token)}; path=/`;

  return { screen: 'dashboard', email };
};

const message = (err: Error) => err.message;

const field = (form: FormData, name: string) => {
  const value = form.get(name);

  return value instanceof File ? '' : (value ?? '');
};

export function App() {
  const [auth, setAuth] = useState<Auth>({ screen: 'loading' });

  // Scenarios can open any screen directly, e.g. the code screen without signing in first.
  useScenarioState('auth', auth, setAuth, AuthSchema);

  // Only leave "loading" here: a scenario may already have moved the app on.
  const settle = (next: Auth) => setAuth((current) => (current.screen === 'loading' ? next : current));

  useEffect(() => {
    if (location.pathname === '/magic') {
      const token = new URLSearchParams(location.search).get('token') ?? '';
      api('/api/magic-link', { token })
        .then(({ token, email }) => settle(signIn(token, email)))
        .catch((err) => settle({ screen: 'login', error: message(err) }));

      return;
    }

    // Like a route guard: no session cookie means no need to ask the server.
    if (!document.cookie.includes('session=')) {
      // The OAuth callback reports failures this way.
      const error = new URLSearchParams(location.search).get('auth_error');
      settle(error ? { screen: 'login', error } : { screen: 'login' });

      return;
    }

    api('/api/me')
      .then(({ email }) => settle({ screen: 'dashboard', email }))
      .catch((err) => settle({ screen: 'login', error: message(err) }));
  }, []);

  const submit =
    (handler: (form: FormData) => Promise<Auth>, onError: (error: string) => Auth) =>
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handler(new FormData(e.currentTarget)).then(setAuth, (err) => setAuth(onError(message(err))));
    };

  if (auth.screen === 'loading') return <p>Loading…</p>;

  if (auth.screen === 'login') {
    return (
      <form
        onSubmit={submit(async (form) => {
          const email = field(form, 'email');
          await api('/api/login', { email, password: field(form, 'password') });

          return { screen: 'code', email };
        }, (error) => ({ screen: 'login', error }))}
      >
        <h1>Sign in</h1>
        {auth.error && <p role='alert'>{auth.error}</p>}
        <label>
          Email <input name='email' type='email' required />
        </label>
        <label>
          Password <input name='password' type='password' required />
        </label>
        <button>Continue</button>
        <a href='/api/google/start'>Sign in with Google</a>
      </form>
    );
  }

  if (auth.screen === 'code') {
    return (
      <form
        onSubmit={submit(async (form) => {
          const { token, email } = await api('/api/verify-code', {
            email: auth.email,
            code: field(form, 'code'),
          });

          return signIn(token, email);
        }, (error) => ({ ...auth, error }))}
      >
        <h1>Check your email</h1>
        <p>We sent a code to {auth.email}.</p>
        {auth.error && <p role='alert'>{auth.error}</p>}
        <label>
          Code <input name='code' inputMode='numeric' autoComplete='one-time-code' required />
        </label>
        <button>Verify</button>
      </form>
    );
  }

  return (
    <main>
      <h1>Signed in as {auth.email}</h1>
      <button
        onClick={() => {
          document.cookie = 'session=; path=/; max-age=0';
          setAuth({ screen: 'login' });
        }}
      >
        Sign out
      </button>
    </main>
  );
}
