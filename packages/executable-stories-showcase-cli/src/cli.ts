#!/usr/bin/env node
import type { Page } from '@playwright/test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { type Catalog, createCatalog, scenarioJsonSchema, type ScenarioRule } from 'executable-stories-showcase';
import { z } from 'zod';
import { checkServer, contextOptions, launchChromium, scenarioLink } from './browser.js';
import { CliError } from './errors.js';
import type { ChangedFile } from './map.js';

const HELP = `Usage: executable-stories-showcase <command> <scenarios-dir> [options]

  init       Create <dir> (default src/scenarios) with default.json, a sibling scenario.schema.json,
             print the wiring snippet, install the agent skills into .agents/skills and .claude/skills,
             and register the MCP server in .mcp.json. --no-skills skips the last two; --base-url sets the
             URL the MCP server opens (default http://localhost:5173, or :3000 for Next.js)
  guide      Print the agent skill for this version: guide [topic]. guide alone lists the topics
  doctor     Check the wiring one step at a time and print the fix for each problem: scenarios, dev server,
             MSW worker, session start, ready selector, save route, ffmpeg, skills and MCP. --base-url (required)
  mcp        Serve an MCP server on stdio for coding agents: list, open and drive scenarios, check ready
             selectors, and save what the app shows as a scenario. --base-url (required)
  validate   Check every scenario parses, resolves and passes --rules
  list       Print scenarios with links (--base-url) for people and agents; --json for machines
  shoot      Open each scenario in Chromium, wait for its ready selector, screenshot it,
             and report requests it didn't mock. --base-url (required), --out, --only a,b, --no-strict,
             --element <selector> to capture one element instead of the full page.
             Each failed scenario gets <out>/<name>.md: what failed and how to fix it.
             --compare <dir> diffs each shot against an earlier run's PNGs and writes
             <out>/<name>.diff.png (before | after | changed) for each state that changed
  affected   List the scenarios a branch's changes can affect, and why: changed scenario files,
             map rows whose Source covers a changed file, endpoints and routes the changes touch.
             --base <ref> (default main), --src dir[,dir] to consider only the app's files,
             --map <file|dir>[,…], --json
  coverage   Count the scenario map's states by status (covered, missing, can't mock), and report rows
             naming scenarios that don't exist and scenarios no row names. --map, --json.
             Exits 1 when the map names a missing scenario
  publish    publish <file…> --folder <name>: commit files to the scenario-shots branch (--branch) without
             touching your checkout, push it (--remote, default origin), and print Markdown image links
  record     Open each scenario that has steps, run them, and save a video with a visible cursor.
             --base-url and --steps (required): a module whose default export maps scenario names
             to async (page) => {} steps, or to { element, steps } to crop that scenario to its own element.
             --format mp4 (default), gif or webm; --out, --only, --element.
             --fps n (GIF default 12), --width px to downscale, --hold ms on the last frame (default 800).
             --cursor arrow (default), dot or a path to an .svg file; --cursor-color any CSS color (default #ff3d71).
             Writes <name>.video.json next to each video: size, length, description and clicks.
             mp4, gif, --element, --fps and --width need ffmpeg on PATH (or FFMPEG_PATH)
  suggest    Ask Claude which UI states lack scenarios and draft them into --out (default <dir>/proposed).
             --src dir[,dir] (required), --schema file, --max n, --model (default $EXECUTABLE_STORIES_SHOWCASE_MODEL or claude-opus-5-5).
             Needs ANTHROPIC_API_KEY or \`ant auth login\`; ANTHROPIC_BASE_URL points it at a compatible proxy.
             --env-file file loads those variables first.
  promote    Move <dir>/proposed/*.json into <dir> after validate. --dry-run lists moves only.

Common: --rules file   module exporting \`rules\` (ScenarioRule[])
        --json         machine-readable output (list, shoot, doctor, affected, coverage, publish)`;

declare global {
  interface Window {
    /** Set by record: reports each pointerdown for the video's manifest. */
    showcaseClick(x: number, y: number, cover?: number): void;
  }
}

const MAX_SOURCE_CHARS = 800_000;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    rules: { type: 'string' },
    'base-url': { type: 'string' },
    out: { type: 'string' },
    only: { type: 'string' },
    'no-strict': { type: 'boolean' },
    'no-panel': { type: 'boolean' },
    viewport: { type: 'string' },
    scale: { type: 'string' },
    'color-scheme': { type: 'string' },
    element: { type: 'string' },
    locale: { type: 'string' },
    timezone: { type: 'string' },
    steps: { type: 'string' },
    fps: { type: 'string' },
    width: { type: 'string' },
    hold: { type: 'string' },
    cursor: { type: 'string' },
    'cursor-color': { type: 'string' },
    format: { type: 'string' },
    json: { type: 'boolean' },
    src: { type: 'string' },
    schema: { type: 'string' },
    max: { type: 'string' },
    model: { type: 'string' },
    'env-file': { type: 'string' },
    'dry-run': { type: 'boolean' },
    'no-skills': { type: 'boolean' },
    compare: { type: 'string' },
    base: { type: 'string' },
    map: { type: 'string' },
    folder: { type: 'string' },
    branch: { type: 'string' },
    remote: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

const StepsFn = z.function({ input: [z.custom<Page>()], output: z.unknown() });

/** `--steps` module: scenario name to the steps recorded after it opens, optionally with its own crop. */
const StepsSchema = z.record(
  z.string(),
  z.union([StepsFn, z.object({ element: z.string().optional(), steps: StepsFn })])
    .transform((v) => (typeof v === 'function' ? { element: undefined, steps: v } : v)),
);

/** A whole-number flag of at least `min`, or undefined when it wasn't passed. */
function wholeNumber(flag: string, value: string | undefined, min = 1) {
  if (value === undefined) return undefined;
  const n = Number(value);

  if (!Number.isInteger(n) || n < min) {
    throw new CliError('INVALID_ARGUMENT', `--${flag} must be a whole number of at least ${min}, not "${value}"`);
  }

  return n;
}

const [command, dir = command === 'init' ? 'src/scenarios' : undefined] = positionals;

if (command === 'guide') {
  const { guide } = await import('./skills.js');

  try {
    console.log(guide(positionals[1]));
    process.exit(0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}

if (command === 'publish') {
  const { publishFiles } = await import('./publish.js');
  const files = positionals.slice(1);

  try {
    if (!files.length || !values.folder) {
      throw new CliError(
        'INVALID_ARGUMENT',
        'publish needs files and --folder, e.g. publish shots/*.png --folder pr-42',
      );
    }

    const links = publishFiles({
      files,
      folder: values.folder,
      branch: values.branch,
      remote: values.remote,
    });

    // Markdown images for a GitHub remote; elsewhere, where each file landed.
    const lines = links.map((l) => (l.url.startsWith('https://') ? `![${l.file}](${l.url})` : `${l.file}  ${l.url}`));

    console.log(values.json ? JSON.stringify(links, null, 2) : lines.join('\n'));
    process.exit(0);
  } catch (err) {
    // A failed git command carries git's own message on stderr.
    const detail = z.object({ stderr: z.string() }).safeParse(err).data?.stderr ?? '';
    console.error(
      `executable-stories-showcase publish: ${err instanceof Error ? err.message : String(err)}\n${detail}`.trim(),
    );
    process.exit(err instanceof CliError ? err.exitCode : 1);
  }
}

if (values.help || !command || !dir) {
  console.log(HELP);
  process.exit(command ? 2 : 0);
}

/** Read the scenarios folder; called again by long-running commands to see new files. */
const loadCatalog = (rules: ScenarioRule[]): Catalog => {
  try {
    return createCatalog(
      readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) =>
        JSON.parse(readFileSync(join(dir, f), 'utf8'))
      ),
      { rules },
    );
  } catch (err) {
    throw new CliError('INVALID_SCENARIO', err instanceof Error ? err.message : String(err));
  }
};

const requireBaseUrl = () => {
  const url = values['base-url'];

  if (!url) throw new CliError('INVALID_ARGUMENT', `${command} needs --base-url, e.g. http://localhost:5173`);

  return url;
};

try {
  if (command === 'init') {
    const { initScenarios } = await import('./init.js');
    const { stack } = initScenarios(dir);

    if (!values['no-skills']) {
      const { installSkills, registerMcp } = await import('./skills.js');

      const url = values['base-url']
        ?? (stack === 'next' ? 'http://localhost:3000' : 'http://localhost:5173');

      const args = ['mcp', dir, '--base-url', url];
      console.log('');

      for (const line of [...installSkills(process.cwd()), ...registerMcp(process.cwd(), args)]) {
        console.log(line);
      }

      console.log(`
Codex: codex mcp add executable-stories-showcase -- npx executable-stories-showcase ${args.join(' ')}
For agents that need a pointer, add to AGENTS.md (or CLAUDE.md):
  UI states use executable-stories-showcase; read .agents/skills/executable-stories-showcase/SKILL.md before adding or checking one.`);
    }

    process.exit(0);
  }

  const rules: ScenarioRule[] = values.rules
    ? (await import(pathToFileURL(resolve(values.rules)).href)).rules
    : [];

  if (command === 'promote') {
    const { promoteScenarios } = await import('./promote.js');
    const result = promoteScenarios(dir, { rules, dryRun: !!values['dry-run'] });
    process.exit(result.skipped.length ? 1 : 0);
  }

  if (command === 'mcp') {
    const { serveMcp } = await import('./mcp.js');

    const { version } = z.object({ version: z.string() }).parse(
      JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')),
    );

    await serveMcp({
      dir,
      baseURL: requireBaseUrl(),
      loadCatalog: () => loadCatalog(rules),
      flags: values,
      version,
    });
    process.exit(0);
  }

  if (command === 'doctor') {
    const { runDoctor } = await import('./doctor.js');
    const { EXIT_CODES, ERROR_CLASSES } = await import('./errors.js');

    const checks = await runDoctor({
      dir,
      baseURL: requireBaseUrl(),
      loadCatalog: () => loadCatalog(rules),
      flags: values,
    });

    if (values.json) console.log(JSON.stringify(checks, null, 2));
    else {
      for (const c of checks) {
        console.log(
          `${{ ok: '✓', warn: '!', fail: '✗' }[c.status]} ${c.name.padEnd(16)} ${
            c.code ? `[${c.code}] ` : ''
          }${c.detail}`,
        );

        if (c.fix && c.status !== 'ok') console.log(`  ${' '.repeat(16)} fix: ${c.fix}`);
      }
    }

    const failed = checks.filter((c) => c.status === 'fail');
    process.exit(Math.max(0, ...failed.map((c) => (c.code ? EXIT_CODES[ERROR_CLASSES[c.code]] : 1))));
  }

  const catalog = loadCatalog(rules);

  switch (command) {
    case 'validate': {
      const problems = catalog.check();

      for (const p of problems) console.error(`✗ ${p}\n`);
      console.log(`${catalog.list.length - problems.length}/${catalog.list.length} scenarios valid`);
      process.exit(problems.length ? 1 : 0);
    }

    // eslint-disable-next-line no-fallthrough -- the case above ends in process.exit
    case 'list': {
      const base = values['base-url'];

      const rows = catalog.list.map((s) => ({
        name: s.name,
        description: s.description ?? '',
        tags: s.tags ?? [],
        ready: s.ready ?? null,
        url: base
          ? `${base.replace(/\/$/, '')}${catalog.resolve(s).path ?? '/'}?scenario=${
            encodeURIComponent(s.name)
          }`
          : null,
      }));

      if (values.json) console.log(JSON.stringify(rows, null, 2));
      else {
        for (const r of rows) {
          console.log(
            `${r.name.padEnd(32)} ${r.description}${r.url ? `\n${' '.repeat(33)}${r.url}` : ''}`,
          );
        }
      }

      break;
    }

    case 'affected': {
      const { affectedScenarios, findMapFiles, readMap } = await import('./map.js');
      const { execFileSync } = await import('node:child_process');
      const base = values.base ?? 'main';
      const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

      let since: string;

      try {
        since = git(['merge-base', base, 'HEAD']);
      } catch {
        throw new CliError(
          'INVALID_ARGUMENT',
          `can't find --base "${base}"; pass a branch or commit, e.g. --base origin/main`,
        );
      }

      // Committed, uncommitted and new files, as paths from here.
      const paths = new Set(
        [
          ...git(['diff', '--name-only', '--relative', since]).split('\n'),
          ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
        ].filter(Boolean),
      );

      // --src keeps it to the app's folders, so a monorepo's other packages don't show as unmatched.
      const src = values.src?.split(',').map((d) => `${d.replace(/^\.\//, '').replace(/\/$/, '')}/`);

      const inScope = (path: string) =>
        !src || path.startsWith(`${dir.replace(/^\.\//, '')}/`) || src.some((d) => path.startsWith(d));

      const changed = [...paths].flatMap((path): ChangedFile[] => {
        if (!inScope(path)) return [];

        try {
          return [{ path, content: readFileSync(path, 'utf8') }];
        } catch {
          return [{ path }]; // deleted
        }
      });

      const rows = readMap(findMapFiles(values.map?.split(',')));
      const result = affectedScenarios({ changed, dir, catalog, rows });

      if (values.json) {
        console.log(JSON.stringify({ base, since, changed: changed.length, ...result }, null, 2));
        break;
      }

      console.log(
        `${changed.length} files changed since ${base} (${since.slice(0, 9)})${
          rows.length ? '' : '; no scenario map found'
        }\n`,
      );

      for (const s of result.scenarios) {
        console.log(s.name);

        for (const r of s.reasons) console.log(`    ${r.kind}: ${r.detail}`);
      }

      if (!result.scenarios.length) console.log('No scenario matched.');

      if (result.unmatched.length) {
        console.log('\nChanged source files no scenario points at (shared ones can change every state):');

        const deleted = new Set(changed.flatMap((f) => (f.content === undefined ? [f.path] : [])));

        for (const f of result.unmatched) console.log(`    ${f}${deleted.has(f) ? ' (deleted)' : ''}`);
      }

      if (result.scenarios.length) console.log(`\n--only ${result.scenarios.map((s) => s.name).join(',')}`);
      break;
    }

    case 'coverage': {
      const { coverage, findMapFiles, readMap } = await import('./map.js');
      const files = findMapFiles(values.map?.split(','));

      if (!files.length) {
        throw new CliError(
          'INVALID_ARGUMENT',
          'no scenario map found in .agents/skills/scenarios-*; run /create-scenario-map, or pass --map',
        );
      }

      const result = coverage(readMap(files), catalog);

      if (values.json) console.log(JSON.stringify({ maps: files, ...result }, null, 2));
      else {
        const percent = Math.round(result.ratio * 100);
        console.log(
          `${result.covered}/${
            result.covered + result.missing
          } states covered (${percent}%), ${result.cantMock} can't be mocked`,
        );

        if (result.missingStates.length) console.log('\nMissing:');

        for (const r of result.missingStates) {
          const state = [r.feature, r.state].filter(Boolean).join(' / ');
          console.log(`    ${state.padEnd(48)} ${r.scenario || '-'}  ${r.at}`);
        }

        if (result.stale.length) console.log('\nCovered rows naming a scenario that does not exist:');

        for (const r of result.stale) console.log(`    ${(r.scenario || '(none)').padEnd(48)} ${r.at}`);

        if (result.unmapped.length) {
          console.log(`\nScenarios no map row names: ${result.unmapped.join(', ')}`);
        }
      }

      process.exit(result.stale.length ? 1 : 0);
    }

    // eslint-disable-next-line no-fallthrough -- the case above ends in process.exit
    case 'shoot': {
      const baseURL = requireBaseUrl();
      const out = values.out ?? 'scenario-shots';
      const only = values.only?.split(',');

      // Shooting into the baseline overwrites each PNG before it's compared, so every state reads "same".
      const real = (path: string) => (existsSync(path) ? realpathSync(path) : resolve(path));

      if (values.compare && real(values.compare) === real(out)) {
        throw new CliError(
          'INVALID_ARGUMENT',
          `--compare and --out are the same folder (${out}); shoot into a new one, e.g. --out .shots/after`,
        );
      }

      mkdirSync(out, { recursive: true });
      await checkServer(baseURL);

      const { inspectScenario, failurePage } = await import('./inspect.js');
      const { compareImages } = await import('./compare.js');
      const before = values.compare;
      const browser = await launchChromium();
      const report = [];

      for (const s of catalog.list.filter((s) => !only || only.includes(s.name))) {
        const scenario = catalog.resolve(s);
        const context = await browser.newContext({ baseURL, ...contextOptions(scenario, values) });
        const page = await context.newPage();
        page.setDefaultTimeout(10_000);

        // Uncaught exceptions and console errors fail the run too.
        const result = await inspectScenario(page, scenario, {
          link: scenarioLink(baseURL, scenario),
          strict: !values['no-strict'],
          panel: !values['no-panel'],
        });

        const screenshot = join(out, `${s.name}.png`);
        let captured = false;

        if (values.element && !result.error) {
          try {
            await page.locator(values.element).first().screenshot({ path: screenshot });
            captured = true;
          } catch (err) {
            result.codes.push('ELEMENT_NOT_FOUND');
            result.ok = false;
            result.error = `--element: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
          }
        }

        // The full page shows what went wrong when the scenario or the element failed.
        if (!captured) await page.screenshot({ path: screenshot, fullPage: true });

        // A page per failure, written for whoever fixes it; a stale one would mislead.
        const details = join(out, `${s.name}.md`);
        rmSync(details, { force: true });

        if (!result.ok) {
          writeFileSync(details, failurePage(result, { screenshot, appOrigin: new URL(baseURL).origin }));
        }

        await context.close();

        // Clear this state's diff from an earlier run into the same folder.
        const diffImage = join(out, `${s.name}.diff.png`);
        rmSync(diffImage, { force: true });
        const previous = before && join(before, `${s.name}.png`);
        let compare: { status: 'same' | 'changed' | 'new'; ratio: number; image: string | null; } | undefined;

        if (previous && existsSync(previous)) {
          const { changed, total, image } = await compareImages(
            browser,
            readFileSync(previous),
            readFileSync(screenshot),
          );

          if (image) writeFileSync(diffImage, image);
          compare = {
            status: changed ? 'changed' : 'same',
            ratio: changed / total,
            image: image ? diffImage : null,
          };
        } else if (previous) {
          compare = { status: 'new', ratio: 1, image: null };
        }

        report.push({ ...result, screenshot, details: result.ok ? null : details, compare });
      }

      await browser.close();

      // States the earlier run shot that no longer exist (with --only, only the ones asked for).
      const removed = before && existsSync(before)
        ? readdirSync(before)
          .filter((f) => f.endsWith('.png') && !f.endsWith('.diff.png'))
          .map((f) => f.slice(0, -'.png'.length))
          .filter((n) => !catalog.get(n) && (!only || only.includes(n)))
        : [];

      if (values.json) console.log(JSON.stringify(before ? { scenarios: report, removed } : report, null, 2));
      else {
        for (const r of report) {
          const change = r.compare && r.compare.status !== 'same'
            ? `  ${r.compare.status}${
              r.compare.image ? ` ${r.compare.image} (${(r.compare.ratio * 100).toFixed(1)}% of pixels)` : ''
            }`
            : '';

          console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(32)} ${r.screenshot}${change}`);

          if (r.ok) continue;
          console.log(`    ${r.codes.join(', ')}${r.error ? `: ${r.error}` : ''}`);

          for (const u of r.unhandled) console.log(`    unmocked: ${u}`);

          for (const e of r.pageErrors) console.log(`    uncaught: ${e}`);

          for (const e of r.consoleErrors) console.log(`    console.error: ${e}`);
          console.log(`    ❯ details ${r.details}`);
        }

        for (const n of removed) console.log(`- ${n.padEnd(32)} removed since ${before}`);

        if (before) {
          const changed = report.filter((r) => r.compare && r.compare.status !== 'same').length;
          console.log(`\n${changed} of ${report.length} states changed or new since ${before}`);
        }
      }

      process.exit(report.every((r) => r.ok) ? 0 : 1);
    }

    // eslint-disable-next-line no-fallthrough -- the case above ends in process.exit
    case 'record': {
      const baseURL = requireBaseUrl();

      if (!values.steps) {
        throw new CliError('INVALID_ARGUMENT', 'record needs --steps, e.g. --steps scenarios/steps.ts');
      }

      const format = values.format ?? 'mp4';

      if (format !== 'mp4' && format !== 'gif' && format !== 'webm') {
        throw new CliError('INVALID_ARGUMENT', `--format must be mp4, gif or webm, not "${format}"`);
      }

      const fps = wholeNumber('fps', values.fps);
      const width = wholeNumber('width', values.width);
      const hold = wholeNumber('hold', values.hold, 0) ?? 800;
      const readCursor = (file: string) => {
        try {
          return readFileSync(file, 'utf8');
        } catch {
          throw new CliError('INVALID_ARGUMENT', `--cursor must be arrow, dot or a readable .svg file, not "${file}"`);
        }
      };
      const cursor = {
        pointer: !values.cursor || values.cursor === 'arrow' || values.cursor === 'dot'
          ? values.cursor
          : readCursor(values.cursor),
        color: values['cursor-color'],
      };

      if (values.scale) console.log('  --scale applies to screenshots; video records at --viewport size.');

      const steps = StepsSchema.parse((await import(pathToFileURL(resolve(values.steps)).href)).default);
      const only = values.only?.split(',');
      const names = Object.keys(steps).filter((n) => !only || only.includes(n));

      for (const n of names) {
        if (!catalog.get(n)) throw new CliError('UNKNOWN_SCENARIO', `--steps names unknown scenario "${n}"`);
      }

      const out = values.out ?? 'scenario-videos';
      mkdirSync(out, { recursive: true });
      const raw = mkdtempSync(join(tmpdir(), 'executable-stories-showcase-'));

      await checkServer(baseURL);
      const { openScenario, showCursor } = await import('executable-stories-showcase/playwright');
      const { encodeVideo, pagePoint, videoManifest, visibleCrop } = await import('./record.js');
      // slowMo spaces out steps so viewers can follow them; glide lets the cursor arrive first.
      const browser = await launchChromium({ slowMo: 150 });
      let exitCode = 0;

      /**
       * Where the element sits in the video once the scenario is ready. Scrolled into view first:
       * video holds only the viewport. Measured before the steps run, so steps that scroll the page
       * move the element out of the crop.
       */
      const cropTo = async (page: Page, selector: string, viewport: { width: number; height: number; }) => {
        const element = page.locator(selector).first();

        const box = await element.scrollIntoViewIfNeeded({ timeout: 5000 }).then(
          () => element.boundingBox(),
          () => null,
        );

        const visible = box && visibleCrop(box, viewport);

        if (!visible) throw new CliError('ELEMENT_NOT_FOUND', `element "${selector}" isn't visible`);

        if (visible.clipped) {
          console.log(
            `  element "${selector}" (${Math.round(box.width)}x${
              Math.round(box.height)
            }) is larger than the viewport; `
              + `the video shows the visible part. Use a larger --viewport to fit it.`,
          );
        }

        return visible.crop;
      };

      for (const [name, { element, steps: run }] of Object.entries(steps).filter(([n]) => names.includes(n))) {
        const resolved = catalog.resolve(catalog.get(name) ?? { name });
        const options = contextOptions(resolved, values);

        const context = await browser.newContext({
          baseURL,
          ...options,
          recordVideo: { dir: raw, size: options.viewport },
        });

        const page = await context.newPage();
        const began = Date.now();
        const file = join(out, `${name}.${format}`);

        const clicks: Promise<{ at: number; x: number; y: number; cover?: number; } | undefined>[] = [];

        try {
          await showCursor(page, { ...cursor, glide: true });
          // The listener runs in every frame; a click in an iframe maps through the iframe's place and scale.
          await page.exposeBinding('showcaseClick', ({ frame }, x: number, y: number, cover?: number) => {
            const at = Date.now();

            clicks.push(pagePoint(frame, x, y).then((point) => ({ at, ...point, ...(cover !== undefined && { cover }) }), () => undefined));
          });
          await page.addInitScript(() => {
            addEventListener('pointerdown', (e) => {
              // Share of the page the clicked element covers, so a video skips zooming to a big one. Not inside an iframe.
              const r = e.target instanceof Element && top === self ? e.target.getBoundingClientRect() : undefined;
              const cover = r ? Math.min(1, (r.width * r.height) / (innerWidth * innerHeight)) : undefined;

              window.showcaseClick(e.clientX, e.clientY, cover);
            }, true);
          });
          await openScenario(page, name, { path: resolved.path, strict: !values['no-strict'], panel: false });
          const selector = element ?? values.element;
          const crop = selector ? await cropTo(page, selector, options.viewport) : undefined;

          const start = (Date.now() - began) / 1000;
          await Promise.resolve(run(page)).catch((err: Error) => {
            throw new CliError('STEPS_FAILED', `steps failed: ${err.message.split('\n')[0]}`);
          });
          await page.waitForTimeout(hold); // hold the final frame
          const end = Date.now();
          await context.close();

          const video = page.video();

          if (!video) throw new Error('Playwright recorded no video');
          const trimmed = encodeVideo({ input: await video.path(), output: file, format, start, crop, fps, width });

          const manifest = videoManifest({
            name,
            description: resolved.description,
            video: `${name}.${format}`,
            viewport: options.viewport,
            crop,
            width,
            start: began + trimmed.start * 1000,
            end,
            clicks: (await Promise.all(clicks)).filter((c) => c !== undefined),
          });

          writeFileSync(join(out, `${name}.video.json`), `${JSON.stringify(manifest, null, 2)}\n`);

          console.log(`✓ ${name.padEnd(32)} ${file}`);
        } catch (err) {
          exitCode = Math.max(exitCode, err instanceof CliError ? err.exitCode : 1);
          await context.close();
          const code = err instanceof CliError ? `[${err.code}] ` : '';
          console.log(
            `✗ ${name.padEnd(32)} ${code}${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
          );
        }
      }

      await browser.close();
      rmSync(raw, { recursive: true, force: true });
      process.exit(exitCode);
    }

    // eslint-disable-next-line no-fallthrough -- the case above ends in process.exit
    case 'suggest': {
      if (!values.src) {
        throw new CliError('INVALID_ARGUMENT', 'suggest needs --src, e.g. --src src/pages,src/components');
      }

      const sources = values.src.split(',').flatMap((d) => walk(d));
      const size = sources.reduce((n, f) => n + f.content.length, 0);

      if (size > MAX_SOURCE_CHARS) {
        throw new Error(
          `--src is ${size.toLocaleString()} characters; narrow it to the screens you want covered`,
        );
      }

      const jsonSchema = values.schema
        ? JSON.parse(readFileSync(values.schema, 'utf8'))
        : scenarioJsonSchema();

      if (values['env-file']) process.loadEnvFile(values['env-file']);
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const model = values.model ?? process.env.EXECUTABLE_STORIES_SHOWCASE_MODEL ?? undefined;
      const { suggestScenarios } = await import('./suggest.js');
      console.error(
        `Reading ${sources.length} files (${size.toLocaleString()} chars) and ${catalog.list.length} scenarios with ${
          model ?? 'claude-opus-5-5'
        }…`,
      );

      const result = await suggestScenarios(
        { sources, catalog, jsonSchema, max: Number(values.max ?? 8), model },
        {
          client: new Anthropic({
            baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
          }),
        },
      );

      console.log('\nCandidate UI states (not exhaustive)\n');

      for (const s of result.states) {
        const mark = s.covered_by ? '✓' : '✗';
        console.log(
          `${mark} ${`${s.area} / ${s.state}`.padEnd(56)} ${s.covered_by ?? `uncovered (${s.priority})`}`,
        );
      }

      const covered = result.states.filter((s) => s.covered_by).length;
      console.log(
        `\n${result.states.length} states detected, ${covered} have scenarios, ${
          result.states.length - covered
        } uncovered`,
      );

      const out = values.out ?? join(dir, 'proposed');

      if (result.accepted.length) mkdirSync(out, { recursive: true });

      for (const { scenario, covers } of result.accepted) {
        const file = join(out, `${scenario.name}.json`);
        const $schema = values.schema ? relative(out, values.schema) : undefined;
        writeFileSync(file, `${JSON.stringify({ $schema, ...scenario }, null, 2)}\n`);
        console.log(`+ ${file}  (${covers})`);
      }

      for (const r of result.rejected) console.log(`- rejected proposal for ${r.covers}: ${r.error}`);

      if (result.accepted.length) {
        console.log(
          `\nReview the drafts, then: executable-stories-showcase promote ${dir}`,
        );
      }

      break;
    }

    default:
      console.error(`Unknown command "${command}"\n\n${HELP}`);
      process.exit(2);
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  const hint = /authentication/i.test(message) ? '\nSet ANTHROPIC_API_KEY, or run `ant auth login`.' : '';
  const code = err instanceof CliError ? `[${err.code}] ` : '';
  console.error(`executable-stories-showcase ${command}: ${code}${message}${hint}`);
  process.exit(err instanceof CliError ? err.exitCode : 1);
}

function walk(path: string): { path: string; content: string; }[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path)
      .filter((f) => !['node_modules', 'dist', 'scenarios'].includes(f))
      .flatMap((f) => walk(join(path, f)));
  }

  const isSource = /\.(tsx?|jsx?|vue|svelte)$/.test(path) && !/\.(d|test|spec)\.\w+$/.test(path);

  return isSource ? [{ path, content: readFileSync(path, 'utf8') }] : [];
}
