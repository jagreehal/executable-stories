/**
 * Content loader for hand-authored markdown that may live OUTSIDE the site and
 * may have NO frontmatter — e.g. an existing `apps/cdk/docs/` folder full of
 * plain `.md` runbooks.
 *
 * It wraps Astro's built-in `glob` loader (so you keep full markdown rendering,
 * images, and HMR) and fills in a missing `title` from the file's first H1
 * before schema validation runs. That's the one field Starlight's `docsSchema`
 * requires, so plain GitHub-style docs import without edits.
 *
 *   import { defineCollection } from "astro:content";
 *   import { docsSchema } from "@astrojs/starlight/schema";
 *   import { authoredDocsLoader } from "executable-stories-astro";
 *
 *   export const collections = {
 *     docs: defineCollection({
 *       loader: authoredDocsLoader({ path: "../apps/cdk/docs" }),
 *       schema: docsSchema(),
 *     }),
 *   };
 *
 * Pair it with the `mdLinkRewrite` remark plugin so the docs' relative `*.md`
 * cross-links resolve to routes.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { glob } from "astro/loaders";
import type { Loader, LoaderContext } from "astro/loaders";

import type { ExecutableStoriesConfig } from "./config.js";
import {
  auditExplainerAgainstEntries,
  explainerBannerHtml,
  loadAuditEntries,
} from "./explainer-status.js";
import type { StoryEntryData } from "./loader.js";
import { rewriteMdLink } from "./md-link-rewrite.js";

export interface AuthoredDocsLoaderOptions {
  /** Folder of `.md`/`.mdx` files. Relative paths resolve from the project root. */
  path: string;
  /**
   * URL/route prefix the docs mount under (e.g. "runbooks" -> `/runbooks/<file>`).
   * Prefixes each entry id so the routes and Starlight sidebar `autogenerate`
   * line up. Omit to mount at the docs root.
   */
  base?: string;
  /** Glob pattern within the folder. Default "**\/*.{md,mdx}". */
  pattern?: string;
  /**
   * Pass the shared executable-stories config to turn on explainer freshness
   * banners: any doc whose frontmatter has an `explainer` provenance block
   * (see the explain-change skill) gets a fresh/stale banner injected at the
   * top, with deep links to the cited scenarios' story pages. Docs without
   * the block are untouched.
   */
  explainers?: ExecutableStoriesConfig;
}

/** Title-case a file stem as a last-resort title ("deploy-prechecks" -> "Deploy Prechecks"). */
function titleFromStem(filePath: string): string {
  const stem = path.basename(filePath).replace(/\.[^.]+$/, "");
  return stem
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** First `# H1` from markdown, ignoring frontmatter. */
function firstHeading(raw: string): string | undefined {
  // Strip a leading frontmatter block so a `# ` inside it can't match.
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const m = body.match(/^#[ \t]+(.+?)[ \t]*#*\s*$/m);
  return m ? m[1].trim() : undefined;
}

/**
 * Glob loader that auto-fills a missing `title`. Validation (which requires
 * `title`) happens in `context.parseData`, so we intercept it there: when the
 * frontmatter has no title, read the file and inject the H1 (or a title-cased
 * filename) before delegating to the real validator.
 */
export function authoredDocsLoader(options: AuthoredDocsLoaderOptions): Loader {
  const base = options.base?.replace(/^\/+|\/+$/g, "");
  // glob's `base` resolves relative to the project root; an absolute external
  // folder must be passed as a file URL.
  const globBase = path.isAbsolute(options.path) ? pathToFileURL(options.path) : options.path;
  const inner = glob({
    pattern: options.pattern ?? "**/*.{md,mdx}",
    base: globBase,
    // Prefix ids with `base` so routes become `/<base>/<file>` and Starlight's
    // `autogenerate: { directory: base }` sidebar finds them.
    generateId: ({ entry }: { entry: string }) => {
      const stem = entry.replace(/\.(md|mdx)$/i, "").replace(/\/index$/i, "");
      return base ? `${base}/${stem}` : stem;
    },
  });
  return {
    name: "executable-stories-authored-docs",
    load: async (context: LoaderContext) => {
      // Intercept parseData (where Astro validates frontmatter) to inject a
      // missing title before validation. Cast to preserve the generic signature.
      const parseData = (async (props: {
        id: string;
        data: Record<string, unknown>;
        filePath?: string;
      }) => {
        if (props.filePath && (props.data?.title == null || props.data.title === "")) {
          let title: string | undefined;
          try {
            title = firstHeading(fs.readFileSync(props.filePath, "utf8"));
          } catch {
            /* fall through to filename */
          }
          props = { ...props, data: { ...props.data, title: title ?? titleFromStem(props.filePath) } };
        }
        return context.parseData(props as never);
      }) as LoaderContext["parseData"];

      await inner.load({ ...context, parseData });

      // Single post-pass: apply every body transform (cross-link rewriting,
      // then the explainer banner, so the banner's absolute hrefs are never
      // link-rewritten) and PRE-render each changed doc ONCE. The glob loader
      // stores bodies with `deferredRender`, which re-reads the file at render
      // time and ignores body edits; pre-rendering via `renderMarkdown` (which
      // still uses the project's markdown pipeline) is the only reliable
      // interception point.
      const transforms: BodyTransform[] = [rewriteMarkdownLinks];
      if (options.explainers) transforms.push(explainerBannerTransform(options.explainers));
      await applyBodyTransforms(context, transforms);

      return undefined;
    },
  };
}

/** Rewrite `[text](./x.md)` markdown link targets to their routes. */
function rewriteMarkdownLinks(md: string): string {
  return md.replace(/(\]\()([^)\s]+?\.mdx?(?:#[^)\s]*)?)(\))/gi, (full, open, url, close) => {
    const next = rewriteMdLink(url);
    return next ? `${open}${next}${close}` : full;
  });
}

interface StoredDoc {
  id: string;
  body?: unknown;
  filePath?: unknown;
  data?: unknown;
  [k: string]: unknown;
}

/** A pure body edit applied during the post-pass; return the body unchanged to skip. */
type BodyTransform = (body: string, entry: StoredDoc) => string;

/** Prepend a freshness banner to `.md` docs whose frontmatter carries an `explainer` block. */
function explainerBannerTransform(config: ExecutableStoriesConfig): BodyTransform {
  // The run JSON loads once, lazily, on the first explainer doc of the pass —
  // never per document (loadAuditEntries parses every configured source).
  let entries: StoryEntryData[] | undefined;
  let loaded = false;
  return (body, entry) => {
    const data = entry.data;
    if (typeof data !== "object" || data === null) return body;
    const frontmatter = data as Record<string, unknown>;
    if (frontmatter.explainer === undefined) return body;
    if (!loaded) {
      entries = loadAuditEntries(config);
      loaded = true;
    }
    if (!entries) return body; // no run JSON yet — leave the doc alone
    const audit = auditExplainerAgainstEntries(frontmatter, entries, config.routeBase);
    if (!audit) return body; // invalid block — leave the doc alone
    const generated = (frontmatter.explainer as Record<string, unknown> | null | undefined)
      ?.generated;
    const banner = explainerBannerHtml(
      audit,
      typeof generated === "string" ? generated : undefined,
    );
    return `${banner}\n\n${body}`;
  };
}

/**
 * Apply the body transforms to every `.md` entry and pre-render each changed
 * one exactly once. One pass owns all body edits, so transform order is
 * explicit here rather than an accident of call sequence.
 */
async function applyBodyTransforms(
  context: LoaderContext,
  transforms: BodyTransform[],
): Promise<void> {
  const store = context.store as unknown as {
    entries?: () => Array<[string, StoredDoc]>;
    set: (entry: StoredDoc) => unknown;
  };
  if (typeof store.entries !== "function") return;
  for (const [, entry] of store.entries()) {
    const filePath = typeof entry.filePath === "string" ? entry.filePath : undefined;
    if (!filePath || !/\.md$/i.test(filePath)) continue; // mdx renders differently; skip
    if (typeof entry.body !== "string") continue;
    const body = transforms.reduce((acc, transform) => transform(acc, entry), entry.body);
    if (body === entry.body) continue;
    try {
      const fileURL = pathToFileURL(path.resolve(filePath));
      const rendered = await context.renderMarkdown(body, { fileURL });
      store.set({ ...entry, body, rendered, deferredRender: false });
    } catch {
      // Leave the entry as-is if re-render fails — never break the doc.
    }
  }
}
