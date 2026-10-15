export const MARKER: string;

export interface Shot {
  name: string;
  ok: boolean;
  codes: string[];
  error: string | null;
  screenshot: string;
  compare?: {
    status: 'same' | 'changed' | 'new';
    ratio: number;
    image: string | null;
  };
}

export function buildComment(input: {
  shots: Shot[];
  affected: { name: string; reasons: { kind: string; detail: string }[] }[];
  unmatched: string[];
  all: boolean;
  links: Record<string, string>;
  sha: string;
  note?: string;
}): string;
