/**
 * View state in the URL, so a filtered report survives a refresh and can be
 * shared as a link.
 *
 * It lives in the HASH, not the query string, because the flagship surface is a
 * single HTML file opened from disk. A `file://` document has an opaque origin,
 * and Chrome refuses `history.pushState`/`replaceState` when the URL argument
 * changes anything but the fragment there. The fragment is the one part every
 * browser lets us rewrite in place.
 *
 * Format: `#<anchor>?<params>` — the anchor half stays exactly what it has
 * always been, a scenario id deep link, so existing permalinks keep working and
 * a link with no filters is unchanged.
 */

export type UrlStatusFilter = "all" | "passed" | "failed" | "skipped" | "pending";

export interface ReportUrlState {
  query: string;
  status: UrlStatusFilter;
  /** Scenario tag filter; a scenario matches if it carries ANY of these. */
  tags: string[];
  detail: "full" | "minimal";
}

export const DEFAULT_URL_STATE: ReportUrlState = {
  query: "",
  status: "all",
  tags: [],
  detail: "full",
};

const STATUSES: readonly UrlStatusFilter[] = ["all", "passed", "failed", "skipped", "pending"];

export interface SplitHash {
  /** Scenario id deep link (may be empty). */
  anchor: string;
  params: URLSearchParams;
}

export function splitHash(hash: string): SplitHash {
  const raw = hash.replace(/^#/, "");
  const split = raw.indexOf("?");
  if (split === -1) return { anchor: raw, params: new URLSearchParams() };
  return { anchor: raw.slice(0, split), params: new URLSearchParams(raw.slice(split + 1)) };
}

export function decodeUrlState(params: URLSearchParams): ReportUrlState {
  const status = params.get("status");
  const tags = params.get("tags");
  return {
    query: params.get("q") ?? DEFAULT_URL_STATE.query,
    status: STATUSES.includes(status as UrlStatusFilter)
      ? (status as UrlStatusFilter)
      : DEFAULT_URL_STATE.status,
    tags: tags ? tags.split(",").filter(Boolean) : [],
    detail: params.get("docs") === "0" ? "minimal" : "full",
  };
}

/** Only non-default values reach the URL, so an untouched report has a clean one. */
export function encodeUrlState(state: ReportUrlState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.status !== "all") params.set("status", state.status);
  if (state.tags.length > 0) params.set("tags", state.tags.join(","));
  if (state.detail === "minimal") params.set("docs", "0");
  return params.toString();
}

export function formatHash(anchor: string, params: string): string {
  if (params) return `#${anchor}?${params}`;
  return anchor ? `#${anchor}` : "";
}

/**
 * Rewrite the fragment without adding a history entry or reloading. Falls back
 * to assigning `location.hash` where the History API refuses the change (a
 * `file://` document in Chrome); that costs a history entry, which is why every
 * caller debounces keystroke-rate updates.
 */
export function writeHash(anchor: string, params: string): void {
  if (typeof window === "undefined") return;
  const next = formatHash(anchor, params);
  if (next === window.location.hash) return;
  // No fragment at all: strip it rather than leaving a bare "#".
  const url = next || window.location.href.split("#")[0];
  try {
    window.history.replaceState(window.history.state, "", url);
  } catch {
    window.location.hash = next.slice(1);
  }
}
