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
}

export interface DocsConfig {
  target: DocsTargetConfig;
  slots: DocsSlot[];
}

export interface Published {
  /** Where it was published: the target and article, from `destination()`. Another one is a first publish. */
  to: string;
  /** Where the article now points: a relative path, an asset URL or an attachment filename. */
  src: string;
  sha256: string;
  publishedAt: string;
}

export type DocsLock = Record<string, Published>;

export type SlotStatus = 'no media' | 'failing' | 'changed' | 'published';

/** An article in the help centre and the images in it, for `docs list`. */
export interface ArticleRef {
  /** What a slot's `article` names: the file path, article id or page id. */
  article: string;
  title: string;
  url?: string;
  images: string[];
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
}

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

/** What the article shows now, given the rendered file, what was published there and the run. */
export function slotStatus(
  slot: DocsSlot,
  media: Buffer | undefined,
  previous: Published | undefined,
  passed?: Set<string>,
): SlotStatus {
  if (!media) return 'no media';
  if (slot.scenario && passed && !passed.has(slot.scenario)) return 'failing';
  return previous?.sha256 === sha256(media) ? 'published' : 'changed';
}

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

/** Articles as Markdown or HTML files: the media goes in `media/` beside the article. */
export function markdownTarget(dir: string): DocsTarget {
  return {
    async list() {
      return (
        fs
          .readdirSync(dir, { recursive: true, encoding: 'utf8' })
          // A symlinked article that points out of `dir` is not listed: its contents are not ours.
          .filter((f) => /\.(md|mdx|html)$/.test(f) && inside(dir, f))
          .sort()
          .map((article) => {
            const body = fs.readFileSync(path.join(dir, article), 'utf8');
            // A Markdown `# Title`, else an HTML `<h1>` with its tags and entities removed.
            const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(body)?.[1];
            const title =
              /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ||
              (h1 && decodeEntities(h1.replace(/<[^>]*>/g, '')).trim()) ||
              article;
            return { article, title, images: imagesIn(body) };
          })
      );
    },
    async publish(slot, media, previous) {
      if (!inside(dir, slot.article))
        throw new Error(`article "${slot.article}" is outside ${dir}`);
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
        }>(
          `${base}/collections/${encodeURIComponent(id)}/articles?pageSize=100`,
          'articles',
        );
        for (const a of articles) {
          const { article } = await get<{ article: { text: string } }>(
            `${base}/articles/${encodeURIComponent(a.id)}`,
          );
          refs.push({
            article: a.id,
            title: a.name,
            url: a.publicUrl,
            images: imagesIn(article.text ?? ''),
          });
        }
      }
      return refs;
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
          refs.push({
            article: p.id,
            title: p.title,
            url: `${base}${p._links.webui}`,
            images: imagesIn(p.body.storage.value),
          });
        // `next` is a path from the site root ("/wiki/api/v2/…"); only follow it on the same host.
        next = res._links?.next
          ? new URL(res._links.next, base).href
          : undefined;
        if (next && new URL(next).origin !== new URL(base).origin)
          next = undefined;
      }
      return refs;
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
  executable-stories docs list    [--config docs.json] [--json | --csv]
  executable-stories docs status  [--config docs.json] [--report index.story-report.json] [--json]
  executable-stories docs publish [--config docs.json] [--report index.story-report.json] [--only <slot>]

Keeps the GIFs and videos in your help centre in step with the scenarios that record them.
docs.json lists each media slot: the article, the rendered file, the image it replaces and the
scenario behind it. publish puts every changed file into its article and records it in
docs.lock.json. With --report, a slot whose scenario did not pass is never published.
list shows every article in the help centre and its images, and which images no slot covers yet:
the backlog. --csv opens in a spreadsheet.

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

/** Titles of the passed scenarios in a StoryReport, and titles more than one scenario shares. */
function scenarioResults(reportPath: string) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
    features: { scenarios: { title: string; status: string }[] }[];
  };
  const scenarios = report.features.flatMap((f) => f.scenarios);
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const { title } of scenarios)
    (seen.has(title) ? shared : seen).add(title);
  const passed = new Set(
    scenarios.filter((s) => s.status === 'passed').map((s) => s.title),
  );
  return { passed, shared };
}

const read = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file) : undefined;

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
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    deps.error(HELP);
    return 4;
  }
  const [command] = parsed.positionals;
  if (
    parsed.values.help ||
    !['list', 'status', 'publish'].includes(command ?? '')
  ) {
    (parsed.values.help ? deps.log : deps.error)(HELP);
    return parsed.values.help ? 0 : 4;
  }

  const configPath = path.resolve(parsed.values.config!);
  const root = path.dirname(configPath);
  const lockPath = path.join(root, 'docs.lock.json');
  let config: DocsConfig;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as DocsConfig;
  } catch (err) {
    deps.error(
      `Cannot read ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 4;
  }
  if (!inside(root, lockPath)) {
    deps.error(`${lockPath} links outside the project`);
    return 4;
  }
  // No prototype, so a slot id like "__proto__" is an ordinary key.
  const lock: DocsLock = Object.assign(
    Object.create(null),
    JSON.parse(read(lockPath)?.toString() ?? '{}'),
  );
  if (config.target.type === 'markdown' && !inside(root, config.target.dir)) {
    deps.error(`target dir "${config.target.dir}" is outside the project`);
    return 4;
  }
  if (command === 'list')
    return listArticles(config, root, lock, parsed.values, deps);
  const needsRun = config.slots.some((s) => s.scenario);
  if (command === 'publish' && needsRun && !parsed.values.report) {
    deps.error(
      'Slots name scenarios: pass --report so only passed scenarios are published.',
    );
    return 4;
  }
  const results = parsed.values.report
    ? scenarioResults(path.resolve(parsed.values.report))
    : undefined;
  const slots = config.slots.filter(
    (s) => !parsed.values.only || s.id === parsed.values.only,
  );
  const articleDir =
    config.target.type === 'markdown'
      ? path.resolve(root, config.target.dir)
      : undefined;
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
    // One failing scenario among several with the same title must not let the title pass.
    for (const slot of slots)
      if (slot.scenario && results?.shared.has(slot.scenario))
        throw new Error(
          `slot "${slot.id}": several scenarios are titled "${slot.scenario}"; give it a unique title`,
        );
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    return 4;
  }
  const rows = slots.map((slot) => {
    const media = read(path.resolve(root, slot.file));
    const to = destination(config.target, slot, deps.env);
    const previous = publishedTo(lock, slot, to);
    return {
      slot,
      media,
      to,
      previous,
      status: slotStatus(slot, media, previous, results?.passed),
    };
  });

  if (command === 'status') {
    if (parsed.values.json) {
      deps.log(
        JSON.stringify(
          rows.map((r) => ({
            id: r.slot.id,
            article: r.slot.article,
            status: r.status,
          })),
          null,
          2,
        ),
      );
    } else {
      for (const r of rows)
        deps.log(`${r.status.padEnd(10)} ${r.slot.id}  (${r.slot.article})`);
    }
    return 0;
  }

  let target: DocsTarget;
  try {
    target = deps.target ?? makeTarget(config, root, deps.env);
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    return 4;
  }
  let failed = 0;
  for (const { slot, media, to, previous, status } of rows) {
    if (status !== 'changed') {
      deps.log(`skip     ${slot.id}: ${status}`);
      continue;
    }
    try {
      const { src } = await target.publish(slot, media!, previous);
      lock[slot.id] = {
        to,
        src,
        sha256: sha256(media!),
        publishedAt: deps.now().toISOString(),
      };
      // Written per slot, so a failure later in the list never forgets what already went out.
      writeFresh(lockPath, Buffer.from(JSON.stringify(lock, null, 2) + '\n'));
      deps.log(`publish  ${slot.id} → ${src}`);
    } catch (err) {
      failed++;
      deps.error(
        `failed   ${slot.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return failed ? 1 : 0;
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

async function listArticles(
  config: DocsConfig,
  root: string,
  lock: DocsLock,
  flags: { json?: boolean; csv?: boolean },
  deps: DocsDeps,
): Promise<number> {
  let refs: ArticleRef[];
  try {
    refs = await (deps.target ?? makeTarget(config, root, deps.env)).list();
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
  const rows = refs.map((ref) => {
    const slots = config.slots.filter((s) => s.article === ref.article);
    const uncovered = ref.images.filter(
      (img) =>
        !slots.some((s) =>
          covers(
            s,
            img,
            publishedTo(lock, s, destination(config.target, s, deps.env)),
          ),
        ),
    );
    return { ...ref, slots: slots.map((s) => s.id), uncovered };
  });
  if (flags.json) deps.log(JSON.stringify(rows, null, 2));
  else if (flags.csv) {
    deps.log('article,title,url,images,slots,uncovered');
    for (const r of rows)
      deps.log(
        [
          r.article,
          r.title,
          r.url ?? '',
          r.images.length,
          r.slots.join(' '),
          r.uncovered.join(' '),
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
