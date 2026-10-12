# Signed-in and signed-out states

## Cookie sessions

`cookiesAdapter()` from `executable-stories-showcase/cookies` sets cookies before the app renders, so a cookie
check lets the scenario in:

```json
{ "name": "signed-in", "state": { "cookies": { "session": "scenario" } } }
```

It overwrites real cookies of the same name. It applies from catalog scenarios only, never from
inline `#scenario-data=` links, which anyone can write.

## Apps that validate a token on startup

Many apps read a stored token, send it to a validate endpoint, decode the JWT that comes back and
fill stores from its claims. A signed-in scenario then needs the cookie (so the check runs) and a
mocked validate response carrying a token. `unsignedJwt(claims)` builds one: UTF-8 safe, so names
in any script decode, and unsigned (`alg: "none"`), so anything that verifies signatures rejects
it. Build that scenario in code and let JSON scenarios extend it:

```ts
import { type ScenarioInput, startScenarios, unsignedJwt } from 'executable-stories-showcase';
import { cookiesAdapter } from 'executable-stories-showcase/cookies';

const signedIn: ScenarioInput = {
  name: 'signed-in',
  state: { cookies: { session: 'scenario' } }, // so the app's startup check runs
  network: [{
    method: 'POST',
    path: '/api/auth/validate-token',
    response: {
      body: {
        token: unsignedJwt({ sub: 'user-1', name: 'Amara Okafor', roles: ['admin'], exp: 4102444800 }),
      },
    },
  }],
};

await startScenarios({ scenarios: [signedIn], adapters: [cookiesAdapter()] });
```

Use the claim names and endpoint the app reads; find them where the app decodes the token. Set
`exp` in the future when the app checks expiry. `?scenario-record` captures the real exchange too;
recording keeps the claims and drops the signature.

## Signed out and expired

Mock the validate endpoint with a 401 (or whatever the app treats as an expired session), and ready
on the sign-in screen's heading. A scenario without the cookie only shows signed out in a browser
that never had it, such as `shoot` and the MCP server, which start each run fresh.
