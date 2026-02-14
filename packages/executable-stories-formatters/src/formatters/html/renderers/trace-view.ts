/**
 * Render an OTel trace waterfall (fn(args, deps)).
 */

import type { OtelSpan } from "../../../types/otel";

export interface RenderTraceViewArgs {
  spans: OtelSpan[] | undefined;
}

export interface RenderTraceViewDeps {
  escapeHtml: (str: string) => string;
}

interface NormalizedSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeMs: number;
  durationMs: number;
  status: "ok" | "error" | "unset";
  statusMessage?: string;
  attributes?: Record<string, unknown>;
}

interface TreeNode {
  span: NormalizedSpan;
  children: TreeNode[];
  depth: number;
}

const VALID_STATUSES = new Set<string>(["ok", "error", "unset"]);
const TOOLTIP_MAX_LENGTH = 4096;

function safeStatus(status: string): "ok" | "error" | "unset" {
  return VALID_STATUSES.has(status) ? (status as "ok" | "error" | "unset") : "unset";
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeSpans(spans: OtelSpan[]): NormalizedSpan[] {
  const result: NormalizedSpan[] = [];
  for (const span of spans) {
    if (!span || typeof span !== "object") continue;
    if (typeof span.spanId !== "string" || typeof span.name !== "string") continue;

    let startTimeMs: number;
    let durationMs: number;

    if (span.startTimeMs != null && span.durationMs != null) {
      startTimeMs = span.startTimeMs;
      durationMs = span.durationMs;
    } else if (span.startTimeUnixNano != null && span.endTimeUnixNano != null) {
      startTimeMs = span.startTimeUnixNano / 1e6;
      durationMs = (span.endTimeUnixNano - span.startTimeUnixNano) / 1e6;
    } else {
      continue;
    }

    durationMs = Math.max(0, durationMs);
    if (!isFinite(startTimeMs) || !isFinite(durationMs)) continue;

    result.push({
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      startTimeMs,
      durationMs,
      status: safeStatus(span.status),
      statusMessage: span.statusMessage,
      attributes: span.attributes,
    });
  }
  return result;
}

function buildTree(spans: NormalizedSpan[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const span of spans) {
    let key = span.spanId;
    if (byId.has(key)) {
      let suffix = 2;
      while (byId.has(`${span.spanId}__dup${suffix}`)) suffix++;
      key = `${span.spanId}__dup${suffix}`;
    }
    byId.set(key, { span: { ...span, spanId: key }, children: [], depth: 0 });
  }

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.span.parentSpanId;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by startTimeMs within each parent
  for (const node of byId.values()) {
    node.children.sort((a, b) => a.span.startTimeMs - b.span.startTimeMs);
  }
  roots.sort((a, b) => a.span.startTimeMs - b.span.startTimeMs);

  // Assign depths via DFS with cycle guard
  const visited = new Set<string>();
  function assignDepth(node: TreeNode, depth: number): void {
    if (visited.has(node.span.spanId)) return;
    visited.add(node.span.spanId);
    node.depth = depth;
    for (const child of node.children) {
      assignDepth(child, depth + 1);
    }
  }
  for (const root of roots) {
    assignDepth(root, 0);
  }

  // Promote any unvisited nodes to roots (handles cycles like A→B, B→A)
  for (const node of byId.values()) {
    if (!visited.has(node.span.spanId)) {
      node.children = [];
      roots.push(node);
      assignDepth(node, 0);
    }
  }
  roots.sort((a, b) => a.span.startTimeMs - b.span.startTimeMs);

  return roots;
}

function flattenTree(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(node: TreeNode): void {
    result.push(node);
    for (const child of node.children) {
      walk(child);
    }
  }
  for (const root of roots) {
    walk(root);
  }
  return result;
}

function buildTooltip(
  span: NormalizedSpan,
  escapeHtml: (s: string) => string,
): string {
  const parts: string[] = [];
  parts.push(`${span.name} (${formatDuration(span.durationMs)})`);

  if (span.statusMessage) {
    parts.push(`Status: ${span.statusMessage}`);
  }

  if (span.attributes) {
    const keys = Object.keys(span.attributes).sort();
    for (const key of keys) {
      const val = span.attributes[key];
      const formatted = Array.isArray(val)
        ? `[${val.map((v) => String(v)).join(", ")}]`
        : String(val);
      parts.push(`${key}=${formatted}`);
    }
  }

  let text = parts.join("\n");
  if (text.length > TOOLTIP_MAX_LENGTH) {
    text = text.slice(0, TOOLTIP_MAX_LENGTH - 3) + "...";
  }

  return escapeHtml(text);
}

export function renderTraceView(
  args: RenderTraceViewArgs,
  deps: RenderTraceViewDeps,
): string {
  if (!args.spans || args.spans.length === 0) return "";

  const normalized = normalizeSpans(args.spans);
  if (normalized.length === 0) return "";

  const roots = buildTree(normalized);
  const flat = flattenTree(roots);

  // Compute relative scale
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const node of flat) {
    const s = node.span.startTimeMs;
    const e = s + node.span.durationMs;
    if (s < minStart) minStart = s;
    if (e > maxEnd) maxEnd = e;
  }
  let totalDuration = maxEnd - minStart;
  if (totalDuration <= 0) totalDuration = 1;

  // Render rows
  const rows = flat
    .map((node) => {
      const { span, depth } = node;
      const indent = depth * 16;
      const minWidth = 0.5;
      let spanLeft = clamp(
        ((span.startTimeMs - minStart) / totalDuration) * 100,
        0,
        100,
      );
      // Nudge left so the min-width bar stays within bounds
      if (spanLeft + minWidth > 100) {
        spanLeft = 100 - minWidth;
      }
      const spanWidth = clamp(
        (span.durationMs / totalDuration) * 100,
        minWidth,
        100 - spanLeft,
      );
      const tooltip = buildTooltip(span, deps.escapeHtml);
      const durationLabel = formatDuration(span.durationMs);

      return `    <div class="trace-view-row">
      <div class="trace-view-name" style="padding-left: ${indent}px" title="${deps.escapeHtml(span.name)}">
        <span class="trace-view-status-dot trace-view-status-${span.status}"></span>
        ${deps.escapeHtml(span.name)}
      </div>
      <div class="trace-view-bar-container">
        <div class="trace-view-bar trace-view-bar-${span.status}" style="left: ${spanLeft.toFixed(2)}%; width: ${spanWidth.toFixed(2)}%" title="${tooltip}">${durationLabel}</div>
      </div>
    </div>`;
    })
    .join("\n");

  const axisEnd = formatDuration(maxEnd - minStart);

  return `<div class="trace-view collapsed">
  <div class="trace-view-header" role="button" tabindex="0" aria-expanded="false">
    <span>Spans</span>
    <span class="trace-view-count">${flat.length}</span>
    <span class="chevron">&#9660;</span>
  </div>
  <div class="trace-view-content">
    <div class="trace-view-axis">
      <span>0ms</span>
      <span>${axisEnd}</span>
    </div>
${rows}
  </div>
</div>`;
}
