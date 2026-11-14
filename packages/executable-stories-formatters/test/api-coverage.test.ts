/**
 * API coverage: which declared operations a scenario's server spans reached.
 */
import type { TestRunResult } from 'executable-stories-core/types/test-result';
import { describe, expect, it } from 'vitest';
import {
  apiCoverage,
  operationsFromOpenApi,
  operationsFromProto,
  renderApiCoverage,
  runApiCoverage,
} from '../src/api-coverage';

const OPENAPI = `
openapi: 3.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /users/{id}:
    get: {}
    delete: {}
  /users/me:
    get: {}
  /orders:
    post: {}
    parameters: []
`;

const PROTO = `
syntax = "proto3";
package shop;
// service Ignored { rpc Nope(A) returns (B); }
service Cart {
  rpc AddItem(AddItemRequest) returns (Cart) { option (google.api.http) = { post: "/cart" }; }
  rpc Clear(ClearRequest) returns (Cart);
}
`;

function run(spans: Array<Record<string, unknown>>[]): TestRunResult {
  return {
    projectRoot: '/repo',
    runId: 'r',
    startedAtMs: 0,
    finishedAtMs: 0,
    durationMs: 0,
    testCases: spans.map((attrs, i) => ({
      id: `s${i}`,
      story: {
        scenario: `Scenario ${i}`,
        steps: [],
        // `kind` rides along with the attributes here, and becomes the span's kind.
        otelSpans: attrs.map(({ kind, ...attributes }, j) => ({
          spanId: `${i}${j}`,
          name: 'span',
          status: 'ok',
          ...(kind ? { kind } : {}),
          attributes,
        })),
      },
    })),
  } as unknown as TestRunResult;
}

describe('operationsFromOpenApi / operationsFromProto', () => {
  it('lists each method of each path, and each rpc of each service', () => {
    expect(
      operationsFromOpenApi(OPENAPI, 'api.yaml').map((op) => op.label),
    ).toEqual([
      'GET /users/{id}',
      'DELETE /users/{id}',
      'GET /users/me',
      'POST /orders',
    ]);
    expect(
      operationsFromProto(PROTO, 'shop.proto').map((op) => op.label),
    ).toEqual(['shop.Cart/AddItem', 'shop.Cart/Clear']);
  });

  it('rejects a document that is not OpenAPI', () => {
    expect(() => operationsFromOpenApi('name: x', 'x.yaml')).toThrow(
      /no "paths"/,
    );
  });
});

describe('apiCoverage', () => {
  const ops = [
    ...operationsFromOpenApi(OPENAPI, 'api.yaml'),
    ...operationsFromProto(PROTO, 'shop.proto'),
  ];

  it('matches server routes, concrete paths under the server prefix, and rpcs', () => {
    const result = apiCoverage(
      run([
        [
          { 'http.request.method': 'GET', 'http.route': '/users/:id' },
          { 'http.request.method': 'GET', 'url.path': '/v1/users/me' },
        ],
        [
          { 'http.method': 'post', 'http.target': '/orders?draft=1' },
          { 'rpc.service': 'shop.Cart', 'rpc.method': 'AddItem', kind: 'server' },
          // The calling side of an rpc carries the same attributes: not proof it was handled.
          { 'rpc.service': 'shop.Cart', 'rpc.method': 'Clear', kind: 'client' },
          // Nor is an rpc that never said which side it was.
          { 'rpc.service': 'shop.Cart', 'rpc.method': 'Clear' },
          // A span that says it is a client does not count, whatever its attributes.
          { 'http.request.method': 'DELETE', 'http.route': '/users/{id}', kind: 'client' },
          // A client span names the URL it called, not a route it served.
          {
            'http.request.method': 'DELETE',
            'url.full': 'https://api.example.com/v1/users/1',
          },
          { 'http.request.method': 'GET', 'http.route': '/admin' },
        ],
      ]),
      ops,
    );
    const by = Object.fromEntries(
      result.operations.map((op) => [op.label, op.scenarios.map((s) => s.id)]),
    );
    expect(by).toEqual({
      'GET /users/{id}': ['s0'],
      'DELETE /users/{id}': [],
      // The literal path wins over the template.
      'GET /users/me': ['s0'],
      'POST /orders': ['s1'],
      'shop.Cart/AddItem': ['s1'],
      'shop.Cart/Clear': [],
    });
    expect(result.covered).toBe(4);
    expect(result.total).toBe(6);
    expect(result.undeclared).toEqual(['GET /admin']);
    expect(renderApiCoverage(result)).toContain('✗ DELETE /users/{id}');
  });
});

describe('runApiCoverage', () => {
  it('needs a spec', () => {
    const errors: string[] = [];
    const code = runApiCoverage(['reports/by-file'], {
      readFile: () => '',
      isDirectory: () => false,
      listDir: () => undefined,
      log: () => {},
      error: (m) => errors.push(m),
    });
    expect(code).toBe(4);
    expect(errors[0]).toMatch(/--openapi or --proto/);
  });

  it('prints JSON for a raw run', () => {
    const out: string[] = [];
    const files: Record<string, string> = {
      'api.yaml': OPENAPI,
      'run.json': JSON.stringify({
        ...run([[{ 'http.request.method': 'POST', 'http.route': '/orders' }]]),
      }),
    };
    const code = runApiCoverage(
      ['run.json', '--openapi', 'api.yaml', '--json'],
      {
        readFile: (f) => files[f],
        isDirectory: () => false,
        listDir: () => undefined,
        log: (m) => out.push(m),
        error: (m) => out.push(m),
      },
    );
    expect(code).toBe(0);
    expect(JSON.parse(out[0])).toMatchObject({ total: 4, covered: 1 });
  });
});
