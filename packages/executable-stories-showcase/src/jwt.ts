import type { JsonObject } from './schema.js';

/** Base64url of UTF-8, so claims in any script ("José", "李雷", "Zoë") survive decoding. */
const encode = (value: JsonObject) =>
  btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)), (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * An unsigned JWT (`alg: "none"`) carrying `claims`, for mocked responses in "signed-in" scenarios
 * when the app only decodes the token it gets back. Anything that verifies signatures rejects it,
 * which keeps it out of real backends. Set `exp` in the future if the app checks expiry.
 */
export const unsignedJwt = (claims: JsonObject): string =>
  `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;
