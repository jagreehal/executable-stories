#!/usr/bin/env node
// Rewrites `library_version:` in every SKILL.md to the version its package
// actually publishes. Runs as part of `version-packages` so a release PR
// carries the frontmatter bump; skill-sync.story.test.ts is the guard.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(ROOT, 'skills');
const PACKAGES_DIR = join(ROOT, 'packages');

// Go is absent on purpose: a Go module's version is a git tag, not a file.
const VERSION_SOURCES = [
  ['package.json', /"version"\s*:\s*"([^"]+)"/],
  ['pyproject.toml', /^version\s*=\s*"([^"]+)"/m],
  ['Cargo.toml', /^version\s*=\s*"([^"]+)"/m],
  ['executable_stories.gemspec', /spec\.version\s*=\s*"([^"]+)"/],
  ['build.gradle.kts', /^version\s*=\s*"([^"]+)"/m],
];

async function publishedVersion(library) {
  // .NET skills name the NuGet id, not the directory holding it.
  const dir = library.startsWith('ExecutableStories.')
    ? join(
        PACKAGES_DIR,
        `executable-stories-${library.split('.')[1].toLowerCase()}`,
      )
    : join(PACKAGES_DIR, library);
  for (const [file, pattern] of VERSION_SOURCES) {
    const manifest = join(dir, file);
    if (existsSync(manifest)) {
      const match = pattern.exec(await readFile(manifest, 'utf8'));
      if (match?.[1]) return match[1];
    }
  }
  const csproj = join(dir, library, `${library}.csproj`);
  if (existsSync(csproj)) {
    return /<Version>([^<]+)<\/Version>/.exec(
      await readFile(csproj, 'utf8'),
    )?.[1];
  }
}

for (const entry of await readdir(SKILLS_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const path = join(SKILLS_DIR, entry.name, 'SKILL.md');
  if (!existsSync(path)) continue;
  const md = await readFile(path, 'utf8');
  const library = /^ {2}library: (.+)$/m.exec(md)?.[1]?.trim();
  const declared = /^ {2}library_version: ['"]?([^'"\n]+)['"]?$/m
    .exec(md)?.[1]
    ?.trim();
  if (!library || !declared) continue;
  const actual = await publishedVersion(library);
  if (!actual || actual === declared) continue;
  await writeFile(
    path,
    md.replace(/^ {2}library_version: .*$/m, `  library_version: "${actual}"`),
  );
  console.log(`${entry.name}: ${declared} -> ${actual}`);
}
