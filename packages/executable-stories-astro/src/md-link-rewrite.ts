/**
 * Remark plugin: rewrite relative `*.md` / `*.mdx` links to their built routes.
 *
 * Markdown authored for GitHub cross-references sibling files with relative
 * links like `[ops](./operations-playbook.md)`. In a built site each file
 * becomes a *directory* route (`operations-playbook.md` -> `…/operations-playbook/`),
 * so the raw `.md` link 404s, and Astro only resolves some of them.
 *
 * The rewrite is purely relative, so it needs no knowledge of where the docs are
 * mounted and works for docs at any base: because every `.md` file becomes a
 * trailing-slash directory, a sibling `./x.md` is one level up — `../x/` — and a
 * `#hash` is preserved. Dependency-free, and never throws (a rewrite hiccup must
 * not break a page).
 *
 * Note (Astro 7): the default markdown processor is now Sätteri (Rust), which
 * does NOT run remark plugins — `markdown.remarkPlugins` only applies if you
 * install `@astrojs/markdown-remark` and opt into the `unified()` processor.
 * `authoredDocsLoader` therefore does the rewrite in the loader (processor-
 * agnostic) and re-exports the same `rewriteMdLink` logic. Use this remark
 * plugin only if you run the unified pipeline yourself:
 *
 *   import { unified } from "@astrojs/markdown-remark";
 *   import { mdLinkRewrite } from "executable-stories-astro";
 *   markdown: { processor: unified({ remarkPlugins: [mdLinkRewrite()] }) }
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MdLinkRewriteOptions {}

interface MdastNode {
  type: string;
  url?: string;
  children?: MdastNode[];
}

const MD_EXT = /\.(md|mdx)$/i;
const HAS_MD = /\.(md|mdx)(#|$)/i;

function isExternal(url: string): boolean {
  return (
    url.startsWith("/") ||
    url.startsWith("#") ||
    url.startsWith("mailto:") ||
    /^[a-z][a-z0-9+.-]*:/i.test(url) // any scheme (http:, https:, tel:, ...)
  );
}

/** Split a link target into its path and optional `#hash`. */
function splitHash(url: string): [string, string] {
  const i = url.indexOf("#");
  return i === -1 ? [url, ""] : [url.slice(0, i), url.slice(i)];
}

/**
 * Rewrite one relative markdown link to its route. Returns null to leave the
 * link untouched (external, absolute, anchor, or not a markdown link).
 */
export function rewriteMdLink(url: string): string | null {
  if (isExternal(url) || !HAS_MD.test(url)) return null;
  const [target, hash] = splitHash(url);
  // Drop a single leading "./"; keep any "../" prefixes as-is.
  const rel = target.replace(/^\.\//, "").replace(MD_EXT, "");
  // Each source file is now a directory route, so the sibling is one level up.
  return `../${rel}/${hash}`.replace(/([^:])\/{2,}/g, "$1/");
}

function walk(node: MdastNode): void {
  if (node.type === "link" && typeof node.url === "string") {
    const next = rewriteMdLink(node.url);
    if (next != null) node.url = next;
  }
  if (node.children) for (const child of node.children) walk(child);
}

/** The remark plugin factory. */
export function mdLinkRewrite(_options: MdLinkRewriteOptions = {}) {
  return function transformer(tree: MdastNode): void {
    try {
      walk(tree);
    } catch {
      // A link-rewrite failure must never break document rendering.
    }
  };
}
