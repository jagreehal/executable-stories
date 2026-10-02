// Copies the docs-site pages into docs/ as plain markdown, so an agent can read
// them from node_modules/executable-stories-formatters/docs without a network.
// Runs on prepack. MDX components outside code fences are flattened to markdown
// or dropped; code fences pass through untouched.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG, '../../apps/docs-site/src/content/docs');
const OUT = join(PKG, 'docs');

const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];

export function flatten(mdx) {
  // A fence closes on a line of the same backtick run, so ```` can hold ```.
  const fence = /^[ \t]*(`{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm;
  let out = '';
  let last = 0;
  for (const m of mdx.matchAll(fence)) {
    out += flattenProse(mdx.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + flattenProse(mdx.slice(last));
}

function flattenProse(text) {
  return text
    .replace(/^import .+ from .+;?[ \t]*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^<(script|style)\b[\s\S]*?(^\/>|<\/\1>)[ \t]*$/gm, '')
    .replace(/<LinkCard\b[^<]*?\/>/g, (tag) => `- [${attr(tag, 'title')}](${attr(tag, 'href')})`)
    .replace(/^[ \t]*<TabItem\b[^>]*>/gm, (tag) => `**${attr(tag, 'label')}**\n`)
    .replace(/^[ \t]*<Aside\b[^>]*>/gm, (tag) => (attr(tag, 'title') ? `> **${attr(tag, 'title')}**` : ''))
    .replace(/^[ \t]*<\/?(Tabs|TabItem|CardGrid|Aside|Steps)\b[^>]*>[ \t]*$/gm, '')
    .replace(/^[ \t]*<[A-Z]\w*\b[^<]*?\/>[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (/\.mdx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await rm(OUT, { recursive: true, force: true });
  const files = await walk(SRC);
  for (const file of files) {
    const target = join(OUT, relative(SRC, file).replace(/\.mdx$/, '.md'));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, flatten(await readFile(file, 'utf8')));
  }
  process.stdout.write(`copy-docs: ${files.length} pages -> docs/\n`);
}
