/**
 * Type tests for NormalizedTicket and StoryMeta.tickets.
 *
 * Verifies that NormalizedTicket accepts {id: string} and {id: string, url: string},
 * and that StoryMeta.tickets uses NormalizedTicket[].
 */

import { describe, it, expect } from "vitest";
import type { NormalizedTicket, StoryMeta } from "../../src/types/story";

describe("NormalizedTicket type", () => {
  it("should accept {id: string}", () => {
    const ticket: NormalizedTicket = { id: "JIRA-123" };
    expect(ticket.id).toBe("JIRA-123");
    expect(ticket.url).toBeUndefined();
  });

  it("should accept {id: string, url: string}", () => {
    const ticket: NormalizedTicket = {
      id: "PAY-1042",
      url: "https://jira.example.com/browse/PAY-1042",
    };
    expect(ticket.id).toBe("PAY-1042");
    expect(ticket.url).toBe("https://jira.example.com/browse/PAY-1042");
  });

  it("should be used as StoryMeta.tickets element type", () => {
    const meta: StoryMeta = {
      scenario: "test scenario",
      steps: [],
      tickets: [
        { id: "JIRA-100" },
        { id: "PAY-200", url: "https://jira.example.com/browse/PAY-200" },
      ],
    };
    expect(meta.tickets).toHaveLength(2);
    expect(meta.tickets![0].id).toBe("JIRA-100");
    expect(meta.tickets![1].url).toBe("https://jira.example.com/browse/PAY-200");
  });
});
