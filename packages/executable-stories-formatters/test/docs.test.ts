import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  confluenceTarget,
  csvCell,
  destination,
  helpScoutTarget,
  imageSections,
  imagesIn,
  isMedia,
  markdownTarget,
  quotedIn,
  replaceImage,
  runDocs,
  type FetchFn,
} from '../src/docs';

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-'));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.mkdirSync(path.join(root, 'reports'));
  fs.writeFileSync(
    path.join(root, 'docs/contacts.md'),
    '# Contacts\n\n![Add](old/add.gif)\n\n![Import](old/import.gif)\n',
  );
  fs.writeFileSync(path.join(root, 'reports/add.gif'), 'GIF89a-1');
  fs.writeFileSync(
    path.join(root, 'reports/index.story-report.json'),
    JSON.stringify({
      features: [
        {
          scenarios: [
            { title: 'add a contact', status: 'passed' },
            { title: 'import contacts', status: 'failed' },
          ],
        },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(root, 'docs.json'),
    JSON.stringify({
      target: { type: 'markdown', dir: 'docs' },
      slots: [
        {
          id: 'add-contact',
          article: 'contacts.md',
          file: 'reports/add.gif',
          replaces: 'add.gif',
          scenario: 'add a contact',
        },
        {
          id: 'import-contacts',
          article: 'contacts.md',
          file: 'reports/import.gif',
          replaces: 'import.gif',
          scenario: 'import contacts',
        },
      ],
    }),
  );
  return root;
}

async function run(root: string, ...args: string[]) {
  const out: string[] = [];
  const code = await runDocs(
    [
      ...args,
      '--config',
      path.join(root, 'docs.json'),
      '--report',
      path.join(root, 'reports/index.story-report.json'),
    ],
    {
      log: (l) => out.push(l),
      error: (l) => out.push(l),
      env: {},
      now: () => new Date('2026-10-20T00:00:00Z'),
    },
  );
  return { code, out: out.join('\n') };
}

describe('replaceImage', () => {
  it('swaps the one matching Markdown, HTML or Confluence reference', () => {
    expect(
      replaceImage('![a](x/old.gif) ![b](y.png)', 'old.gif', 'new.gif'),
    ).toBe('![a](new.gif) ![b](y.png)');
    expect(
      replaceImage('<img src="https://cdn/old.gif">', 'old.gif', 'N'),
    ).toBe('<img src="N">');
    expect(
      replaceImage(
        '<ac:image><ri:attachment ri:filename="old.gif"/></ac:image>',
        'old.gif',
        'n.gif',
      ),
    ).toBe('<ac:image><ri:attachment ri:filename="n.gif"/></ac:image>');
  });

  it('ignores links and iframes, which are not images', () => {
    expect(
      imagesIn(
        '[a](x.gif) <iframe src="https://yt/embed"></iframe> <img alt="a" src="y.gif">',
      ),
    ).toEqual(['y.gif']);
    // A Confluence attachment linked for download is not an image, and is never rewritten.
    const page =
      '<ac:link><ri:attachment ri:filename="contacts.xlsx"/></ac:link>' +
      '<ac:image ac:width="600"><ri:attachment ri:filename="add.gif"/></ac:image>';
    expect(imagesIn(page)).toEqual(['add.gif']);
    expect(() => replaceImage(page, 'contacts.xlsx', 'import.gif')).toThrow(
      /no image matching/,
    );
  });

  it('reads a src with spaces, quotes or parentheses whole', () => {
    expect(
      imagesIn(
        `<img alt="a" src="Import contacts.gif"> <img src='it"s.gif'> ` +
          '![b](images/import(1).gif "Import") ![c](<my shot.gif>)',
      ),
    ).toEqual([
      'Import contacts.gif',
      'it"s.gif',
      'images/import(1).gif',
      'my shot.gif',
    ]);
    expect(
      replaceImage('![b](images/import(1).gif "Import")', 'import(1)', 'n.gif'),
    ).toBe('![b](n.gif "Import")');
    expect(
      replaceImage('<img src="Import contacts.gif">', 'contacts', 'n.gif'),
    ).toBe('<img src="n.gif">');
    expect(imagesIn('<img data-src="lazy.gif">')).toEqual([]);
    expect(
      replaceImage('![Import](images/import(v1(final)).gif)', 'final', 'n.gif'),
    ).toBe('![Import](n.gif)');
    expect(imagesIn('![a](x\\(.gif) ![b](open(.gif)')).toEqual(['x\\(.gif']);
  });

  it('turns an external Confluence image into the attachment', () => {
    const page =
      '<ac:image ac:width="600"><ri:url ri:value="https://cdn/old.gif" /></ac:image>';
    expect(imagesIn(page)).toEqual(['https://cdn/old.gif']);
    expect(replaceImage(page, 'old.gif', 'add-contact.gif')).toBe(
      '<ac:image ac:width="600"><ri:attachment ri:filename="add-contact.gif"/></ac:image>',
    );
  });

  it('decodes entities in an attribute src and escapes them on the way back', () => {
    expect(
      imagesIn(
        '<img src="a&amp;b&#32;c&#x28;1&#x29;.gif"> ![m](a&amp;b.gif) <img src="&bogus;.gif">',
      ),
    ).toEqual(['a&b c(1).gif', 'a&amp;b.gif', '&bogus;.gif']);
    expect(
      replaceImage(
        '<img src="a&amp;b.gif">',
        'a&b',
        'https://hs/x.gif?v=1&s=2',
      ),
    ).toBe('<img src="https://hs/x.gif?v=1&amp;s=2">');
  });

  it('reads an external Confluence image with a closing tag', () => {
    const page =
      '<ac:image><ri:url ri:value="https://cdn/old.gif?a=1&amp;b=2"></ri:url></ac:image>';
    expect(imagesIn(page)).toEqual(['https://cdn/old.gif?a=1&b=2']);
    expect(replaceImage(page, 'a=1&b=2', 'add-contact.gif')).toBe(
      '<ac:image><ri:attachment ri:filename="add-contact.gif"/></ac:image>',
    );
  });

  it('tells Confluence sites apart, since page ids are per site', () => {
    const target = { type: 'confluence' } as const;
    const page = { id: 's', article: '7', file: 'a.gif' };
    const on = (url: string) =>
      destination(target, page, { CONFLUENCE_BASE_URL: url });
    expect(on('https://acme.atlassian.net/wiki/')).toBe(
      on('https://acme.atlassian.net/wiki'),
    );
    expect(on('https://acme.atlassian.net/wiki')).not.toBe(
      on('https://other.atlassian.net/wiki'),
    );
  });

  it('refuses a src that would break out of the attribute', () => {
    expect(() =>
      replaceImage('<img src="old.gif">', 'old.gif', 'x" onerror="y'),
    ).toThrow(/unsafe/);
  });

  it('refuses no match or an ambiguous one rather than guess', () => {
    expect(() => replaceImage('![a](a.gif)', 'b.gif', 'n')).toThrow(/no image/);
    expect(() => replaceImage('![a](x.gif) ![b](y.gif)', '.gif', 'n')).toThrow(
      /matches 2/,
    );
  });
});

describe('docs (markdown target)', () => {
  it('reports each slot, publishes only changed media from passed scenarios, then nothing on a re-run', async () => {
    const root = project();
    expect((await run(root, 'status')).out).toBe(
      'changed    add-contact  (contacts.md)\nno media   import-contacts  (contacts.md)',
    );

    fs.writeFileSync(path.join(root, 'reports/import.gif'), 'GIF89a-2');
    const first = await run(root, 'publish');
    expect(first.code).toBe(0);
    expect(first.out).toContain('skip     import-contacts: failing');
    expect(fs.readFileSync(path.join(root, 'docs/contacts.md'), 'utf8')).toBe(
      '# Contacts\n\n![Add](media/add-contact.gif)\n\n![Import](old/import.gif)\n',
    );
    expect(
      fs.readFileSync(path.join(root, 'docs/media/add-contact.gif'), 'utf8'),
    ).toBe('GIF89a-1');
    expect(
      JSON.parse(fs.readFileSync(path.join(root, 'docs.lock.json'), 'utf8'))[
        'add-contact'
      ].src,
    ).toBe('media/add-contact.gif');

    expect((await run(root, 'publish')).out).toContain(
      'skip     add-contact: published',
    );

    // A new render replaces the file the article already points at.
    fs.writeFileSync(path.join(root, 'reports/add.gif'), 'GIF89a-3');
    expect((await run(root, 'publish')).code).toBe(0);
    expect(
      fs.readFileSync(path.join(root, 'docs/media/add-contact.gif'), 'utf8'),
    ).toBe('GIF89a-3');
  });

  it.each([
    [{ id: '../x' }, /slot id/],
    [{ file: '../../etc/passwd.gif' }, /outside the project/],
    [{ article: '../../outside.md' }, /outside/],
    [{ file: 'reports/add.g"if' }, /file must be/],
    [{ file: 'docs.json' }, /file must be/],
  ])('refuses a slot that escapes the project: %o', async (patch, message) => {
    const root = project();
    const config = JSON.parse(
      fs.readFileSync(path.join(root, 'docs.json'), 'utf8'),
    );
    Object.assign(config.slots[0], patch);
    fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
    const { code, out } = await run(root, 'publish');
    expect(code).toBe(4);
    expect(out).toMatch(message);
  });

  it('refuses a target dir outside the project', async () => {
    const root = project();
    const config = JSON.parse(
      fs.readFileSync(path.join(root, 'docs.json'), 'utf8'),
    );
    config.target.dir = '..';
    fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
    expect((await run(root, 'publish')).out).toMatch(/target dir/);
  });

  it('follows symlinks before deciding a path is inside the project', async () => {
    const root = project();
    const secret = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'secret-')),
      'key.gif',
    );
    fs.writeFileSync(secret, 'SECRET');
    fs.symlinkSync(secret, path.join(root, 'reports/add.gif.link.gif'));
    fs.symlinkSync(path.dirname(secret), path.join(root, 'docs/media'));
    const config = JSON.parse(
      fs.readFileSync(path.join(root, 'docs.json'), 'utf8'),
    );
    config.slots[0].file = 'reports/add.gif.link.gif';
    fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
    expect((await run(root, 'publish')).out).toMatch(/outside the project/);

    // A media folder that links out of the docs is refused before anything is written there.
    config.slots[0].file = 'reports/add.gif';
    fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
    expect((await run(root, 'publish')).out).toMatch(
      /media for "add-contact" is outside/,
    );
    expect(fs.readdirSync(path.dirname(secret))).toEqual(['key.gif']);
  });

  it('refuses a dangling symlink where the media will be written', async () => {
    const root = project();
    const target = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'out-')),
      'planted.gif',
    );
    fs.mkdirSync(path.join(root, 'docs/media'));
    fs.symlinkSync(target, path.join(root, 'docs/media/add-contact.gif'));
    expect((await run(root, 'publish')).out).toMatch(/outside/);
    expect(fs.existsSync(target)).toBe(false);
  });

  it('refuses a lock file that links out of the project', async () => {
    const outside = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'out-')),
      'victim.json',
    );
    fs.writeFileSync(outside, '{"keep":true}');
    const root = project();
    fs.symlinkSync(outside, path.join(root, 'docs.lock.json'));
    expect((await run(root, 'publish')).out).toMatch(/links outside/);
    expect(fs.readFileSync(outside, 'utf8')).toBe('{"keep":true}');
  });

  it('refuses two slots with one id', async () => {
    const root = project();
    const config = JSON.parse(
      fs.readFileSync(path.join(root, 'docs.json'), 'utf8'),
    );
    config.slots[1].id = 'add-contact';
    fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
    const { code, out } = await run(root, 'publish');
    expect(code).toBe(4);
    expect(out).toMatch(/"add-contact" is used twice/);
    expect(fs.existsSync(path.join(root, 'docs/media'))).toBe(false);
  });

  it('publishes afresh when a slot moves to another article', async () => {
    const root = project();
    expect((await run(root, 'publish')).code).toBe(0);
    fs.writeFileSync(path.join(root, 'docs/other.md'), '![Add](old/add.gif)\n');
    const config = JSON.parse(
      fs.readFileSync(path.join(root, 'docs.json'), 'utf8'),
    );
    config.slots[0].article = 'other.md';
    fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
    expect((await run(root, 'status')).out).toMatch(/^changed +add-contact/);
    expect((await run(root, 'publish')).code).toBe(0);
    expect(fs.readFileSync(path.join(root, 'docs/other.md'), 'utf8')).toBe(
      '![Add](media/add-contact.gif)\n',
    );
  });

  it('refuses to republish once the article no longer shows the image', async () => {
    const root = project();
    expect((await run(root, 'publish')).code).toBe(0);
    fs.writeFileSync(path.join(root, 'docs/contacts.md'), '# Contacts\n');
    fs.writeFileSync(path.join(root, 'reports/add.gif'), 'GIF89a-2');
    const { code, out } = await run(root, 'publish');
    expect(code).toBe(1);
    expect(out).toMatch(/no image matching "media\/add-contact.gif"/);
    expect(
      fs.readFileSync(path.join(root, 'docs/media/add-contact.gif'), 'utf8'),
    ).toBe('GIF89a-1');
  });

  it('records a slot whose id is __proto__', async () => {
    const root = project();
    const config = JSON.parse(
      fs.readFileSync(path.join(root, 'docs.json'), 'utf8'),
    );
    config.slots = [{ ...config.slots[0], id: '__proto__' }];
    fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
    expect((await run(root, 'publish')).code).toBe(0);
    const lock = fs.readFileSync(path.join(root, 'docs.lock.json'), 'utf8');
    expect(Object.keys(JSON.parse(lock))).toEqual(['__proto__']);
    expect((await run(root, 'publish')).out).toContain(
      'skip     __proto__: published',
    );
  });

  it('refuses a scenario title that several scenarios share', async () => {
    const root = project();
    const reportPath = path.join(root, 'reports/index.story-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        features: [
          { scenarios: [{ title: 'add a contact', status: 'passed' }] },
          { scenarios: [{ title: 'add a contact', status: 'failed' }] },
        ],
      }),
    );
    const { code, out } = await run(root, 'publish');
    expect(code).toBe(4);
    expect(out).toMatch(/several scenarios are titled "add a contact"/);
  });

  it('refuses a media file that is not an image or video', async () => {
    const root = project();
    fs.writeFileSync(path.join(root, '.env'), 'TOKEN=secret');
    fs.rmSync(path.join(root, 'reports/add.gif'));
    fs.symlinkSync(path.join(root, '.env'), path.join(root, 'reports/add.gif'));
    const { code, out } = await run(root, 'publish');
    expect(code).toBe(4);
    expect(out).toMatch(/reports\/add.gif is not an image or video/);
    expect(fs.existsSync(path.join(root, 'docs/media'))).toBe(false);
  });

  it('recognises the media it publishes by its first bytes', () => {
    const b = (s: string) => Buffer.from(s, 'latin1');
    expect(isMedia(b('GIF89a'))).toBe(true);
    expect(isMedia(b('\x89PNG\r\n'))).toBe(true);
    expect(isMedia(b('\xff\xd8\xff\xe0'))).toBe(true);
    expect(isMedia(b('RIFF\0\0\0\0WEBPVP8'))).toBe(true);
    expect(isMedia(b('\0\0\0\x18ftypmp42'))).toBe(true);
    expect(isMedia(b('\x1a\x45\xdf\xa3'))).toBe(true);
    expect(isMedia(b('TOKEN=secret'))).toBe(false);
  });

  it('will not publish without the run when slots name scenarios', async () => {
    const root = project();
    const out: string[] = [];
    const code = await runDocs(
      ['publish', '--config', path.join(root, 'docs.json')],
      { error: (l) => out.push(l) },
    );
    expect(code).toBe(4);
    expect(out.join()).toMatch(/--report/);
  });
});

/** A fetch that answers by "METHOD path?query", else "METHOD path", and records each call. */
function fakeFetch(routes: Record<string, unknown>) {
  const calls: { key: string; body: unknown }[] = [];
  const fn = (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const full = `${init.method ?? 'GET'} ${u.pathname}${u.search}`;
    const key = full in routes ? full : `${init.method ?? 'GET'} ${u.pathname}`;
    calls.push({ key, body: init.body });
    if (!(key in routes)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200 });
  }) as unknown as FetchFn;
  return { fn, calls };
}

const slot = {
  id: 'add-contact',
  article: '42',
  file: 'add.gif',
  replaces: 'old.gif',
};

describe('helpScoutTarget', () => {
  it("uploads an asset and points the article's image at it", async () => {
    const { fn, calls } = fakeFetch({
      'GET /v1/articles/42': {
        article: { text: '<p><img src="https://hs/old.gif"></p>' },
      },
      'POST /v1/assets/article': { filelink: 'https://hs/new.gif' },
      'PUT /v1/articles/42': {},
    });
    const { src } = await helpScoutTarget('key', fn).publish(
      slot,
      Buffer.from('GIF'),
    );
    expect(src).toBe('https://hs/new.gif');
    expect(JSON.parse(calls.at(-1)!.body as string)).toEqual({
      text: '<p><img src="https://hs/new.gif"></p>',
    });
  });
});

describe('helpScoutTarget refusal', () => {
  it('uploads nothing once the article no longer shows the image', async () => {
    const { fn, calls } = fakeFetch({
      'GET /v1/articles/42': { article: { text: '<p>No images</p>' } },
      'POST /v1/assets/article': { filelink: 'https://hs/new.gif' },
    });
    await expect(
      helpScoutTarget('key', fn).publish(slot, Buffer.from('GIF')),
    ).rejects.toThrow(/no image matching "old.gif"/);
    expect(calls.map((c) => c.key)).toEqual(['GET /v1/articles/42']);
  });
});

describe('confluenceTarget', () => {
  const routes = {
    'PUT /wiki/rest/api/content/7/child/attachment': {},
    'GET /wiki/api/v2/pages/7': {
      title: 'Contacts',
      version: { number: 3 },
      body: {
        storage: {
          value: '<ac:image><ri:attachment ri:filename="old.gif"/></ac:image>',
        },
      },
    },
    'PUT /wiki/api/v2/pages/7': {},
  };
  const page = { ...slot, article: '7' };

  it("attaches the media and repoints the page's image on first publish", async () => {
    const { fn, calls } = fakeFetch(routes);
    await confluenceTarget(
      'https://acme.atlassian.net/wiki',
      { email: 'e', token: 't' },
      fn,
    ).publish(page, Buffer.from('GIF'));
    const put = JSON.parse(calls.at(-1)!.body as string);
    expect(put.body.value).toBe(
      '<ac:image><ri:attachment ri:filename="add-contact.gif"/></ac:image>',
    );
    expect(put.version.number).toBe(4);
  });

  const published = {
    to: 'confluence:https://acme.atlassian.net/wiki/7',
    src: 'add-contact.gif',
    sha256: 'x',
    publishedAt: '',
  };

  it('only re-uploads the attachment once the page shows it', async () => {
    const { fn, calls } = fakeFetch({
      ...routes,
      'GET /wiki/api/v2/pages/7': {
        ...routes['GET /wiki/api/v2/pages/7'],
        body: {
          storage: {
            value:
              '<ac:image><ri:attachment ri:filename="add-contact.gif"/></ac:image>',
          },
        },
      },
    });
    await confluenceTarget(
      'https://acme.atlassian.net/wiki',
      { email: 'e', token: 't' },
      fn,
    ).publish(page, Buffer.from('GIF'), published);
    expect(calls.map((c) => c.key)).toEqual([
      'GET /wiki/api/v2/pages/7',
      'PUT /wiki/rest/api/content/7/child/attachment',
    ]);
  });

  it('refuses to re-upload once the page no longer shows the image', async () => {
    const { fn, calls } = fakeFetch(routes);
    await expect(
      confluenceTarget(
        'https://acme.atlassian.net/wiki',
        { email: 'e', token: 't' },
        fn,
      ).publish(page, Buffer.from('GIF'), published),
    ).rejects.toThrow(/no image matching "add-contact.gif"/);
    expect(calls.map((c) => c.key)).toEqual(['GET /wiki/api/v2/pages/7']);
  });
});

describe('docs list', () => {
  it('lists every article and the images no slot covers yet', async () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, 'docs/other.md'),
      '# Other\n\n[a link](not-an-image.gif)\n',
    );
    fs.writeFileSync(
      path.join(root, 'docs/export.html'),
      '<h1 id="x">Tips <em>&amp;</em> Tricks</h1><img src="a.gif">',
    );
    const { code, out } = await run(root, 'list');
    expect(code).toBe(0);
    expect(out).toBe(
      [
        '  2 images    0 uncovered  Contacts  (contacts.md)',
        '  1 images    1 uncovered  Tips & Tricks  (export.html)',
        '  0 images    0 uncovered  Other  (other.md)',
        '3 articles, 3 images, 1 not covered by a slot',
      ].join('\n'),
    );
  });

  it('skips an article that links out of the docs', async () => {
    const outside = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'out-')),
      'secret.md',
    );
    fs.writeFileSync(outside, '# Secret\n\n![x](https://internal/x.png)\n');
    const root = project();
    fs.symlinkSync(outside, path.join(root, 'docs/leak.md'));
    const { out } = await run(root, 'list');
    expect(out).not.toMatch(/Secret|leak\.md/);
  });

  it('escapes a cell starting with a tab or carriage return', () => {
    expect(csvCell('\t=1+1')).toBe("'\t=1+1");
    expect(csvCell('\r=1+1')).toBe('"\'\r=1+1"');
  });

  it('writes CSV a spreadsheet will not execute', async () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, 'docs/evil.md'),
      '# =HYPERLINK("x")\n\n![](a.gif)\n',
    );
    const { out } = await run(root, 'list', '--csv');
    expect(out.split('\n')[2]).toBe(`evil.md,"'=HYPERLINK(""x"")",,1,,a.gif,1,,`);
  });
});

describe('list from a help centre', () => {
  it('pages through Help Scout collections and reads each article', async () => {
    const { fn, calls } = fakeFetch({
      'GET /v1/collections?page=1': {
        collections: { pages: 1, items: [{ id: 'c1' }] },
      },
      'GET /v1/collections/c1/articles?pageSize=100&page=1': {
        articles: {
          pages: 2,
          items: [
            {
              id: 'a1',
              name: 'One',
              publicUrl: 'https://hs/1',
              viewCount: 905,
              updatedAt: '2026-01-02T00:00:00Z',
            },
          ],
        },
      },
      'GET /v1/collections/c1/articles?pageSize=100&page=2': {
        articles: { pages: 2, items: [{ id: 'a2', name: 'Two' }] },
      },
      'GET /v1/articles/a1': {
        article: { text: '<h2>Add</h2><img src="https://hs/x.gif">' },
      },
      'GET /v1/articles/a2': { article: { text: '<p>none</p>' } },
    });
    expect(await helpScoutTarget('key', fn).list()).toEqual([
      {
        article: 'a1',
        title: 'One',
        url: 'https://hs/1',
        images: ['https://hs/x.gif'],
        headings: ['Add'],
        views: 905,
        updatedAt: '2026-01-02T00:00:00Z',
      },
      {
        article: 'a2',
        title: 'Two',
        url: undefined,
        images: [],
        headings: [],
        views: undefined,
        updatedAt: undefined,
      },
    ]);
    expect(calls.every((c) => !c.key.includes('not found'))).toBe(true);
  });

  it('follows Confluence next links on the same host only', async () => {
    const { fn } = fakeFetch({
      'GET /wiki/api/v2/spaces/S/pages?body-format=storage&limit=250': {
        results: [
          {
            id: '1',
            title: 'One',
            body: {
              storage: {
                value:
                  '<ac:image><ri:attachment ri:filename="a.gif"/></ac:image>',
              },
            },
            _links: { webui: '/spaces/S/pages/1' },
          },
        ],
        _links: { next: '/wiki/api/v2/spaces/S/pages?cursor=2' },
      },
      'GET /wiki/api/v2/spaces/S/pages?cursor=2': {
        results: [
          {
            id: '2',
            title: 'Two',
            body: { storage: { value: '' } },
            _links: { webui: '/spaces/S/pages/2' },
          },
        ],
        _links: { next: 'https://evil.example/steal' },
      },
    });
    const refs = await confluenceTarget(
      'https://acme.atlassian.net/wiki',
      { email: 'e', token: 't' },
      fn,
      'S',
    ).list();
    expect(refs.map((r) => [r.article, r.images])).toEqual([
      ['1', ['a.gif']],
      ['2', []],
    ]);
    expect(refs[0]!.url).toBe(
      'https://acme.atlassian.net/wiki/spaces/S/pages/1',
    );
  });
});

describe('confluenceTarget image', () => {
  it('downloads a page attachment from the same site, and only media', async () => {
    const { fn, calls } = fakeFetch({
      'GET /wiki/rest/api/content/7/child/attachment': {
        results: [{ _links: { download: '/download/attachments/7/add.gif' } }],
      },
    });
    const gif = (async (url: string, init: RequestInit = {}) =>
      url.includes('/download/')
        ? new Response('GIF89a-page', { status: 200 })
        : fn(url, init)) as unknown as FetchFn;
    const target = confluenceTarget('https://acme.atlassian.net/wiki', { email: 'e', token: 't' }, gif);
    expect((await target.image!('7', 'add.gif'))?.toString()).toBe('GIF89a-page');
    expect(calls[0]!.key).toBe('GET /wiki/rest/api/content/7/child/attachment');

    // Spliced onto a site with no path, ".evil.example" would make the host acme.atlassian.net.evil.example.
    const elsewhere = fakeFetch({
      'GET /rest/api/content/7/child/attachment': {
        results: [{ _links: { download: '.evil.example/x.gif' } }],
      },
    });
    const away = confluenceTarget('https://acme.atlassian.net', { email: 'e', token: 't' }, elsewhere.fn);
    expect(await away.image!('7', 'add.gif')).toBeUndefined();
    expect(elsewhere.calls).toHaveLength(1);
  });
});

describe('helpScoutTarget upload', () => {
  it('sends the API key in the form, as the asset endpoint requires', async () => {
    const { fn, calls } = fakeFetch({
      'GET /v1/articles/42': {
        article: { text: '<img src="https://hs/old.gif">' },
      },
      'POST /v1/assets/article': { filelink: 'https://hs/new.gif' },
      'PUT /v1/articles/42': {},
    });
    await helpScoutTarget('secret', fn).publish(slot, Buffer.from('GIF'));
    const form = calls.find((c) => c.key === 'POST /v1/assets/article')!
      .body as FormData;
    expect(form.get('key')).toBe('secret');
    expect(form.get('assetType')).toBe('image');
  });
});

/** Rewrites docs.json and the run, for the tests below. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- test fixtures

function edit(root: string, fn: (config: Json, report: Json) => void) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
  const reportPath = path.join(root, 'reports/index.story-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  fn(config, report);
  fs.writeFileSync(path.join(root, 'docs.json'), JSON.stringify(config));
  fs.writeFileSync(reportPath, JSON.stringify(report));
}

describe('article sections', () => {
  const article =
    '<h1>Contacts</h1><p>Intro.</p><h2>Add a contact</h2><p>Open Contacts from the sidebar. ' +
    'Select New contact &amp; enter a name.</p><img src="https://cdn/add.gif" alt="a">' +
    '<p>Then select Save.</p><img src="https://cdn/save.gif"><h2>Import</h2>\n\n![Import](import.gif)';

  it('finds the heading over each image and the text leading up to it', () => {
    expect(imageSections(article)).toEqual([
      {
        src: 'https://cdn/add.gif',
        heading: 'Add a contact',
        text: 'Open Contacts from the sidebar. Select New contact & enter a name.',
      },
      { src: 'https://cdn/save.gif', heading: 'Add a contact', text: 'Then select Save.' },
      { src: 'import.gif', heading: 'Import', text: '' },
    ]);
  });

  it('matches steps to the article whatever the case, quotes or closing punctuation', () => {
    expect(
      quotedIn(article, [
        'open contacts from the sidebar',
        'Select New contact & enter a name!',
        'The contact appears in the list.',
      ]),
    ).toEqual(['open contacts from the sidebar', 'Select New contact & enter a name!']);
  });
});

describe('docs for a team', () => {
  it('lists one row per image with its heading, and only the kind asked for', async () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, 'docs/guide.html'),
      '<!-- https://help.example/article/7-guide -->\n<h1>Guide</h1><h2>Start</h2><img src="a.png"><img src="b.gif">',
    );
    const { out } = await run(root, 'list', '--csv', '--images', '--only', 'gif');
    expect(out.split('\n')).toEqual([
      'article,title,url,views,heading,image,type,slot',
      'contacts.md,Contacts,,,Contacts,old/add.gif,gif,add-contact',
      'contacts.md,Contacts,,,Contacts,old/import.gif,gif,import-contacts',
      'guide.html,Guide,https://help.example/article/7-guide,,Start,b.gif,gif,',
    ]);
  });

  it('lists a local export against slots that name articles by id', async () => {
    const root = project();
    fs.mkdirSync(path.join(root, 'export'));
    fs.writeFileSync(path.join(root, 'export/42.html'), '<h1>Contacts</h1><img src="https://cdn/old/add.gif">');
    edit(root, (config) => {
      config.target = { type: 'helpscout' };
      config.slots = [{ ...config.slots[0], article: '42' }];
    });
    const { code, out } = await run(root, 'list', '--from', 'export');
    expect(code).toBe(0);
    expect(out).toContain('  1 images    0 uncovered  Contacts  (42.html)');
  });

  it('follows a slot by tag when its scenario is renamed', async () => {
    const root = project();
    edit(root, (config, report) => {
      config.slots[0] = { ...config.slots[0], scenario: undefined, tag: 'media:add' };
      report.features[0].scenarios[0] = { title: 'renamed', status: 'passed', tags: ['media:add'] };
    });
    expect((await run(root, 'status')).out).toContain('changed    add-contact');
    edit(root, (_, report) => {
      report.features[0].scenarios.push({ title: 'copy', status: 'passed', tags: ['media:add'] });
    });
    const twice = await run(root, 'status');
    expect(twice.code).toBe(4);
    expect(twice.out).toMatch(/several scenarios are tagged "media:add"/);
  });

  it('publishes only the file someone approved, and asks again after a re-render', async () => {
    const root = project();
    edit(root, (config) => (config.approval = true));
    expect((await run(root, 'status')).out).toContain('unapproved add-contact');
    expect((await run(root, 'publish')).out).toContain('skip     add-contact: unapproved');

    // A failing scenario cannot be approved.
    fs.writeFileSync(path.join(root, 'reports/import.gif'), 'GIF89a-2');
    const refused = await run(root, 'approve', 'add-contact', 'import-contacts', '--by', 'Sam');
    expect(refused.code).toBe(1);
    expect(refused.out).toContain('refused  import-contacts: failing');
    const approvals = JSON.parse(fs.readFileSync(path.join(root, 'docs.approvals.json'), 'utf8'));
    expect(approvals['add-contact']).toMatchObject({ by: 'Sam', approvedAt: '2026-10-20T00:00:00.000Z' });
    expect(approvals['import-contacts']).toBeUndefined();

    expect((await run(root, 'publish')).out).toContain('publish  add-contact');
    fs.writeFileSync(path.join(root, 'reports/add.gif'), 'GIF89a-9');
    expect((await run(root, 'status')).out).toContain('unapproved add-contact');
  });

  it.each(['publish', 'status', 'review', 'approve'])(
    'refuses --from for %s, which would judge or publish against a copy',
    async (command) => {
      const root = project();
      fs.mkdirSync(path.join(root, 'export'));
      const { code, out } = await run(root, command, 'add-contact', '--from', 'export');
      expect(code).toBe(4);
      expect(out).toContain('only works with list and add');
      expect(fs.existsSync(path.join(root, 'docs.lock.json'))).toBe(false);
    },
  );

  it('refuses to approve a slot docs.json does not have', async () => {
    const { code, out } = await run(project(), 'approve', 'nope');
    expect(code).toBe(4);
    expect(out).toContain('No slot "nope"');
  });

  it('notes which steps quoted the article, and flags them once it stops saying them', async () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, 'docs/contacts.md'),
      '# Contacts\n\nOpen Contacts from the sidebar.\n\n![Add](old/add.gif)\n\n![Import](old/import.gif)\n',
    );
    edit(root, (_, report) => {
      report.features[0].scenarios[0].steps = [
        { keyword: 'Given', text: 'Open Contacts from the sidebar.' },
        { keyword: 'Then', text: 'the contact is saved' },
      ];
    });
    await run(root, 'publish');
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'docs.lock.json'), 'utf8'));
    expect(lock['add-contact'].quoted).toEqual(['Open Contacts from the sidebar.']);

    expect((await run(root, 'status', '--wording')).out).not.toContain('no longer says');
    const article = path.join(root, 'docs/contacts.md');
    fs.writeFileSync(article, fs.readFileSync(article, 'utf8').replace('from the sidebar', 'from the menu'));
    expect((await run(root, 'status', '--wording')).out).toContain(
      'the article no longer says: "Open Contacts from the sidebar."',
    );
  });

  it('writes a review page with the new media inline and the steps to check', async () => {
    const root = project();
    edit(root, (_, report) => {
      report.features[0].scenarios[0].steps = [{ keyword: 'Given', text: 'Open <Contacts>' }];
    });
    const { code } = await run(root, 'review', '--out', path.join(root, 'review.html'));
    expect(code).toBe(0);
    const html = fs.readFileSync(path.join(root, 'review.html'), 'utf8');
    expect(html).toContain('<h2>add-contact <span class="status changed">changed</span></h2>');
    expect(html).toContain(`data:image/gif;base64,${Buffer.from('GIF89a-1').toString('base64')}`);
    expect(html).toContain('<li>Given Open &#60;Contacts&#62;</li>');
    // The command works as written: the same config and run, and the run approval needs.
    expect(html).toContain(
      `executable-stories docs approve add-contact --config ${path.join(root, 'docs.json')} --report ${path.join(root, 'reports/index.story-report.json')}`,
    );
    // A slot with no media yet has nothing to review.
    expect(html).not.toContain('import-contacts');
  });

  it("embeds the article's current image when its src only resolves inside the docs", async () => {
    const root = project();
    fs.mkdirSync(path.join(root, 'docs/old'));
    fs.writeFileSync(path.join(root, 'docs/old/add.gif'), 'GIF89a-old');
    await run(root, 'review', '--out', path.join(root, 'review.html'));
    const html = fs.readFileSync(path.join(root, 'review.html'), 'utf8');
    expect(html).toContain(`data:image/gif;base64,${Buffer.from('GIF89a-old').toString('base64')}`);
  });

  it('never embeds a file that is not media, or one outside the docs', async () => {
    const root = project();
    fs.writeFileSync(path.join(root, 'secret.gif'), 'GIF89a-secret');
    fs.writeFileSync(
      path.join(root, 'docs/contacts.md'),
      '# Contacts\n\n![Add](../secret.gif)\n\n![Import](../docs.json)\n',
    );
    edit(root, (config) => {
      config.slots[0].replaces = 'secret.gif';
      config.slots[1].replaces = 'docs.json';
    });
    fs.writeFileSync(path.join(root, 'reports/import.gif'), 'GIF89a-2');
    await run(root, 'review', '--out', path.join(root, 'review.html'));
    const html = fs.readFileSync(path.join(root, 'review.html'), 'utf8');
    expect(html).not.toContain(Buffer.from('GIF89a-secret').toString('base64'));
    expect(html).toContain('<p class="none">../secret.gif</p>');
    expect(html).toContain('<p class="none">../docs.json</p>');
  });

  it('links the article only by an http(s) URL', async () => {
    const root = project();
    const article = path.join(root, 'docs/contacts.md');
    fs.writeFileSync(
      article,
      `<link rel="canonical" href="javascript:alert(1)">\n${fs.readFileSync(article, 'utf8')}`,
    );
    await run(root, 'review', '--out', path.join(root, 'review.html'));
    const html = fs.readFileSync(path.join(root, 'review.html'), 'utf8');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<a href="#">');
  });

  it("never prints an article URL that would break out of the stub's comment", async () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, 'docs/team.md'),
      '<link rel="canonical" href="https://x.test/\nprocess.exit(1)//">\n# Team\n\nOpen Users.\n\n![Invite](img/invite.gif)\n',
    );
    const { out } = await run(root, 'add', 'team.md', '--image', '1');
    expect(out).not.toContain('process.exit');
    expect(out).toContain('// team.md');
  });

  it('adds a slot for the nth image and prints a scenario that quotes the article', async () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, 'docs/team.md'),
      '# Team\n\n## Invite a teammate\n\nOpen Users. Select Invite and enter their email.\n\n![Invite](img/invite.gif)\n',
    );
    const { code, out } = await run(root, 'add', 'team.md', '--image', '1');
    expect(code).toBe(0);
    const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
    expect(config.slots.at(-1)).toEqual({
      id: 'invite-a-teammate',
      article: 'team.md',
      file: 'reports/gif/invite-a-teammate.gif',
      replaces: 'invite.gif',
      scenario: 'invite a teammate',
    });
    expect(out).toContain('story.given("Open Users.");');
    expect(out).toContain('story.when("Select Invite and enter their email.");');

    const again = await run(root, 'add', 'team.md', '--image', '1', '--id', 'invite-a-teammate');
    expect(again.code).toBe(4);
    expect(again.out).toMatch(/used already/);
    expect((await run(root, 'add', 'team.md', '--image', '2')).out).toMatch(/has 1 image/);
  });

  it('gives a second image under the same heading its own scenario and GIF', async () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, 'docs/two.md'),
      '# Two\n\n## Import\n\nOpen Import.\n\n![A](a.gif)\n\nPick the file.\n\n![B](b.gif)\n',
    );
    expect((await run(root, 'add', 'two.md', '--image', '1')).code).toBe(0);
    expect((await run(root, 'add', 'two.md', '--image', '2')).code).toBe(0);
    const slots = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8')).slots.slice(-2);
    expect(slots.map((s: Json) => [s.id, s.scenario, s.file])).toEqual([
      ['import', 'import', 'reports/gif/import.gif'],
      ['import-2', 'import 2', 'reports/gif/import-2.gif'],
    ]);
    // Both publish: their scenario titles are distinct in the run.
    edit(root, (_, report) => {
      report.features[0].scenarios.push({ title: 'import', status: 'passed' }, { title: 'import 2', status: 'passed' });
    });
    expect((await run(root, 'status')).code).toBe(0);

    const taken = await run(root, 'add', 'two.md', '--image', '2', '--scenario', 'import');
    expect(taken.code).toBe(4);
    expect(taken.out).toMatch(/scenario "import" is used by another slot/);
  });

  it('gives a one-sentence section an outcome step, since a GIF needs two frames', async () => {
    const root = project();
    fs.writeFileSync(path.join(root, 'docs/one.md'), '# One\n\n## Save\n\nSelect Save.\n\n![Save](save.gif)\n');
    const { out } = await run(root, 'add', 'one.md', '--image', '1');
    expect(out.match(/story\.screenshot/g)).toHaveLength(2);
    expect(out).toContain('story.given("Select Save.");');
    expect(out).toContain('story.then("TODO: what the viewer sees once it is done");');
  });

  it('adds a slot from a local export, naming the article as the help centre does', async () => {
    const root = project();
    fs.mkdirSync(path.join(root, 'export'));
    fs.writeFileSync(
      path.join(root, 'export/42.html'),
      '<h1>Team</h1><h2>Invite</h2><p>Open Users.</p><img src="https://cdn/a/invite.gif">',
    );
    edit(root, (config) => (config.target = { type: 'helpscout' }));
    const { code } = await run(root, 'add', '42', '--image', '1', '--from', 'export');
    expect(code).toBe(0);
    const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
    expect(config.slots.at(-1)).toMatchObject({ article: '42', replaces: 'invite.gif', scenario: 'invite' });
  });
});

describe('docs for an agent', () => {
  it('adds a slot from the article\'s public link and prints it all as JSON', async () => {
    const root = project();
    fs.mkdirSync(path.join(root, 'export'));
    fs.writeFileSync(
      path.join(root, 'export/42.html'),
      '<h1>Team</h1>\n<!-- https://help.example/article/7-team -->\n<h2>Invite</h2><p>Open Users.</p><img src="https://cdn/invite.gif">',
    );
    edit(root, (config) => (config.target = { type: 'helpscout' }));
    const { code, out } = await run(
      root, 'add', 'https://help.example/article/7-team/?utm=x', '--image', '1', '--from', 'export', '--json',
    );
    expect(code).toBe(0);
    const added = JSON.parse(out);
    expect(added.slot).toMatchObject({ id: 'invite', article: '42', replaces: 'invite.gif', scenario: 'invite' });
    expect(added.article).toMatchObject({ title: 'Team', url: 'https://help.example/article/7-team', heading: 'Invite', image: 1 });
    expect(added.steps).toEqual(['Open Users.', 'TODO: what the viewer sees once it is done']);
    expect(added.scenario).toContain('story.given("Open Users.");');

    const missing = await run(root, 'add', 'https://help.example/article/8-other', '--image', '1', '--from', 'export');
    expect(missing.code).toBe(4);
    expect(missing.out).toMatch(/not an article in this help centre/);
  });

  it('reads Help Scout .json exports from a folder beside the project', async () => {
    const root = project();
    const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
    fs.writeFileSync(
      path.join(exportDir, '60ae0add.json'),
      JSON.stringify({
        id: '60ae0add',
        name: 'How to Create Payees',
        publicUrl: 'https://help.example/article/16-how-to-create-payees',
        viewCount: 8635,
        text: '<h2>Add a payee</h2><p>Open Payees. Select New payee.</p><img src="https://cdn/file-abc.gif">',
      }),
    );
    fs.writeFileSync(path.join(exportDir, '_meta.json'), '{"collections": []}');
    edit(root, (config) => (config.target = { type: 'helpscout' }));

    const listed = JSON.parse((await run(root, 'list', '--from', exportDir, '--json')).out);
    expect(listed).toMatchObject([{ article: '60ae0add.json', title: 'How to Create Payees', views: 8635, images: ['https://cdn/file-abc.gif'] }]);

    const { code, out } = await run(
      root, 'add', 'https://help.example/article/16-how-to-create-payees', '--image', '1', '--from', exportDir, '--json',
    );
    expect(code).toBe(0);
    expect(JSON.parse(out).slot).toMatchObject({ article: '60ae0add', replaces: 'file-abc.gif', scenario: 'add a payee' });

    expect((await run(root, 'list', '--from', path.join(exportDir, 'nope'))).out).toMatch(/no such folder/);
  });

  it('names an article in a nested export by its id alone for a remote target', async () => {
    const root = project();
    fs.mkdirSync(path.join(root, 'export/collection'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'export/collection/42.html'),
      '<h1>Team</h1>\n<!-- https://help.example/article/7-team -->\n<h2>Invite</h2><p>Open Users.</p><img src="https://cdn/invite.gif">',
    );
    edit(root, (config) => (config.target = { type: 'helpscout' }));
    const { code, out } = await run(
      root, 'add', 'https://help.example/article/7-team', '--image', '1', '--from', 'export', '--json',
    );
    expect(code).toBe(0);
    expect(JSON.parse(out).slot.article).toBe('42');
  });

  it('refuses to publish into a .json export', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
    fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ text: '<img src="x.gif">' }));
    const slot = { id: 's', article: 'a.json', file: 'x.gif', replaces: 'x.gif' };
    await expect(markdownTarget(dir).publish(slot, Buffer.from('GIF89a'))).rejects.toThrow(/export to read/);
  });

  it('looks up a Help Scout article by the number in its link, and a Confluence page on its own site only', async () => {
    const hs = fakeFetch({ 'GET /v1/articles/16': { article: { id: '60ae0add' } } });
    const helpScout = helpScoutTarget('key', hs.fn);
    expect(await helpScout.resolve!('https://help.acme.com/article/16-how-to-create-payees')).toBe('60ae0add');
    expect(await helpScout.resolve!('https://help.acme.com/collection/3-guides')).toBeUndefined();

    const confluence = confluenceTarget('https://acme.atlassian.net/wiki', { email: 'e', token: 't' }, fakeFetch({}).fn);
    expect(await confluence.resolve!('https://acme.atlassian.net/wiki/spaces/ENG/pages/123/Setup')).toBe('123');
    expect(await confluence.resolve!('https://other.atlassian.net/wiki/spaces/ENG/pages/123/Setup')).toBeUndefined();
  });

  it('answers approve, publish and review in JSON', async () => {
    const root = project();
    edit(root, (config) => (config.approval = true));
    const approved = JSON.parse((await run(root, 'approve', 'add-contact', '--by', 'Sam', '--json')).out);
    expect(approved).toMatchObject({ approved: [{ id: 'add-contact', by: 'Sam' }], refused: [] });
    expect(approved.approved[0].sha256).toMatch(/^[0-9a-f]{64}$/);

    const review = JSON.parse((await run(root, 'review', '--out', path.join(root, 'r.html'), '--json')).out);
    expect(review).toEqual({ out: path.join(root, 'r.html'), slots: [{ id: 'add-contact', status: 'changed' }] });

    const published = JSON.parse((await run(root, 'publish', '--json')).out);
    expect(published).toEqual({
      published: [{ id: 'add-contact', src: 'media/add-contact.gif', sha256: approved.approved[0].sha256 }],
      skipped: [{ id: 'import-contacts', status: 'no media' }],
      failed: [],
    });
  });
});
