import { z } from 'zod';
import { unsignedJwt } from './jwt.js';
import type { Json, JsonObject } from './schema.js';

/** Keys whose values are secrets whatever they hold. */
const SECRET_KEY =
  /pass(word|phrase)?$|secret|api[-_]?key|private[-_]?key|access[-_]?key|credential|^otp$|card[-_]?number|^cvc$|^cvv$/i;

/** Keys holding bearer values: a JWT keeps its claims, anything else is replaced. */
const TOKEN_KEY = /token|session[-_]?id|^sid$|authorization|cookie/i;

/** Numeric bearer values: session ids. */
const NUMERIC_ID_KEY = /session[-_]?id$|^sid$/i;

const JWT = /^[\w-]+\.[\w-]+\.[\w-]*$/;

/**
 * Values that are credentials whatever key holds them: an auth header, and the key formats of
 * Stripe, GitHub, AWS and Slack.
 */
const SECRET_VALUE = /^(Bearer|Basic) \S|^[sr]k_(live|test)_\w|^gh[pousr]_\w{20}|^github_pat_\w|^AKIA[0-9A-Z]{16}$|^xox[abprs]-/;

/** URL params that carry a one-time credential, such as an OAuth authorization `code`. */
const SECRET_PARAM = /^(code|state|nonce)$/i;

const PLACEHOLDER = '[redacted]';

const decode = (part: string): JsonObject | undefined => {
  try {
    const bytes = Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const value: Json = JSON.parse(new TextDecoder().decode(bytes));

    return value instanceof Object && !Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

/** A JWT re-issued unsigned with the same claims, so the app still decodes it but no server accepts it. */
const unsign = (token: string) => {
  if (!JWT.test(token)) return undefined;
  const [header = '', payload = ''] = token.split('.');

  if (!decode(header)) return undefined;
  const claims = decode(payload);

  return claims && unsignedJwt(claims);
};

export interface Redacted {
  value: Json;
  /** Paths that changed, e.g. `user.accessToken`. */
  redacted: string[];
}

/**
 * Remove secrets from recorded responses and captured state: strings under secret-like keys
 * become "[redacted]" and numbers become 0, and signed JWTs anywhere lose their signature but
 * keep their claims.
 */
export function redactSecrets(value: Json): Redacted {
  const redacted: string[] = [];

  const walk = (node: Json, path: string, key: string): Json => {
    const text = z.string().safeParse(node);
    // A JWT keeps its claims, whatever key holds it: the app may decode it.
    const jwt = text.success ? unsign(text.data) : undefined;

    if (jwt !== undefined) {
      if (jwt !== text.data) redacted.push(path);

      return jwt;
    }

    // Checked before the value's type: a card number or one-time code is often a number.
    // Token-like keys only for strings: `tokens: 3` is usually a count, not a credential.
    const secret = SECRET_KEY.test(key) || TOKEN_KEY.test(key);
    const number = z.number().safeParse(node);

    if ((SECRET_KEY.test(key) || NUMERIC_ID_KEY.test(key)) && number.success) {
      redacted.push(path);

      return 0; // still a number, so the app's parsing and formatting keep working
    }

    if (text.success && ((secret && text.data) || SECRET_VALUE.test(text.data))) {
      redacted.push(path);

      return PLACEHOLDER;
    }

    if (text.success || number.success) return node;

    if (Array.isArray(node)) return node.map((item, i) => walk(item, `${path}[${i}]`, key));

    if (node instanceof Object) {
      // Everything under a secret key is secret too, e.g. a private key's JWK fields.
      return Object.fromEntries(
        Object.entries(node).map(([k, v]) => [k, walk(v, path ? `${path}.${k}` : k, secret ? key : k)]),
      );
    }

    return node;
  };

  return { value: walk(value, '', ''), redacted };
}

/**
 * Drops URL params whose value redaction would change (`?api_key=…`, `?token=…`), and OAuth's
 * one-time `code`, `state` and `nonce`. Saved params are matched or replayed as written, so `"[redacted]"`
 * would be wrong; without the param, a recorded request matches whatever value the app sends.
 */
export function withoutSecretParams(params: Record<string, string>, where: string): Record<string, string> {
  const redacted = z.record(z.string(), z.unknown()).parse(redactSecrets(params).value);
  const dropped = Object.keys(params).filter((key) => SECRET_PARAM.test(key) || redacted[key] !== params[key]);

  if (dropped.length) console.info(`[executable-stories-showcase] left ${dropped.join(', ')} out of ${where}`);

  return Object.fromEntries(Object.entries(params).filter(([key]) => !dropped.includes(key)));
}
