/**
 * Text round-tripping shared by adapters.
 *
 * Test-management systems store a step as one string with no notion of a BDD
 * keyword, and have one description field with no notion of links. Both get
 * flattened on the way out and parsed back on the way in.
 *
 * These must stay exactly symmetrical: the drift guard hashes what we read back
 * from the provider, so an asymmetric encode/decode would report every case as
 * edited by a human on the very next run.
 */

const BDD_KEYWORDS = ["Given", "When", "Then", "And", "But"];

export function encodeStepText(step: { keyword: string; text: string }): string {
  const keyword = step.keyword.trim();
  return keyword ? `${keyword} ${step.text}` : step.text;
}

export function decodeStepText(content: string): { keyword: string; text: string } {
  const trimmed = content.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace > 0) {
    const head = trimmed.slice(0, firstSpace);
    if (BDD_KEYWORDS.some((keyword) => keyword.toLowerCase() === head.toLowerCase())) {
      return { keyword: head, text: trimmed.slice(firstSpace + 1) };
    }
  }
  return { keyword: "", text: trimmed };
}

/** Links become a trailing markdown list so they survive a round trip. */
export function encodeDescription(body: {
  description: string;
  links: ReadonlyArray<{ label: string; url: string }>;
}): string {
  if (body.links.length === 0) return body.description;
  const links = body.links.map((link) => `- [${link.label}](${link.url})`).join("\n");
  return `${body.description}\n\n${links}`;
}

export function decodeDescription(raw: string): {
  description: string;
  links: Array<{ label: string; url: string }>;
} {
  const links: Array<{ label: string; url: string }> = [];
  const lines = raw.split("\n");
  let cut = lines.length;

  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index]!.trim();
    if (line === "") continue;
    const match = /^- \[([^\]]+)\]\(([^)]+)\)$/.exec(line);
    if (!match) break;
    links.unshift({ label: match[1]!, url: match[2]! });
    cut = index;
  }

  return { description: lines.slice(0, cut).join("\n").trim(), links };
}
