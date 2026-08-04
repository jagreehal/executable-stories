/**
 * Renderers for the two narrative block types an agent reaches for when it
 * explains a change: a file map and a data shape.
 *
 * They ride on `story.custom({ type, data })`, so every adapter can already
 * emit them with no API change; only the renderer is new. Register them with
 * `customRenderers` (the standalone report island does this by default).
 *
 * These blocks describe, they do not prove. Nothing here executed, so a block
 * whose `data.authored` says an agent wrote it renders a visible marker. A
 * picture that looks as trustworthy as a passing test, without being one, is
 * the failure mode this whole report exists to avoid.
 */

import type { ReportDocCustom } from "executable-stories-core";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

export const FILE_TREE_TYPE = "file-tree";
export const DATA_MODEL_TYPE = "data-model";

/** Change annotation shared by both blocks. */
type ChangeKind = "added" | "modified" | "removed" | "renamed";

function isChangeKind(value: unknown): value is ChangeKind {
  return value === "added" || value === "modified" || value === "removed" || value === "renamed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * "Written by an agent, not verified by a run." Only rendered when the author
 * says so; there is no way to detect it after the fact, which is exactly why
 * the authoring skills are told to set it.
 */
function AuthoredMarker({ authored }: { authored?: string }) {
  if (authored !== "agent") return null;
  return (
    <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
      AI-authored, not verified by a run
    </Badge>
  );
}

function BlockFrame({
  title,
  authored,
  children,
}: {
  title?: string;
  authored?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-3">
      {title || authored === "agent" ? (
        <figcaption className="mb-1.5 flex flex-wrap items-center gap-2">
          {title ? <span className="text-xs font-medium text-muted-foreground">{title}</span> : null}
          <AuthoredMarker authored={authored} />
        </figcaption>
      ) : null}
      {children}
    </figure>
  );
}

/**
 * Deliberately uncoloured. In this report colour carries test status, so a
 * green "added" badge beside a failing scenario would read as a pass. The word
 * does the work.
 */
function ChangeBadge({ change }: { change: ChangeKind }) {
  return (
    <Badge variant="tag" className="text-[10px]">
      {change}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// file-tree
// ---------------------------------------------------------------------------

interface FileEntry {
  path: string;
  change?: ChangeKind;
  note?: string;
}

export interface FileTreeData {
  title?: string;
  authored?: string;
  files: FileEntry[];
}

export function parseFileTree(data: unknown): FileTreeData | undefined {
  if (!isRecord(data) || !Array.isArray(data.files)) return undefined;
  const files: FileEntry[] = [];
  for (const raw of data.files) {
    // A bare string is a path; anything without one is not a file.
    if (typeof raw === "string") {
      if (raw) files.push({ path: raw });
      continue;
    }
    if (!isRecord(raw)) continue;
    const path = str(raw.path);
    if (!path) continue;
    files.push({
      path,
      change: isChangeKind(raw.change) ? raw.change : undefined,
      note: str(raw.note),
    });
  }
  if (files.length === 0) return undefined;
  return { title: str(data.title), authored: str(data.authored), files };
}

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  file?: FileEntry;
}

/** Flat paths in, nested directories out. Sorting puts folders before files. */
function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: "", children: new Map() };
  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let node = root;
    segments.forEach((segment, index) => {
      let child = node.children.get(segment);
      if (!child) {
        child = { name: segment, children: new Map() };
        node.children.set(segment, child);
      }
      if (index === segments.length - 1) child.file = file;
      node = child;
    });
  }
  return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return [...node.children.values()].sort((a, b) => {
    const aDir = a.children.size > 0;
    const bDir = b.children.size > 0;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  const children = sortedChildren(node);
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "ml-3 border-l border-border/60 pl-3")}>
      {children.map((child) => {
        const isDir = child.children.size > 0;
        return (
          <li key={child.name}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-xs",
                  isDir ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {isDir ? `${child.name}/` : child.name}
              </span>
              {child.file?.change ? <ChangeBadge change={child.file.change} /> : null}
              {child.file?.note ? (
                <span className="text-xs text-muted-foreground">{child.file.note}</span>
              ) : null}
            </div>
            {isDir ? <TreeBranch node={child} depth={depth + 1} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function FileTreeBlock({ entry }: { entry: ReportDocCustom }) {
  const data = parseFileTree(entry.data);
  if (!data) return <UnreadableBlock entry={entry} />;
  return (
    <BlockFrame title={data.title ?? "Files changed"} authored={data.authored}>
      <div tabIndex={0} className="overflow-x-auto rounded-md border border-border bg-card p-3">
        <TreeBranch node={buildTree(data.files)} depth={0} />
      </div>
    </BlockFrame>
  );
}

// ---------------------------------------------------------------------------
// data-model
// ---------------------------------------------------------------------------

interface ModelField {
  name: string;
  type?: string;
  note?: string;
  change?: ChangeKind;
}

export interface DataModelData {
  title?: string;
  authored?: string;
  name?: string;
  fields: ModelField[];
}

export function parseDataModel(data: unknown): DataModelData | undefined {
  if (!isRecord(data) || !Array.isArray(data.fields)) return undefined;
  const fields: ModelField[] = [];
  for (const raw of data.fields) {
    if (!isRecord(raw)) continue;
    const name = str(raw.name);
    if (!name) continue;
    fields.push({
      name,
      type: str(raw.type),
      note: str(raw.note),
      change: isChangeKind(raw.change) ? raw.change : undefined,
    });
  }
  if (fields.length === 0) return undefined;
  return {
    title: str(data.title),
    authored: str(data.authored),
    name: str(data.name),
    fields,
  };
}

export function DataModelBlock({ entry }: { entry: ReportDocCustom }) {
  const data = parseDataModel(entry.data);
  if (!data) return <UnreadableBlock entry={entry} />;
  const hasNotes = data.fields.some((f) => f.note);
  return (
    <BlockFrame title={data.title ?? data.name ?? "Data model"} authored={data.authored}>
      <div tabIndex={0} className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="border-b border-border px-3 py-2 text-left font-semibold">
                Field
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-left font-semibold">
                Type
              </th>
              {hasNotes ? (
                <th scope="col" className="border-b border-border px-3 py-2 text-left font-semibold">
                  Note
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.fields.map((field) => (
              <tr key={field.name}>
                <td className="border-b border-border px-3 py-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{field.name}</span>
                    {field.change ? <ChangeBadge change={field.change} /> : null}
                  </span>
                </td>
                <td className="border-b border-border px-3 py-2 font-mono text-xs text-muted-foreground">
                  {field.type ?? ""}
                </td>
                {hasNotes ? (
                  <td className="border-b border-border px-3 py-2 text-foreground">
                    {field.note ?? ""}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockFrame>
  );
}

// ---------------------------------------------------------------------------

/**
 * Shape we could not read. Show the raw data rather than nothing: a malformed
 * block is a bug in whatever wrote it, and hiding it hides the bug.
 */
function UnreadableBlock({ entry }: { entry: ReportDocCustom }) {
  return (
    <div className="my-2" data-type={entry.type}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {entry.type} (unrecognised shape)
      </p>
      <pre
        tabIndex={0}
        className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"
      >
        {safeStringify(entry.data)}
      </pre>
    </div>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * The narrative block renderers, ready to spread into `customRenderers`.
 * Consumer-supplied renderers for the same type win, so a project can swap
 * either one out.
 */
export const narrativeBlockRenderers = {
  [FILE_TREE_TYPE]: (entry: ReportDocCustom) => <FileTreeBlock entry={entry} />,
  [DATA_MODEL_TYPE]: (entry: ReportDocCustom) => <DataModelBlock entry={entry} />,
};
