import { z } from 'zod';
import type { TypedAdapter } from '../runtime.js';

const CookiesSchema = z.record(z.string(), z.string());

/**
 * Connects `document.cookie` as `state.cookies` (or your key): `{ "authToken": "fake" }`.
 * Applied before the app renders, so cookie-based auth gates let the scenario in.
 * It overwrites real cookies with the same name: sign in again after leaving scenarios.
 * Inline links can't set it; link to a catalog scenario by name instead.
 */
export const cookiesAdapter = (
  { key = 'cookies', path = '/' }: { key?: string; path?: string; } = {},
): TypedAdapter<Record<string, string>> => ({
  key,
  schema: CookiesSchema,
  apply: (cookies) => {
    for (const [name, value] of Object.entries(cookies)) {
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}`;
    }
  },
  read: () =>
    Object.fromEntries(
      document.cookie.split('; ').filter(Boolean).map((c) => {
        const i = c.indexOf('=');

        return [decodeURIComponent(c.slice(0, i)), decodeURIComponent(c.slice(i + 1))];
      }),
    ),
  // Cookie libraries (react-cookie, js-cookie) read once at startup.
  inPlace: false,
  // A cookie outlives the scenario and reaches the real backend, so only catalog
  // scenarios, which live in the repo, set it.
  fromLinks: false,
});
