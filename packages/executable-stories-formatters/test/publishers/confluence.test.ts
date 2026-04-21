/**
 * Tests for the Confluence publisher.
 */

import { describe, it, expect } from "vitest";
import {
  publishConfluencePage,
  type FetchFn,
} from "../../src/publishers/confluence";

const validAdf = JSON.stringify({
  version: 1,
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "hello" }] },
  ],
});

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function mockFetch(
  handlers: Array<{
    match: (req: CapturedRequest) => boolean;
    response: {
      ok: boolean;
      status: number;
      statusText: string;
      body: unknown;
    };
  }>,
): { fetch: FetchFn; requests: CapturedRequest[] } {
  const requests: CapturedRequest[] = [];
  const fetch: FetchFn = async (url, init) => {
    const req: CapturedRequest = {
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    };
    requests.push(req);
    const handler = handlers.find((h) => h.match(req));
    if (!handler) {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found (no handler matched)",
        text: async () => `no handler for ${init.method} ${url}`,
        json: async () => ({}),
      };
    }
    const bodyStr = JSON.stringify(handler.response.body);
    return {
      ok: handler.response.ok,
      status: handler.response.status,
      statusText: handler.response.statusText,
      text: async () => bodyStr,
      json: async () => handler.response.body,
    };
  };
  return { fetch, requests };
}

describe("publishConfluencePage", () => {
  describe("validation", () => {
    it("rejects invalid JSON", async () => {
      await expect(
        publishConfluencePage(
          { adf: "{not json", pageId: "123", baseUrl: "https://x/wiki" },
          { auth: { email: "a@b.com", token: "t" } },
        ),
      ).rejects.toThrow(/not valid JSON/);
    });

    it("rejects JSON that isn't an ADF doc envelope", async () => {
      await expect(
        publishConfluencePage(
          { adf: JSON.stringify({ foo: 1 }), pageId: "123", baseUrl: "https://x/wiki" },
          { auth: { email: "a@b.com", token: "t" } },
        ),
      ).rejects.toThrow(/ADF payload must be an object/);
    });

    it("requires either pageId or spaceId", async () => {
      await expect(
        publishConfluencePage(
          { adf: validAdf, baseUrl: "https://x/wiki" },
          { auth: { email: "a@b.com", token: "t" } },
        ),
      ).rejects.toThrow(/pageId.*spaceId/);
    });

    it("requires title when creating via spaceId", async () => {
      await expect(
        publishConfluencePage(
          { adf: validAdf, spaceId: "space-1", baseUrl: "https://x/wiki" },
          { auth: { email: "a@b.com", token: "t" } },
        ),
      ).rejects.toThrow(/requires a title/);
    });
  });

  describe("update", () => {
    it("fetches current page then PUTs with incremented version", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "GET",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: {
              id: "42",
              title: "Existing",
              version: { number: 7 },
              _links: { webui: "/spaces/DEV/pages/42" },
            },
          },
        },
        {
          match: (r) => r.method === "PUT",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: {
              id: "42",
              title: "Existing",
              version: { number: 8 },
              _links: { webui: "/spaces/DEV/pages/42" },
            },
          },
        },
      ]);

      const result = await publishConfluencePage(
        { adf: validAdf, pageId: "42", baseUrl: "https://acme.atlassian.net/wiki" },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      expect(result.action).toBe("updated");
      expect(result.id).toBe("42");
      expect(result.version).toBe(8);
      expect(result.url).toBe(
        "https://acme.atlassian.net/wiki/spaces/DEV/pages/42",
      );
      expect(requests).toHaveLength(2);

      const getReq = requests[0];
      expect(getReq.method).toBe("GET");
      expect(getReq.url).toBe(
        "https://acme.atlassian.net/wiki/api/v2/pages/42",
      );
      expect(getReq.headers.Authorization).toMatch(/^Basic /);

      const putReq = requests[1];
      expect(putReq.method).toBe("PUT");
      const putBody = JSON.parse(putReq.body!);
      expect(putBody.id).toBe("42");
      expect(putBody.status).toBe("current");
      expect(putBody.title).toBe("Existing");
      expect(putBody.version.number).toBe(8);
      expect(putBody.body.representation).toBe("atlas_doc_format");
      expect(putBody.body.value).toBe(validAdf);
    });

    it("overrides title when provided", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "GET",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: {
              id: "42",
              title: "Old",
              version: { number: 1 },
            },
          },
        },
        {
          match: (r) => r.method === "PUT",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: {
              id: "42",
              title: "New",
              version: { number: 2 },
              _links: { webui: "/pages/42" },
            },
          },
        },
      ]);

      const result = await publishConfluencePage(
        {
          adf: validAdf,
          pageId: "42",
          title: "New",
          baseUrl: "https://x.atlassian.net/wiki",
        },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      expect(result.title).toBe("New");
      const putBody = JSON.parse(requests[1].body!);
      expect(putBody.title).toBe("New");
    });

    it("throws with status code when GET fails", async () => {
      const { fetch } = mockFetch([
        {
          match: (r) => r.method === "GET",
          response: {
            ok: false,
            status: 404,
            statusText: "Not Found",
            body: { errors: [{ title: "Page not found" }] },
          },
        },
      ]);

      await expect(
        publishConfluencePage(
          { adf: validAdf, pageId: "999", baseUrl: "https://x/wiki" },
          { auth: { email: "a@b.com", token: "t" }, fetch },
        ),
      ).rejects.toThrow(/404 Not Found/);
    });

    it("throws with status code when PUT fails", async () => {
      const { fetch } = mockFetch([
        {
          match: (r) => r.method === "GET",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: {
              id: "42",
              title: "Existing",
              version: { number: 1 },
            },
          },
        },
        {
          match: (r) => r.method === "PUT",
          response: {
            ok: false,
            status: 409,
            statusText: "Conflict",
            body: { message: "Version conflict" },
          },
        },
      ]);

      await expect(
        publishConfluencePage(
          { adf: validAdf, pageId: "42", baseUrl: "https://x/wiki" },
          { auth: { email: "a@b.com", token: "t" }, fetch },
        ),
      ).rejects.toThrow(/409 Conflict/);
    });
  });

  describe("create", () => {
    it("POSTs to /api/v2/pages with spaceId and optional parentId", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "POST",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: {
              id: "100",
              title: "New Page",
              version: { number: 1 },
              _links: { webui: "/spaces/DEV/pages/100/New" },
            },
          },
        },
      ]);

      const result = await publishConfluencePage(
        {
          adf: validAdf,
          spaceId: "s1",
          parentId: "p1",
          title: "New Page",
          baseUrl: "https://acme.atlassian.net/wiki",
        },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      expect(result.action).toBe("created");
      expect(result.id).toBe("100");
      expect(result.version).toBe(1);
      expect(result.url).toContain("/spaces/DEV/pages/100/New");

      const post = requests[0];
      expect(post.method).toBe("POST");
      expect(post.url).toBe("https://acme.atlassian.net/wiki/api/v2/pages");
      const body = JSON.parse(post.body!);
      expect(body).toEqual({
        spaceId: "s1",
        status: "current",
        title: "New Page",
        body: { representation: "atlas_doc_format", value: validAdf },
        parentId: "p1",
      });
    });

    it("omits parentId when not provided", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "POST",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: {
              id: "100",
              title: "New",
              version: { number: 1 },
            },
          },
        },
      ]);

      await publishConfluencePage(
        {
          adf: validAdf,
          spaceId: "s1",
          title: "New",
          baseUrl: "https://x/wiki",
        },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      const body = JSON.parse(requests[0].body!);
      expect(body.parentId).toBeUndefined();
    });
  });

  describe("auth", () => {
    it("sends Basic auth with base64(email:token)", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "GET",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: { id: "1", title: "t", version: { number: 1 } },
          },
        },
        {
          match: (r) => r.method === "PUT",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: { id: "1", title: "t", version: { number: 2 } },
          },
        },
      ]);

      await publishConfluencePage(
        { adf: validAdf, pageId: "1", baseUrl: "https://x/wiki" },
        { auth: { email: "jag@example.com", token: "secret-token" }, fetch },
      );

      const expected = `Basic ${Buffer.from(
        "jag@example.com:secret-token",
      ).toString("base64")}`;
      expect(requests[0].headers.Authorization).toBe(expected);
      expect(requests[0].headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("url fallback", () => {
    it("builds a fallback URL when _links.webui is absent", async () => {
      const { fetch } = mockFetch([
        {
          match: (r) => r.method === "GET",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: { id: "77", title: "t", version: { number: 1 } },
          },
        },
        {
          match: (r) => r.method === "PUT",
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: { id: "77", title: "t", version: { number: 2 } },
          },
        },
      ]);

      const result = await publishConfluencePage(
        { adf: validAdf, pageId: "77", baseUrl: "https://acme.atlassian.net/wiki/" },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      // Trailing slash should be stripped, fallback URL constructed
      expect(result.url).toBe("https://acme.atlassian.net/wiki/pages/77");
    });
  });
});
