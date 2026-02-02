// Keywords
export type StepKeyword = "Given" | "When" | "Then" | "And" | "But";

// Doc entries - discriminated union
export type DocEntry =
  | { type: "note"; text: string }
  | { type: "tag"; name: string; value?: string }
  | { type: "kv"; key: string; value: string }
  | { type: "code"; code: string; language?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "link"; url: string; text?: string }
  | { type: "section"; title: string; entries: DocEntry[] }
  | { type: "mermaid"; code: string }
  | { type: "screenshot"; path: string; alt?: string }
  | { type: "custom"; name: string; data: unknown };

// Step metadata (serialized result)
export interface StoryStep {
  keyword: StepKeyword;
  text: string;
  status?: "passed" | "failed" | "skipped" | "todo" | "pending";
  duration?: number;
  docs: DocEntry[];
}

// Story metadata (serialized result)
export interface StoryMeta {
  title: string;
  steps: StoryStep[];
  tags?: string[];
  ticket?: string;
  meta?: Record<string, unknown>;
  status?: "passed" | "failed" | "skipped" | "todo";
  duration?: number;
}

// Story options (input when defining a story)
export interface StoryOptions {
  tags?: string[];
  ticket?: string;
  meta?: Record<string, unknown>;
}
