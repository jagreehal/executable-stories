/**
 * Tests for the Jira publisher.
 */

import { describe, it, expect } from "vitest";
import { publishJiraIssue } from "../../src/publishers/jira";
import type { FetchFn } from "../../src/publishers/confluence";

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

describe("publishJiraIssue", () => {
  describe("validation", () => {
    it("rejects invalid JSON", async () => {
      await expect(
        publishJiraIssue(
          { adf: "{bad", issueKey: "X-1", baseUrl: "https://x" },
          { auth: { email: "a@b.com", token: "t" } },
        ),
      ).rejects.toThrow(/not valid JSON/);
    });

    it("rejects JSON that isn't an ADF doc envelope", async () => {
      await expect(
        publishJiraIssue(
          {
            adf: JSON.stringify({ foo: 1 }),
            issueKey: "X-1",
            baseUrl: "https://x",
          },
          { auth: { email: "a@b.com", token: "t" } },
        ),
      ).rejects.toThrow(/ADF payload must be an object/);
    });

    it("requires an issueKey", async () => {
      await expect(
        publishJiraIssue(
          { adf: validAdf, issueKey: "", baseUrl: "https://x" },
          { auth: { email: "a@b.com", token: "t" } },
        ),
      ).rejects.toThrow(/issueKey/);
    });
  });

  describe("comment mode (default)", () => {
    it("POSTs ADF to the comment endpoint as a native JSON object", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "POST",
          response: {
            ok: true,
            status: 201,
            statusText: "Created",
            body: { id: "10001", self: "https://x/rest/.../comment/10001" },
          },
        },
      ]);

      const result = await publishJiraIssue(
        {
          adf: validAdf,
          issueKey: "PROJ-123",
          baseUrl: "https://acme.atlassian.net",
        },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      expect(result.action).toBe("comment-added");
      expect(result.issueKey).toBe("PROJ-123");
      expect(result.commentId).toBe("10001");
      expect(result.url).toBe(
        "https://acme.atlassian.net/browse/PROJ-123?focusedCommentId=10001",
      );

      const req = requests[0];
      expect(req.method).toBe("POST");
      expect(req.url).toBe(
        "https://acme.atlassian.net/rest/api/3/issue/PROJ-123/comment",
      );

      // Body must wrap the ADF object (not a stringified ADF) under .body
      const body = JSON.parse(req.body!);
      expect(body.body).toEqual(JSON.parse(validAdf));
    });

    it("strips trailing slash from baseUrl", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "POST",
          response: {
            ok: true,
            status: 201,
            statusText: "Created",
            body: { id: "42" },
          },
        },
      ]);

      await publishJiraIssue(
        {
          adf: validAdf,
          issueKey: "X-1",
          baseUrl: "https://x.atlassian.net/",
        },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      expect(requests[0].url).toBe(
        "https://x.atlassian.net/rest/api/3/issue/X-1/comment",
      );
    });

    it("propagates error response with status code and body", async () => {
      const { fetch } = mockFetch([
        {
          match: (r) => r.method === "POST",
          response: {
            ok: false,
            status: 403,
            statusText: "Forbidden",
            body: { errorMessages: ["No permission"] },
          },
        },
      ]);

      await expect(
        publishJiraIssue(
          { adf: validAdf, issueKey: "PROJ-1", baseUrl: "https://x" },
          { auth: { email: "a@b.com", token: "t" }, fetch },
        ),
      ).rejects.toThrow(/403 Forbidden/);
    });
  });

  describe("description mode", () => {
    it("PUTs ADF into fields.description as a native JSON object", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "PUT",
          response: {
            ok: true,
            status: 204,
            statusText: "No Content",
            body: null,
          },
        },
      ]);

      const result = await publishJiraIssue(
        {
          adf: validAdf,
          issueKey: "PROJ-123",
          baseUrl: "https://acme.atlassian.net",
          mode: "description",
        },
        { auth: { email: "a@b.com", token: "t" }, fetch },
      );

      expect(result.action).toBe("description-updated");
      expect(result.issueKey).toBe("PROJ-123");
      expect(result.commentId).toBeUndefined();
      expect(result.url).toBe("https://acme.atlassian.net/browse/PROJ-123");

      const req = requests[0];
      expect(req.method).toBe("PUT");
      expect(req.url).toBe(
        "https://acme.atlassian.net/rest/api/3/issue/PROJ-123",
      );
      const body = JSON.parse(req.body!);
      expect(body).toEqual({ fields: { description: JSON.parse(validAdf) } });
    });

    it("propagates PUT failures", async () => {
      const { fetch } = mockFetch([
        {
          match: (r) => r.method === "PUT",
          response: {
            ok: false,
            status: 400,
            statusText: "Bad Request",
            body: { errors: { description: "Invalid ADF" } },
          },
        },
      ]);

      await expect(
        publishJiraIssue(
          {
            adf: validAdf,
            issueKey: "PROJ-1",
            baseUrl: "https://x",
            mode: "description",
          },
          { auth: { email: "a@b.com", token: "t" }, fetch },
        ),
      ).rejects.toThrow(/400 Bad Request/);
    });
  });

  describe("auth", () => {
    it("sends Basic auth with base64(email:token)", async () => {
      const { fetch, requests } = mockFetch([
        {
          match: (r) => r.method === "POST",
          response: {
            ok: true,
            status: 201,
            statusText: "Created",
            body: { id: "1" },
          },
        },
      ]);

      await publishJiraIssue(
        { adf: validAdf, issueKey: "X-1", baseUrl: "https://x" },
        { auth: { email: "jag@example.com", token: "jira-token" }, fetch },
      );

      const expected = `Basic ${Buffer.from(
        "jag@example.com:jira-token",
      ).toString("base64")}`;
      expect(requests[0].headers.Authorization).toBe(expected);
      expect(requests[0].headers["Content-Type"]).toBe("application/json");
    });
  });
});
