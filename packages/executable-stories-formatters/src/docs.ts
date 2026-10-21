/**
 * Docs media (fn(args, deps) pattern): keep the GIFs and videos in a help centre in step with
 * the scenarios that record them.
 *
 * `docs.json` lists media slots: an image in an article, the rendered file that replaces it,
 * and the scenario that records it. `docs status` says which slots are missing, failing, changed
 * or published; `docs publish` puts each changed file into its article. `docs.lock.json` records
 * what was published where, so the next publish replaces the same image and never another one.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { REPORT_FAVICON_LINK } from 'executable-stories-core/utils/report-favicon';
import { scenarioSlug } from 'executable-stories-core/utils/slug';

export type DocsTargetConfig =
  | { type: 'markdown'; dir: string }
  | { type: 'helpscout'; collections?: string[] }
  | { type: 'confluence'; spaceId?: string };

export interface DocsSlot {
  id: string;
  /** Markdown: file path under `dir`. Help Scout: article id. Confluence: page id. */
  article: string;
  /** The rendered GIF or MP4, relative to docs.json. */
  file: string;
  /** On first publish, the image this slot replaces: a unique part of its src or filename. */
  replaces?: string;
  /** Scenario title. With `--report`, only a passed scenario's media is published. */
  scenario?: string;
  /**
   * A tag on the scenario instead of its title, e.g. `media:add-contact`: renaming the
   * scenario then keeps the slot. Exactly one scenario in the report may carry it.
   */
  tag?: string;
}

export interface DocsConfig {
  target: DocsTargetConfig;
  slots: DocsSlot[];
  /**
   * Publish only media someone approved with `docs approve`: the approval is for that exact
   * file, so re-rendering it needs a new one.
   */
  approval?: boolean;
}

export interface Published {
  /** Where it was published: the target and article, from `destination()`. Another one is a first publish. */
  to: string;
  /** Where the article now points: a relative path, an asset URL or an attachment filename. */
  src: string;
  sha256: string;
  publishedAt: string;
  /**
   * The scenario's steps that quoted the article when it was published. `docs status --wording`
   * flags any the article no longer says.
   */
  quoted?: string[];
}

export type DocsLock = Record<string, Published>;

/** `docs.approvals.json`: who approved which rendering of each slot. */
export type DocsApprovals = Record<
  string,
  { sha256: string; by: string; approvedAt: string }
>;

export type SlotStatus =
  | 'no media'
  | 'failing'
  | 'unapproved'
  | 'changed'
  | 'published';

/** An article in the help centre and the images in it, for `docs list`. */
export interface ArticleRef {
  /** What a slot's `article` names: the file path, article id or page id. */
  article: string;
  title: string;
  url?: string;
  images: string[];
  /** The heading each image sits under, by index ('' before the first heading). */
  headings?: string[];
  /** How often the article was read, when the help centre counts it. */
  views?: number;
  updatedAt?: string;
}

/** One article's body, as `docs add`, `review` and `status --wording` read it. */
export interface ArticleBody {
  title: string;
  url?: string;
  body: string;
}

export interface DocsTarget {
  /** Puts media into an article, replacing `previous.src`, or on first publish the image `slot.replaces` names. */
  publish(
    slot: DocsSlot,
    media: Buffer,
    previous?: Published,
  ): Promise<{ src: string }>;
  /** Every article and the images in it. */
  list(): Promise<ArticleRef[]>;
  /** One article as it is now. */
  read(article: string): Promise<ArticleBody>;
  /**
   * The bytes of an image the article shows by a src that only resolves inside the help centre
   * (a relative path, a page attachment), so a review page can show it. Undefined when not media.
   */
  image?(article: string, src: string): Promise<Buffer | undefined>;
  /** The article a public link points at, as a slot names it; undefined when it is not one of ours. */
  resolve?(url: string): Promise<string | undefined>;
}

/** A link with its trailing slash, query and fragment dropped, so two spellings of one page match. */
const sameLink = (a: string, b: string) => {
  const norm = (u: string) => u.split(/[?#]/)[0]!.replace(/\/+$/, '').toLowerCase();
  return norm(a) === norm(b);
};

/**
 * Each way an article shows an image. Group 1 is the text a publish replaces, the last group the
 * src (or `scan` finds where it ends): Markdown `![](src)` or `![](<src>)`, HTML
 * `<img src="…">`, Confluence `<ac:image>` holding an attachment or an external `ri:url`. Links,
 * iframes, attachments linked for download and other `src`s that are not images do not count.
 * An `attr` src is an HTML or XML attribute value: read with its entities decoded, written escaped.
 */
const IMAGE_REFS: {
  re: RegExp;
  scan?: (body: string, start: number) => number | undefined;
  to?: (next: string) => string;
  attr?: true;
}[] = [
  { re: /!\[[^\]]*\]\(\s*<([^<>\n]*)>/dg },
  { re: /!\[[^\]]*\]\(\s*(?=[^\s<])()/dg, scan: markdownSrcEnd },
  { re: /<img\b[^>]*?\ssrc="([^"]*)"/dg, attr: true },
  { re: /<img\b[^>]*?\ssrc='([^']*)'/dg, attr: true },
  {
    re: /<ac:image\b[^>]*>\s*<ri:attachment\b[^>]*?\sri:filename="([^"]*)"/dg,
    attr: true,
  },
  // An external image, `<ri:url …/>` or `<ri:url …></ri:url>`: publishing turns it into the attachment.
  {
    re: /<ac:image\b[^>]*>\s*(<ri:url\b[^>]*?\sri:value="([^"]*)"[^>]*?(?:\/>|>\s*<\/ri:url>))/dg,
    to: (next) => `<ri:attachment ri:filename="${next}"/>`,
    attr: true,
  },
];

/**
 * Where a bare Markdown src starting at `start` ends: at whitespace or the `)` that closes the
 * image, parentheses nested to any depth and `\(` `\)` escapes included. Undefined when it never
 * closes, which CommonMark does not read as an image.
 */
function markdownSrcEnd(body: string, start: number) {
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (c === '\\') i++;
    else if (c === '(') depth++;
    else if (c === ')' && depth-- === 0) return i;
    else if (/\s/.test(c)) return depth === 0 ? i : undefined;
  }
  return undefined;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

/** Decodes the XML entities, `&nbsp;` and numeric references; other named entities stay as written. */
const decodeEntities = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e: string) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? whole;
    const code = /x/i.test(e[1])
      ? parseInt(e.slice(2), 16)
      : Number(e.slice(1));
    return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });

const imageRefs = (body: string) =>
  IMAGE_REFS.flatMap(({ re, scan, to = (next: string) => next, attr }) =>
    [...body.matchAll(re)].flatMap((m) => {
      const [start, groupEnd] = m.indices![1]!;
      const end = scan ? scan(body, start) : groupEnd;
      if (end === undefined) return [];
      const src = scan ? body.slice(start, end) : m.at(-1)!;
      return [
        {
          src: attr ? decodeEntities(src) : src,
          start,
          end,
          // `replaceImage` already refuses quotes and angle brackets; `&` is all left to escape.
          to: attr ? (next: string) => to(next.replace(/&/g, '&amp;')) : to,
        },
      ];
    }),
  ).sort((a, b) => a.start - b.start);

/** The src of every image in an article body. */
export const imagesIn = (body: string) => imageRefs(body).map((r) => r.src);

/** Markdown `## Heading` lines and HTML `<h1>`–`<h6>`, in order, with where each starts and ends. */
const headingsIn = (body: string) =>
  [
    ...body.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm),
    ...body.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi),
  ]
    .map((m) => ({ at: m.index, end: m.index + m[0].length, text: plainText(m[1]) }))
    .sort((a, b) => a.at - b.at);

/** Text with HTML tags, Markdown image/link syntax and entities removed, whitespace collapsed. */
export const plainText = (s: string) =>
  decodeEntities(
    s
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'),
  )
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Each image in a body with the heading above it and the text that leads up to it: from that
 * heading, or from the image before it under the same heading.
 */
export function imageSections(body: string) {
  const heads = headingsIn(body);
  const refs = imageRefs(body);
  return refs.map((r, i) => {
    const head = heads.filter((h) => h.end <= r.start).at(-1);
    const prev = refs[i - 1];
    // A src ends inside its markup: resume after the tag's `>` or the link's `)`.
    const after = (at: number) => {
      const close = body.slice(at).search(/[>)]/);
      return close < 0 ? at : at + close + 1;
    };
    const from = Math.max(head?.end ?? 0, prev ? after(prev.end) : 0);
    // Up to where this image's markup begins, so none of it reads as text.
    const opens = [...body.slice(from, r.start).matchAll(/<img\b|<ac:image\b|!\[/gi)];
    const to = from + (opens.at(-1)?.index ?? r.start - from);
    return { src: r.src, heading: head?.text ?? '', text: plainText(body.slice(from, to)) };
  });
}

/** Sentences of `text`, for steps that quote the article. */
export const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/)
    .map((s) => s.trim())
    .filter((s) => /\w/.test(s));

/** Lower case, one kind of quote and dash, no punctuation at the end: for "does the article still say this". */
const comparable = (s: string) =>
  plainText(s)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[\s.!?:;,]+$/, '');

/** The steps whose text the article says, word for word once punctuation and case are set aside. */
export const quotedIn = (body: string, steps: string[]) => {
  const article = comparable(body);
  return steps.filter((s) => comparable(s) && article.includes(comparable(s)));
};

/** An exported HTML article's own URL: `<link rel="canonical">`, or a comment holding just a URL. */
const urlIn = (body: string) =>
  /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(
    body,
  )?.[1] ?? /<!--\s*(https?:\/\/\S+)\s*-->/.exec(body)?.[1];

/**
 * Swaps exactly one image whose src contains `match` for `next` (see `IMAGE_REFS`). None or
 * several is an error, so a publish never lands on the wrong image.
 */
export function replaceImage(
  body: string,
  match: string,
  next: string,
): string {
  // `next` is spliced into markup: nothing in it may close the attribute or link.
  if (/["'<>()\s]/.test(next)) throw new Error(`unsafe image src "${next}"`);
  const hits = imageRefs(body).filter((r) => r.src.includes(match));
  if (hits.length !== 1) {
    throw new Error(
      hits.length
        ? `"${match}" matches ${hits.length} images; make it unique`
        : `no image matching "${match}"`,
    );
  }
  const [hit] = hits;
  return body.slice(0, hit.start) + hit.to(next) + body.slice(hit.end);
}

/**
 * The real path of `p`, every symlink followed, including a dangling one (whose target does not
 * exist yet, so a write through it would create the target).
 */
const real = (p: string, depth = 0): string => {
  if (depth > 40) throw new Error(`too many symlinks at ${p}`);
  const abs = path.resolve(p);
  const stat = fs.lstatSync(abs, { throwIfNoEntry: false });
  if (!stat)
    return path.join(real(path.dirname(abs), depth), path.basename(abs));
  if (!stat.isSymbolicLink()) return fs.realpathSync(abs);
  return real(
    path.resolve(real(path.dirname(abs), depth), fs.readlinkSync(abs)),
    depth + 1,
  );
};

/** Replaces whatever is at `file`, a planted symlink included, with a new file: never writes through a link. */
function writeFresh(file: string, data: Buffer) {
  fs.rmSync(file, { force: true });
  fs.writeFileSync(file, data, { flag: 'wx' });
}

/** Whether `file` (relative to `dir`) stays under `dir` once symlinks are followed. */
const inside = (dir: string, file: string) => {
  const rel = path.relative(real(dir), real(path.resolve(dir, file)));
  return !rel.startsWith('..') && !path.isAbsolute(rel);
};

const MEDIA = /^\.(gif|png|jpe?g|webp|mp4|webm)$/i;

/** Whether `b` starts like a GIF, PNG, JPEG, WebP, MP4 or WebM file. */
export const isMedia = (b: Buffer) => {
  const at = (offset: number, sig: string) =>
    b.subarray(offset, offset + sig.length).toString('latin1') === sig;
  return (
    at(0, 'GIF8') ||
    at(0, '\x89PNG') ||
    at(0, '\xff\xd8\xff') ||
    (at(0, 'RIFF') && at(8, 'WEBP')) ||
    at(4, 'ftyp') ||
    at(0, '\x1a\x45\xdf\xa3')
  );
};

/**
 * A slot's id and file extension become file and attachment names, and its paths are written to:
 * docs.json can come from a pull request, so none of them may escape the project.
 */
export function checkSlot(slot: DocsSlot, root: string, articleDir?: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(slot.id))
    throw new Error(
      `slot id "${slot.id}" may only use letters, digits, - and _`,
    );
  if (!MEDIA.test(path.extname(slot.file)))
    throw new Error(
      `slot "${slot.id}": file must be .gif, .png, .jpg, .jpeg, .webp, .mp4 or .webm`,
    );
  if (!inside(root, slot.file))
    throw new Error(`slot "${slot.id}": file is outside the project`);
  if (articleDir && !inside(articleDir, slot.article))
    throw new Error(`slot "${slot.id}": article is outside ${articleDir}`);
}

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/**
 * Which target and article a slot goes to, so moving it to another one publishes it afresh.
 * Confluence page ids are per site, so the site is part of it.
 */
export function destination(
  target: DocsTargetConfig,
  slot: DocsSlot,
  env: DocsDeps['env'] = {},
) {
  if (target.type === 'markdown')
    return `markdown:${path.join(target.dir, slot.article)}`;
  if (target.type === 'confluence') {
    const site = URL.canParse(env.CONFLUENCE_BASE_URL ?? '')
      ? new URL(env.CONFLUENCE_BASE_URL!)
      : undefined;
    const host = site ? site.origin + site.pathname.replace(/\/+$/, '') : '';
    return `confluence:${host}/${slot.article}`;
  }
  return `${target.type}:${slot.article}`;
}

/** The lock entry for a slot, if it was published to `to`. */
export const publishedTo = (lock: DocsLock, slot: DocsSlot, to: string) =>
  lock[slot.id]?.to === to ? lock[slot.id] : undefined;

// === Targets ===

export type FetchFn = typeof fetch;

async function ok(res: Response, what: string): Promise<Response> {
  if (!res.ok)
    throw new Error(
      `${what} failed: ${res.status} ${(await res.text()).slice(0, 300)}`,
    );
  return res;
}

const firstSrc = (slot: DocsSlot, previous?: Published) => {
  const match = previous?.src ?? slot.replaces;
  if (!match)
    throw new Error(
      `slot "${slot.id}" has no "replaces" for its first publish`,
    );
  return match;
};

/** An article's title: a Markdown `# Title`, else an HTML `<h1>` with its tags and entities removed. */
const titleOf = (body: string, fallback: string) => {
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(body)?.[1];
  return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() || (h1 && plainText(h1)) || fallback;
};

/** What `docs list` shows for one article body. */
const refOf = (article: string, title: string, body: string, extra: Partial<ArticleRef> = {}): ArticleRef => {
  const sections = imageSections(body);
  return {
    article,
    title,
    images: sections.map((s) => s.src),
    headings: sections.map((s) => s.heading),
    ...extra,
  };
};

/** The files a Markdown target or an export holds articles in. */
const ARTICLE_FILE = /\.(md|mdx|html|json)$/;

/** A Help Scout article as its API returns it, bare or under `article`, saved to a `.json` file. */
type HelpScoutArticleFile = {
  name?: string;
  publicUrl?: string;
  text?: string;
  viewCount?: number;
  updatedAt?: string;
};

/** The article in a Help Scout `.json` export, or undefined when the file is not one. */
const helpScoutArticle = (raw: string) => {
  try {
    const parsed = JSON.parse(raw) as HelpScoutArticleFile & { article?: HelpScoutArticleFile };
    const a = parsed?.article ?? parsed;
    return typeof a?.text === 'string' ? (a as HelpScoutArticleFile & { text: string }) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Articles as Markdown or HTML files: the media goes in `media/` beside the article. Help Scout
 * `.json` exports are read too, for `--from`; publishing into one is refused.
 */
export function markdownTarget(dir: string): DocsTarget {
  const readArticle = (article: string): ArticleBody & Partial<ArticleRef> => {
    if (!inside(dir, article)) throw new Error(`article "${article}" is outside ${dir}`);
    const raw = fs.readFileSync(path.join(dir, article), 'utf8');
    if (article.endsWith('.json')) {
      const a = helpScoutArticle(raw);
      if (!a) throw new Error(`"${article}" is not a Help Scout article export`);
      const body = a.text;
      return {
        title: a.name || titleOf(body, article),
        url: a.publicUrl,
        body,
        views: a.viewCount,
        updatedAt: a.updatedAt,
      };
    }
    return { title: titleOf(raw, article), url: urlIn(raw), body: raw };
  };
  return {
    async list() {
      return (
        fs
          .readdirSync(dir, { recursive: true, encoding: 'utf8' })
          // A symlinked article that points out of `dir` is not listed: its contents are not ours.
          .filter((f) => ARTICLE_FILE.test(f) && inside(dir, f))
          // Other JSON beside the articles (`_meta.json`, …) is not an article.
          .filter((f) => !f.endsWith('.json') || helpScoutArticle(fs.readFileSync(path.join(dir, f), 'utf8')))
          .sort()
          .map((article) => {
            const { title, body, url, views, updatedAt } = readArticle(article);
            return refOf(article, title, body, {
              ...(url ? { url } : {}),
              ...(views !== undefined ? { views } : {}),
              ...(updatedAt ? { updatedAt } : {}),
            });
          })
      );
    },
    async read(article) {
      const { title, url, body } = readArticle(article);
      return { title, url, body };
    },
    // An export carries each article's link (see `urlIn`): the file with this one is the article.
    async resolve(url) {
      return (await this.list()).find((a) => a.url && sameLink(a.url, url))?.article;
    },
    async image(article, src) {
      // Relative to the article, and only from inside the docs: a src is written by whoever edits it.
      const file = path.join(path.dirname(article), decodeURI(src.split(/[?#]/)[0]));
      if (!inside(dir, article) || !inside(dir, file)) return undefined;
      const bytes = read(path.join(dir, file));
      return bytes && isMedia(bytes) ? bytes : undefined;
    },
    async publish(slot, media, previous) {
      if (!inside(dir, slot.article))
        throw new Error(`article "${slot.article}" is outside ${dir}`);
      if (slot.article.endsWith('.json'))
        throw new Error(`article "${slot.article}" is an export to read; publish to the help centre`);
      const article = path.join(dir, slot.article);
      const src = `media/${slot.id}${path.extname(slot.file)}`;
      if (!inside(dir, path.join(path.dirname(slot.article), src)))
        throw new Error(`media for "${slot.id}" is outside ${dir}`);
      // Checked before the media is written: the article must still show exactly one image to replace.
      const body = fs.readFileSync(article, 'utf8');
      const next = replaceImage(body, firstSrc(slot, previous), src);
      fs.mkdirSync(path.join(path.dirname(article), 'media'), {
        recursive: true,
      });
      writeFresh(path.join(path.dirname(article), src), media);
      // Once published, the article already points at the file just overwritten.
      if (next !== body) fs.writeFileSync(article, next);
      return { src };
    },
  };
}

/** Help Scout Docs: uploads an article asset and points the article at its URL. */
export function helpScoutTarget(
  apiKey: string,
  fetchFn: FetchFn = fetch,
  collections?: string[],
): DocsTarget {
  const base = 'https://docsapi.helpscout.net/v1';
  const auth = {
    Authorization: `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`,
  };
  const get = async <T>(url: string): Promise<T> =>
    (
      await ok(await fetchFn(url, { headers: auth }), `GET ${url}`)
    ).json() as Promise<T>;
  /** Every item of a paged Help Scout collection response, e.g. `{ articles: { pages, items } }`. */
  const all = async <T>(url: string, key: string): Promise<T[]> => {
    const items: T[] = [];
    for (let page = 1, pages = 1; page <= pages; page++) {
      const sep = url.includes('?') ? '&' : '?';
      const res = (
        await get<Record<string, { pages: number; items: T[] }>>(
          `${url}${sep}page=${page}`,
        )
      )[key];
      pages = res.pages;
      items.push(...res.items);
    }
    return items;
  };
  return {
    // One request per article, in sequence.
    async list() {
      const ids =
        collections ??
        (await all<{ id: string }>(`${base}/collections`, 'collections')).map(
          (c) => c.id,
        );
      const refs: ArticleRef[] = [];
      for (const id of ids) {
        const articles = await all<{
          id: string;
          name: string;
          publicUrl?: string;
          viewCount?: number;
          updatedAt?: string;
        }>(
          `${base}/collections/${encodeURIComponent(id)}/articles?pageSize=100`,
          'articles',
        );
        for (const a of articles) {
          const { article } = await get<{ article: { text: string } }>(
            `${base}/articles/${encodeURIComponent(a.id)}`,
          );
          refs.push(
            refOf(a.id, a.name, article.text ?? '', {
              url: a.publicUrl,
              views: a.viewCount,
              updatedAt: a.updatedAt,
            }),
          );
        }
      }
      return refs;
    },
    async read(id) {
      const { article } = await get<{
        article: { name: string; publicUrl?: string; text: string };
      }>(`${base}/articles/${encodeURIComponent(id)}`);
      return { title: article.name, url: article.publicUrl, body: article.text ?? '' };
    },
    // A public link is ".../article/16-how-to-create-payees"; the API takes the number for the id.
    async resolve(url) {
      const number = /\/article\/(\d+)/.exec(url)?.[1];
      if (!number) return undefined;
      const { article } = await get<{ article: { id: string } }>(`${base}/articles/${number}`);
      return article.id;
    },
    async publish(slot, media, previous) {
      const url = `${base}/articles/${encodeURIComponent(slot.article)}`;
      const { article } = (await (
        await ok(await fetchFn(url, { headers: auth }), `GET ${url}`)
      ).json()) as {
        article: { text: string };
      };
      const match = firstSrc(slot, previous);
      // Checked before the upload: the article must still show exactly one image to replace.
      replaceImage(article.text, match, 'pending');
      const form = new FormData();
      form.set('key', apiKey);
      form.set('articleId', slot.article);
      form.set('assetType', 'image');
      form.set(
        'file',
        new Blob([new Uint8Array(media)]),
        `${slot.id}${path.extname(slot.file)}`,
      );
      const upload = await ok(
        await fetchFn(`${base}/assets/article`, {
          method: 'POST',
          headers: auth,
          body: form,
        }),
        'Help Scout asset upload',
      );
      const { filelink } = (await upload.json()) as { filelink: string };
      const text = replaceImage(article.text, match, filelink);
      await ok(
        await fetchFn(url, {
          method: 'PUT',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }),
        `PUT ${url}`,
      );
      return { src: filelink };
    },
  };
}

/** Confluence Cloud: the media is a page attachment; re-uploading it adds a version the page shows. */
export function confluenceTarget(
  baseUrl: string,
  auth: { email: string; token: string },
  fetchFn: FetchFn = fetch,
  spaceId?: string,
): DocsTarget {
  const base = baseUrl.replace(/\/$/, '');
  const headers = {
    Authorization: `Basic ${Buffer.from(`${auth.email}:${auth.token}`).toString('base64')}`,
  };
  return {
    async list() {
      if (!spaceId)
        throw new Error('docs list needs "spaceId" in the confluence target');
      type Page = {
        id: string;
        title: string;
        body: { storage: { value: string } };
        _links: { webui: string };
      };
      const refs: ArticleRef[] = [];
      let next: string | undefined =
        `${base}/api/v2/spaces/${encodeURIComponent(spaceId)}/pages?body-format=storage&limit=250`;
      while (next) {
        const res = (await (
          await ok(await fetchFn(next, { headers }), `GET ${next}`)
        ).json()) as {
          results: Page[];
          _links?: { next?: string };
        };
        for (const p of res.results)
          refs.push(
            refOf(p.id, p.title, p.body.storage.value, {
              url: `${base}${p._links.webui}`,
            }),
          );
        // `next` is a path from the site root ("/wiki/api/v2/…"); only follow it on the same host.
        next = res._links?.next
          ? new URL(res._links.next, base).href
          : undefined;
        if (next && new URL(next).origin !== new URL(base).origin)
          next = undefined;
      }
      return refs;
    },
    async read(id) {
      const url = `${base}/api/v2/pages/${encodeURIComponent(id)}?body-format=storage`;
      const page = (await (
        await ok(await fetchFn(url, { headers }), `GET ${url}`)
      ).json()) as {
        title: string;
        body: { storage: { value: string } };
        _links: { webui: string };
      };
      return {
        title: page.title,
        url: `${base}${page._links.webui}`,
        body: page.body.storage.value,
      };
    },
    // ".../wiki/spaces/ENG/pages/123/Title" on this site only: a page id means nothing on another.
    async resolve(url) {
      if (!URL.canParse(url) || new URL(url).origin !== new URL(base).origin) return undefined;
      return /\/pages\/(\d+)/.exec(new URL(url).pathname)?.[1];
    },
    async image(id, filename) {
      const list = `${base}/rest/api/content/${encodeURIComponent(id)}/child/attachment?filename=${encodeURIComponent(filename)}`;
      const found = (await (
        await ok(await fetchFn(list, { headers }), `GET ${list}`)
      ).json()) as { results: { _links: { download: string } }[] };
      const download = found.results[0]?._links.download;
      // The download link is a path under the site; never follow it, with credentials, elsewhere.
      if (!download?.startsWith('/')) return undefined;
      const url = new URL(`${base}${download}`);
      if (url.origin !== new URL(base).origin) return undefined;
      const bytes = Buffer.from(
        await (await ok(await fetchFn(url.href, { headers }), `GET ${url}`)).arrayBuffer(),
      );
      return isMedia(bytes) ? bytes : undefined;
    },
    async publish(slot, media, previous) {
      const page = encodeURIComponent(slot.article);
      const src = `${slot.id}${path.extname(slot.file)}`;
      const url = `${base}/api/v2/pages/${page}`;
      const current = (await (
        await ok(
          await fetchFn(`${url}?body-format=storage`, { headers }),
          `GET ${url}`,
        )
      ).json()) as {
        title: string;
        version: { number: number };
        body: { storage: { value: string } };
      };
      // Checked before the upload: the page must still show exactly one image to replace.
      const value = replaceImage(
        current.body.storage.value,
        firstSrc(slot, previous),
        src,
      );
      const form = new FormData();
      form.set('file', new Blob([new Uint8Array(media)]), src);
      await ok(
        await fetchFn(`${base}/rest/api/content/${page}/child/attachment`, {
          method: 'PUT',
          headers: { ...headers, 'X-Atlassian-Token': 'nocheck' },
          body: form,
        }),
        'Confluence attachment upload',
      );
      // Once published, the page already shows the attachment just re-uploaded.
      if (value === current.body.storage.value) return { src };
      await ok(
        await fetchFn(url, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: slot.article,
            status: 'current',
            title: current.title,
            body: { representation: 'storage', value },
            version: {
              number: current.version.number + 1,
              message: `Media: ${slot.id}`,
            },
          }),
        }),
        `PUT ${url}`,
      );
      return { src };
    },
  };
}

// === Commands ===

export interface DocsDeps {
  log(line: string): void;
  error(line: string): void;
  env: Record<string, string | undefined>;
  now(): Date;
  /** Builds the target; tests pass one in. */
  target?: DocsTarget;
}

const HELP = `Usage:
  executable-stories docs list    [--config docs.json] [--from <dir>] [--json | --csv] [--images] [--only gif]
  executable-stories docs add     <article | link> --image <n> [--id <slot>] [--scenario <title>] [--from <dir>] [--json]
  executable-stories docs status  [--config docs.json] [--report index.story-report.json] [--wording] [--json]
  executable-stories docs review  [--config docs.json] [--report index.story-report.json] [--out docs-review.html] [--json]
  executable-stories docs approve <slot>… [--by <name>] [--config docs.json] [--report index.story-report.json] [--json]
  executable-stories docs publish [--config docs.json] [--report index.story-report.json] [--only <slot>] [--json]

Keeps the GIFs and videos in your help centre in step with the scenarios that record them.
docs.json lists each media slot: the article, the rendered file, the image it replaces and the
scenario behind it (its title, or a "tag" that survives renaming it). publish puts every changed
file into its article and records it in docs.lock.json. With --report, a slot whose scenario did
not pass is never published.

  list     Every article and its images, and which images no slot covers yet: the backlog.
           --csv opens in a spreadsheet; --images gives one row per image with the heading it
           sits under; --only keeps one kind (gif, png, …); --from reads a local export of the
           help centre (Markdown, HTML or Help Scout .json files, in any folder) instead of
           the target.
  add      Adds a slot for the nth image (from 1) in an article, named by id or by its public
           link, and prints a scenario to record it, its steps the article's sentences before
           that image. --json prints the slot, the section and the scenario for an agent.
  status   no media, failing, unapproved, changed or published. --wording reads each published
           article and lists steps that quoted it and no longer do.
  review   One HTML page to review without the repo: each slot's current image beside the new
           one, the section it illustrates and the scenario's steps.
  approve  Records who approved each slot's current file in docs.approvals.json. With
           "approval": true in docs.json, publish sends only approved files.

Targets (docs.json "target"):
  { "type": "markdown", "dir": "docs" }
  { "type": "helpscout", "collections": ["…"] }       env: HELPSCOUT_API_KEY (collections optional)
  { "type": "confluence", "spaceId": "…" }            env: CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_TOKEN

Credentials and the Confluence host come from the environment, never docs.json, so a change to
docs.json cannot send them elsewhere.`;

function makeTarget(
  config: DocsConfig,
  root: string,
  env: DocsDeps['env'],
): DocsTarget {
  const t = config.target;
  if (t.type === 'markdown') return markdownTarget(path.resolve(root, t.dir));
  if (t.type === 'helpscout') {
    if (!env.HELPSCOUT_API_KEY)
      throw new Error('HELPSCOUT_API_KEY is required for a helpscout target');
    return helpScoutTarget(env.HELPSCOUT_API_KEY, fetch, t.collections);
  }
  const baseUrl = env.CONFLUENCE_BASE_URL;
  if (
    !baseUrl?.startsWith('https://') ||
    !env.CONFLUENCE_EMAIL ||
    !env.CONFLUENCE_TOKEN
  ) {
    throw new Error(
      'CONFLUENCE_BASE_URL (https://…), CONFLUENCE_EMAIL and CONFLUENCE_TOKEN are required for a confluence target',
    );
  }
  return confluenceTarget(
    baseUrl,
    { email: env.CONFLUENCE_EMAIL, token: env.CONFLUENCE_TOKEN },
    fetch,
    t.spaceId,
  );
}

/** The parts of a StoryReport scenario `docs` reads. */
export interface ReportedScenario {
  title: string;
  status: string;
  tags?: string[];
  steps?: { keyword: string; text: string }[];
}

const readScenarios = (reportPath: string) =>
  (
    JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      features: { scenarios: ReportedScenario[] }[];
    }
  ).features.flatMap((f) => f.scenarios);

/**
 * The scenario a slot names, by its tag or else its title. Several is an error: one failing
 * scenario among several with the same name must not let the slot pass.
 */
export function scenarioFor(
  slot: DocsSlot,
  scenarios: ReportedScenario[],
): ReportedScenario | undefined {
  const found = slot.tag
    ? scenarios.filter((s) => s.tags?.includes(slot.tag!))
    : slot.scenario
      ? scenarios.filter((s) => s.title === slot.scenario)
      : [];
  if (found.length > 1)
    throw new Error(
      slot.tag
        ? `slot "${slot.id}": several scenarios are tagged "${slot.tag}"; tag one`
        : `slot "${slot.id}": several scenarios are titled "${slot.scenario}"; give it a unique title`,
    );
  return found[0];
}

/** What the article shows now, given the rendered file, what was published there, the run and the approvals. */
export function slotStatus(
  slot: DocsSlot,
  media: Buffer | undefined,
  previous: Published | undefined,
  scenario?: ReportedScenario | null,
  approved?: boolean,
): SlotStatus {
  if (!media) return 'no media';
  // `null`: the run was read and the slot's scenario is not in it.
  if ((slot.scenario || slot.tag) && scenario !== undefined && scenario?.status !== 'passed')
    return 'failing';
  if (previous?.sha256 === sha256(media)) return 'published';
  return approved === false ? 'unapproved' : 'changed';
}

const read = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file) : undefined;

const readJson = <T>(file: string): T =>
  // No prototype, so a slot id like "__proto__" is an ordinary key.
  Object.assign(Object.create(null), JSON.parse(read(file)?.toString() ?? '{}'));

const writeJson = (file: string, data: unknown) =>
  writeFresh(file, Buffer.from(JSON.stringify(data, null, 2) + '\n'));

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** A slot's steps as "Given …" lines. */
const stepLines = (scenario?: ReportedScenario | null) =>
  (scenario?.steps ?? []).map((s) => `${s.keyword} ${s.text}`);

export async function runDocs(
  rawArgs: string[],
  depsOverride: Partial<DocsDeps> = {},
): Promise<number> {
  const deps: DocsDeps = {
    log: console.log,
    error: console.error,
    env: process.env,
    now: () => new Date(),
    ...depsOverride,
  };
  let parsed;
  try {
    parsed = parseArgs({
      args: rawArgs,
      allowPositionals: true,
      options: {
        config: { type: 'string', default: 'docs.json' },
        report: { type: 'string' },
        only: { type: 'string' },
        json: { type: 'boolean' },
        csv: { type: 'boolean' },
        images: { type: 'boolean' },
        from: { type: 'string' },
        image: { type: 'string' },
        id: { type: 'string' },
        scenario: { type: 'string' },
        out: { type: 'string', default: 'docs-review.html' },
        by: { type: 'string' },
        wording: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    deps.error(message(err));
    deps.error(HELP);
    return 4;
  }
  const [command, ...names] = parsed.positionals;
  const opts = parsed.values;
  if (
    opts.help ||
    !['list', 'add', 'status', 'review', 'approve', 'publish'].includes(command ?? '')
  ) {
    (opts.help ? deps.log : deps.error)(HELP);
    return opts.help ? 0 : 4;
  }

  // An export is a copy to read: publishing to it, or judging status against it, would record
  // media as live where it never went.
  if (opts.from && command !== 'list' && command !== 'add') {
    deps.error(`--from reads a local export; it only works with list and add, not ${command}.`);
    return 4;
  }

  const configPath = path.resolve(opts.config!);
  const root = path.dirname(configPath);
  const lockPath = path.join(root, 'docs.lock.json');
  const approvalsPath = path.join(root, 'docs.approvals.json');
  let config: DocsConfig;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as DocsConfig;
  } catch (err) {
    deps.error(`Cannot read ${configPath}: ${message(err)}`);
    return 4;
  }
  for (const file of [lockPath, approvalsPath])
    if (!inside(root, file)) {
      deps.error(`${file} links outside the project`);
      return 4;
    }
  const lock = readJson<DocsLock>(lockPath);
  const approvals = readJson<DocsApprovals>(approvalsPath);
  // `--from` is the caller's own choice, so it may sit beside the project; docs.json's dir may not.
  if (config.target.type === 'markdown' && !inside(root, config.target.dir)) {
    deps.error(`target dir "${config.target.dir}" is outside the project`);
    return 4;
  }
  if (opts.from && !fs.existsSync(path.resolve(root, opts.from))) {
    deps.error(`--from ${opts.from}: no such folder`);
    return 4;
  }
  const target = () =>
    deps.target ??
    (opts.from
      ? markdownTarget(path.resolve(root, opts.from))
      : makeTarget(config, root, deps.env));

  if (command === 'list')
    return listArticles(config, lock, opts, target, deps);
  if (command === 'add')
    return addSlot(config, configPath, root, names[0], opts, target, deps);

  const needsRun = config.slots.some((s) => s.scenario || s.tag);
  if (
    (command === 'publish' || command === 'approve') &&
    needsRun &&
    !opts.report
  ) {
    deps.error(
      `Slots name scenarios: pass --report so only passed scenarios are ${command === 'publish' ? 'published' : 'approved'}.`,
    );
    return 4;
  }
  const scenarios = opts.report
    ? readScenarios(path.resolve(opts.report))
    : undefined;
  const slots = config.slots.filter((s) =>
    command === 'approve'
      ? names.includes(s.id)
      : !opts.only || s.id === opts.only,
  );
  if (command === 'approve') {
    const unknown = names.filter((n) => !config.slots.some((s) => s.id === n));
    if (!names.length || unknown.length) {
      deps.error(
        names.length
          ? `No slot ${unknown.map((n) => `"${n}"`).join(', ')} in docs.json`
          : 'Name the slots to approve: docs approve <slot>…',
      );
      return 4;
    }
  }
  const articleDir =
    config.target.type === 'markdown'
      ? path.resolve(root, config.target.dir)
      : undefined;
  let rows;
  try {
    for (const slot of slots) {
      checkSlot(slot, root, articleDir);
      // The file goes to a public help centre: only real media leaves the project.
      const media = read(path.resolve(root, slot.file));
      if (media && !isMedia(media))
        throw new Error(
          `slot "${slot.id}": ${slot.file} is not an image or video`,
        );
    }
    // Two slots with one id would share a media file and a lock entry, each overwriting the other.
    const ids = config.slots.map((s) => s.id);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup) throw new Error(`slot id "${dup}" is used twice`);
    rows = slots.map((slot) => {
      const media = read(path.resolve(root, slot.file));
      const to = destination(config.target, slot, deps.env);
      const previous = publishedTo(lock, slot, to);
      const scenario = scenarios && (scenarioFor(slot, scenarios) ?? null);
      const approved = config.approval
        ? !!media && approvals[slot.id]?.sha256 === sha256(media)
        : undefined;
      return {
        slot,
        media,
        to,
        previous,
        scenario,
        status: slotStatus(slot, media, previous, scenario, approved),
      };
    });
  } catch (err) {
    deps.error(message(err));
    return 4;
  }

  if (command === 'status') return showStatus(rows, opts, target, deps);
  if (command === 'review')
    return writeReview(rows, path.resolve(opts.out!), approveCommand(opts), target, deps, opts.json);

  if (command === 'approve') {
    const result = {
      approved: [] as { id: string; sha256: string; by: string }[],
      refused: [] as { id: string; status: SlotStatus }[],
    };
    for (const { slot, media, status } of rows) {
      if (status === 'no media' || status === 'failing') {
        result.refused.push({ id: slot.id, status });
        if (!opts.json) deps.error(`refused  ${slot.id}: ${status}`);
        continue;
      }
      approvals[slot.id] = {
        sha256: sha256(media!),
        by: opts.by ?? deps.env.GIT_AUTHOR_NAME ?? deps.env.USER ?? 'unknown',
        approvedAt: deps.now().toISOString(),
      };
      result.approved.push({ id: slot.id, sha256: approvals[slot.id].sha256, by: approvals[slot.id].by });
      if (!opts.json) deps.log(`approve  ${slot.id} (${approvals[slot.id].by})`);
    }
    writeJson(approvalsPath, approvals);
    if (opts.json) deps.log(JSON.stringify(result, null, 2));
    return result.refused.length ? 1 : 0;
  }

  let publishTo: DocsTarget;
  try {
    publishTo = target();
  } catch (err) {
    deps.error(message(err));
    return 4;
  }
  const result = {
    published: [] as { id: string; src: string; sha256: string }[],
    skipped: [] as { id: string; status: SlotStatus }[],
    failed: [] as { id: string; error: string }[],
  };
  for (const { slot, media, to, previous, scenario, status } of rows) {
    if (status !== 'changed') {
      result.skipped.push({ id: slot.id, status });
      if (!opts.json) deps.log(`skip     ${slot.id}: ${status}`);
      continue;
    }
    try {
      const { src } = await publishTo.publish(slot, media!, previous);
      // The steps the article says now, so `status --wording` notices when it stops saying them.
      let quoted: string[] | undefined;
      if (scenario?.steps?.length) {
        try {
          const { body } = await publishTo.read(slot.article);
          quoted = quotedIn(body, scenario.steps.map((s) => s.text));
        } catch {
          // The media is out; only the wording check misses this article.
        }
      }
      lock[slot.id] = {
        to,
        src,
        sha256: sha256(media!),
        publishedAt: deps.now().toISOString(),
        ...(quoted?.length ? { quoted } : {}),
      };
      // Written per slot, so a failure later in the list never forgets what already went out.
      writeJson(lockPath, lock);
      result.published.push({ id: slot.id, src, sha256: lock[slot.id].sha256 });
      if (!opts.json) deps.log(`publish  ${slot.id} → ${src}`);
    } catch (err) {
      result.failed.push({ id: slot.id, error: message(err) });
      if (!opts.json) deps.error(`failed   ${slot.id}: ${message(err)}`);
    }
  }
  if (opts.json) deps.log(JSON.stringify(result, null, 2));
  return result.failed.length ? 1 : 0;
}

type SlotRow = {
  slot: DocsSlot;
  media?: Buffer;
  previous?: Published;
  scenario?: ReportedScenario | null;
  status: SlotStatus;
};

async function showStatus(
  rows: SlotRow[],
  opts: { json?: boolean; wording?: boolean },
  target: () => DocsTarget,
  deps: DocsDeps,
): Promise<number> {
  // Which quoted steps each published article no longer says.
  const reworded = new Map<string, string[]>();
  if (opts.wording) {
    let t: DocsTarget;
    try {
      t = target();
    } catch (err) {
      deps.error(message(err));
      return 4;
    }
    for (const { slot, previous } of rows) {
      if (!previous?.quoted?.length) continue;
      try {
        const { body } = await t.read(slot.article);
        const still = new Set(quotedIn(body, previous.quoted));
        const gone = previous.quoted.filter((q) => !still.has(q));
        if (gone.length) reworded.set(slot.id, gone);
      } catch (err) {
        deps.error(`cannot read ${slot.article} for ${slot.id}: ${message(err)}`);
      }
    }
  }
  if (opts.json) {
    deps.log(
      JSON.stringify(
        rows.map((r) => ({
          id: r.slot.id,
          article: r.slot.article,
          status: r.status,
          ...(reworded.has(r.slot.id) ? { reworded: reworded.get(r.slot.id) } : {}),
        })),
        null,
        2,
      ),
    );
  } else {
    for (const r of rows) {
      deps.log(`${r.status.padEnd(10)} ${r.slot.id}  (${r.slot.article})`);
      for (const q of reworded.get(r.slot.id) ?? [])
        deps.log(`           the article no longer says: "${q}"`);
    }
  }
  return 0;
}

/** `url` when it is one http(s) URL with no whitespace: an article's URL comes from whoever wrote the article. */
const webUrl = (url?: string) => (url && /^https?:\/\/\S+$/i.test(url) ? url : undefined);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const MIME: Record<string, string> = {
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/** An image or video element for media, inline as a data URI so the page works on its own. */
function mediaTag(file: string, bytes: Buffer, alt: string) {
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const src = `data:${type};base64,${bytes.toString('base64')}`;
  return type.startsWith('video/')
    ? `<video src="${src}" controls muted loop playsinline></video>`
    : `<img src="${src}" alt="${escapeHtml(alt)}">`;
}

/** A shell word: as is when safe, else single-quoted. */
const shellWord = (s: string) =>
  /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;

/** The `docs approve` command for a slot, with the config and run this review was made from. */
const approveCommand =
  (opts: { config?: string; report?: string }) => (slot: string) =>
    [
      'executable-stories',
      'docs',
      'approve',
      slot,
      ...(opts.config && opts.config !== 'docs.json' ? ['--config', opts.config] : []),
      ...(opts.report ? ['--report', opts.report] : []),
    ]
      .map(shellWord)
      .join(' ');

/** One HTML page a reviewer opens anywhere: the article's image beside the new one, per slot. */
async function writeReview(
  rows: SlotRow[],
  out: string,
  approve: (slot: string) => string,
  target: () => DocsTarget,
  deps: DocsDeps,
  json?: boolean,
): Promise<number> {
  let t: DocsTarget | undefined;
  try {
    t = target();
  } catch (err) {
    deps.error(`${message(err)}: the page shows the new media without the article`);
  }
  const shown = rows.filter((r) => r.media);
  const sections: string[] = [];
  for (const r of shown) {
    let article: ArticleBody | undefined;
    try {
      article = await t?.read(r.slot.article);
    } catch (err) {
      deps.error(`cannot read ${r.slot.article}: ${message(err)}`);
    }
    const match = r.previous?.src ?? r.slot.replaces;
    const section = article
      ? imageSections(article.body).find((s) => match && s.src.includes(match))
      : undefined;
    // An absolute URL shows as is; a relative path or attachment only resolves inside the help
    // centre, so its bytes go into the page.
    let bytes: Buffer | undefined;
    if (section && !/^https?:\/\//.test(section.src)) {
      try {
        bytes = await t?.image?.(r.slot.article, section.src);
      } catch (err) {
        deps.error(`cannot read ${section.src}: ${message(err)}`);
      }
    }
    const current = !section
      ? '<p class="none">Not found in the article</p>'
      : /^https?:\/\//.test(section.src)
        ? `<img src="${escapeHtml(section.src)}" alt="Current image">`
        : bytes
          ? mediaTag(section.src, bytes, 'Current image')
          : `<p class="none">${escapeHtml(section.src)}</p>`;
    const steps = stepLines(r.scenario);
    sections.push(`<section>
  <h2>${escapeHtml(r.slot.id)} <span class="status ${r.status.replace(' ', '-')}">${escapeHtml(r.status)}</span></h2>
  <p class="where">${article ? `<a href="${escapeHtml(webUrl(article.url) ?? '#')}">${escapeHtml(article.title)}</a>` : escapeHtml(r.slot.article)}${section?.heading ? ` › ${escapeHtml(section.heading)}` : ''}</p>
  ${section?.text ? `<blockquote>${escapeHtml(section.text)}</blockquote>` : ''}
  <div class="pair">
    <figure><figcaption>Now</figcaption>${current}</figure>
    <figure><figcaption>New</figcaption>${mediaTag(r.slot.file, r.media!, r.slot.id)}</figure>
  </div>
  ${steps.length ? `<ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : ''}
  <p class="approve">Approve: <code>${escapeHtml(approve(r.slot.id))}</code></p>
</section>`);
  }
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: http:; media-src data:; style-src 'unsafe-inline'">
<title>Docs media review</title>
${REPORT_FAVICON_LINK}
<style>
:root { color-scheme: light dark; --line: #d0d7de; --muted: #57606a; }
body { font: 15px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 1200px; padding: 16px; }
section { border-top: 1px solid var(--line); padding: 16px 0; }
h2 { font-size: 18px; margin: 0 0 4px; }
.status { font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); vertical-align: middle; }
.where, .none, figcaption { color: var(--muted); }
blockquote { margin: 8px 0; padding-left: 12px; border-left: 3px solid var(--line); }
.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
figure { margin: 0; } img, video { max-width: 100%; border: 1px solid var(--line); border-radius: 6px; }
</style></head><body>
<h1>Docs media review</h1>
<p>${shown.length} slot(s). Compare each new recording with the article, then approve it.</p>
${sections.join('\n')}
</body></html>
`;
  writeFresh(out, Buffer.from(html));
  if (json)
    deps.log(JSON.stringify({ out, slots: shown.map((r) => ({ id: r.slot.id, status: r.status })) }, null, 2));
  else deps.log(`wrote ${out} (${shown.length} slot(s))`);
  return 0;
}

/** Adds a slot for an article's nth image and prints a scenario to record it. */
async function addSlot(
  config: DocsConfig,
  configPath: string,
  root: string,
  article: string | undefined,
  opts: { image?: string; id?: string; scenario?: string; from?: string; json?: boolean },
  target: () => DocsTarget,
  deps: DocsDeps,
): Promise<number> {
  const n = Number(opts.image);
  if (!article || !Number.isInteger(n) || n < 1) {
    deps.error('Usage: docs add <article | link> --image <n> (the nth image, from 1)');
    return 4;
  }
  // A link as people share it: the target says which article that is.
  if (/^https?:\/\//i.test(article)) {
    let resolved: string | undefined;
    try {
      const t = target();
      if (!t.resolve) throw new Error('this target cannot look up an article from a link');
      resolved = await t.resolve(article);
    } catch (err) {
      deps.error(message(err));
      return 1;
    }
    if (!resolved) {
      deps.error(`${article} is not an article in this help centre`);
      return 4;
    }
    article = resolved;
  }
  // From an export, `42` reads `42.html`; the slot still names the article as the target does:
  // a remote target knows `collection/42.html` as `42`.
  const file =
    opts.from
      ? ['', '.html', '.md', '.mdx', '.json'].map((ext) => article + ext)
          .find((f) => fs.existsSync(path.resolve(root, opts.from!, f))) ?? article
      : article;
  if (opts.from && config.target.type !== 'markdown')
    article = path.basename(article).replace(ARTICLE_FILE, '');
  let found: ArticleBody;
  try {
    found = await target().read(file);
  } catch (err) {
    deps.error(message(err));
    return 1;
  }
  const sections = imageSections(found.body);
  const image = sections[n - 1];
  if (!image) {
    deps.error(`"${found.title}" has ${sections.length} image(s), not ${n}`);
    return 4;
  }
  // The title names the scenario and the GIF it renders, so no two slots may share it: a second
  // image under one heading becomes "<heading> 2". A --scenario that is taken is refused instead.
  const gifFor = (t: string) => `reports/gif/${scenarioSlug(t)}.gif`;
  const taken = (t: string) =>
    config.slots.some((s) => s.scenario === t || s.file === gifFor(t));
  const base = (image.heading || found.title).toLowerCase();
  let title = opts.scenario ?? base;
  if (opts.scenario && taken(title)) {
    deps.error(`scenario "${title}" is used by another slot already; pass a different --scenario`);
    return 4;
  }
  for (let k = 2; taken(title); k++) title = `${base} ${k}`;
  const id = opts.id ?? scenarioSlug(title);
  const name = path.basename(image.src.split(/[?#]/)[0]);
  // `replaces` must name one image only; the whole src does when the filename is shared.
  const replaces = sections.filter((s) => s.src.includes(name)).length === 1 ? name : image.src;
  const slot: DocsSlot = {
    id,
    article,
    file: gifFor(title),
    replaces,
    scenario: title,
  };
  try {
    checkSlot(slot, root);
    if (config.slots.some((s) => s.id === id))
      throw new Error(`slot id "${id}" is used already; pass --id`);
  } catch (err) {
    deps.error(message(err));
    return 4;
  }
  config.slots.push(slot);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  // A GIF needs two frames or more: one per step, so a short section gets an outcome step.
  const steps = sentences(image.text);
  const lines = [...(steps.length ? steps : ['TODO: the first step'])];
  if (lines.length < 2) lines.push('TODO: what the viewer sees once it is done');
  const stub = [
    `// ${webUrl(found.url) ?? article}`,
    `test(${JSON.stringify(title)}, async ({ page }, testInfo) => {`,
    '  story.init({ page }, testInfo, { featureVideo: true });',
    ...lines.flatMap((text, i) => [
      `  story.${i === 0 ? 'given' : i === lines.length - 1 && text.startsWith('TODO') ? 'then' : 'when'}(${JSON.stringify(text)});`,
      '  // TODO: do what it says, then:',
      `  await story.screenshot({ page, hold: 'auto' });`,
    ]),
    '});',
  ].join('\n');
  if (opts.json) {
    deps.log(
      JSON.stringify(
        {
          slot,
          article: { title: found.title, url: webUrl(found.url), heading: image.heading, image: n, src: image.src, text: image.text },
          steps: lines,
          scenario: stub,
        },
        null,
        2,
      ),
    );
    return 0;
  }
  deps.log(`Added slot "${id}" to ${path.basename(configPath)}: ${found.title}${image.heading ? ` › ${image.heading}` : ''}, image ${n}.`);
  deps.log('');
  deps.log(stub);
  return 0;
}

/** Whether a slot already covers this image: it replaced it, or is going to. */
const covers = (slot: DocsSlot, image: string, previous?: Published) =>
  previous?.src === image || (!!slot.replaces && image.includes(slot.replaces));

export const csvCell = (v: string | number) => {
  const s = String(v);
  // A leading = + - @, tab or carriage return can run as a formula in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** An image's kind from its filename: gif, png, … */
const kindOf = (src: string) =>
  path.extname(src.split(/[?#]/)[0]).slice(1).toLowerCase();

/** A slot names an article the way its target does; an exported copy may add `.html` or `.md`. */
const sameArticle = (slotArticle: string, listed: string) =>
  slotArticle === listed ||
  slotArticle === listed.replace(ARTICLE_FILE, '') ||
  slotArticle === path.basename(listed).replace(ARTICLE_FILE, '');

async function listArticles(
  config: DocsConfig,
  lock: DocsLock,
  flags: { json?: boolean; csv?: boolean; images?: boolean; only?: string },
  target: () => DocsTarget,
  deps: DocsDeps,
): Promise<number> {
  let refs: ArticleRef[];
  try {
    refs = await target().list();
  } catch (err) {
    deps.error(message(err));
    return 1;
  }
  const only = flags.only?.toLowerCase().replace(/^\./, '');
  const rows = refs.map((ref) => {
    const slots = config.slots.filter((s) => sameArticle(s.article, ref.article));
    const coveredBy = (img: string) =>
      slots.find((s) =>
        covers(s, img, publishedTo(lock, s, destination(config.target, s, deps.env))),
      );
    const images = ref.images
      .map((src, i) => ({ src, heading: ref.headings?.[i] ?? '', slot: coveredBy(src)?.id }))
      .filter((img) => !only || kindOf(img.src) === only);
    return {
      ...ref,
      images: images.map((i) => i.src),
      headings: images.map((i) => i.heading),
      slots: slots.map((s) => s.id),
      uncovered: images.filter((i) => !i.slot).map((i) => i.src),
      detail: images,
    };
  });
  if (flags.json)
    deps.log(JSON.stringify(rows.map(({ detail: _, ...r }) => r), null, 2));
  else if (flags.csv && flags.images) {
    deps.log('article,title,url,views,heading,image,type,slot');
    for (const r of rows)
      for (const img of r.detail)
        deps.log(
          [r.article, r.title, r.url ?? '', r.views ?? '', img.heading, img.src, kindOf(img.src), img.slot ?? '']
            .map(csvCell)
            .join(','),
        );
  } else if (flags.csv) {
    deps.log('article,title,url,images,slots,uncovered,gifs,views,updated');
    for (const r of rows)
      deps.log(
        [
          r.article,
          r.title,
          r.url ?? '',
          r.images.length,
          r.slots.join(' '),
          r.uncovered.join(' '),
          r.images.filter((i) => kindOf(i) === 'gif').length,
          r.views ?? '',
          r.updatedAt ?? '',
        ]
          .map(csvCell)
          .join(','),
      );
  } else {
    for (const r of rows)
      deps.log(
        `${String(r.images.length).padStart(3)} images  ${String(r.uncovered.length).padStart(3)} uncovered  ${r.title}  (${r.article})`,
      );
    const images = rows.reduce((n, r) => n + r.images.length, 0);
    const uncovered = rows.reduce((n, r) => n + r.uncovered.length, 0);
    deps.log(
      `${rows.length} articles, ${images} images, ${uncovered} not covered by a slot`,
    );
  }
  return 0;
}
