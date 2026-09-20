/**
 * Jev (TypeSafe AI "System One"): bounded semantic judgments behind the
 * deterministic agent commands. Rules run first and stay authoritative. Jev
 * fills what rules leave blank (`triage` failures with no `covers`, `goal`
 * scenarios rewritten without shrinking, `review` claims with no `change:*`
 * tag). Every answer carries its probability, so each threshold lives in code
 * next to its consequence.
 *
 * Without `JEV_API_KEY` there is no client and every command produces its
 * deterministic output. With it, Jev adds suggestions and advisories; exit
 * codes stay rule-driven.
 */

export const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";

export type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string | null> }
  | { type: "score"; instructions: string; criteria: string[] };

export type JevAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; confidence: number };

export interface JevClient {
  model: string;
  ask(state: unknown, questions: Record<string, JevQuestion>): Promise<Record<string, JevAnswer>>;
}

export interface JevClientOptions {
  apiKey: string;
  model?: string;
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export function createJevClient(options: JevClientOptions): JevClient {
  const {
    apiKey,
    model = JEV_MODEL,
    endpoint = JEV_ENDPOINT,
    fetch = globalThis.fetch,
    timeoutMs = 10_000,
  } = options;
  return {
    model,
    // One attempt per question set; add backoff on 429/529 if a loop hits rate limits.
    async ask(state, questions) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, state, questions }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`Jev ${response.status}: ${(await response.text()).slice(0, 200)}`);
      const body = (await response.json()) as { answers?: Record<string, JevAnswer> };
      if (!body.answers) throw new Error("Jev response has no answers");
      return body.answers;
    },
  };
}

/** A client when `JEV_API_KEY` is set, else undefined (deterministic output only). */
export function jevFromEnv(env: NodeJS.ProcessEnv = process.env): JevClient | undefined {
  const apiKey = env.JEV_API_KEY;
  if (!apiKey) return undefined;
  return createJevClient({
    apiKey,
    ...(env.JEV_MODEL ? { model: env.JEV_MODEL } : {}),
    ...(env.JEV_ENDPOINT ? { endpoint: env.JEV_ENDPOINT } : {}),
  });
}

/** Answer as a choice, or undefined when Jev returned a different shape. */
export function asChoice(answer: JevAnswer | undefined): Extract<JevAnswer, { type: "choice" }> | undefined {
  return answer?.type === "choice" ? answer : undefined;
}

export function asNoul(answer: JevAnswer | undefined): number | undefined {
  return answer?.type === "noul" ? answer.noul : undefined;
}
