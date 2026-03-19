import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

const packageToInstallDoc = {
  'executable-stories-vitest': path.join(
    repoRoot,
    'apps/docs-site/src/content/docs/getting-started/installation-vitest.md',
  ),
  'executable-stories-jest': path.join(
    repoRoot,
    'apps/docs-site/src/content/docs/getting-started/installation-jest.md',
  ),
  'executable-stories-playwright': path.join(
    repoRoot,
    'apps/docs-site/src/content/docs/getting-started/installation-playwright.md',
  ),
  'executable-stories-cypress': path.join(
    repoRoot,
    'apps/docs-site/src/content/docs/getting-started/installation-cypress.md',
  ),
};

const homepageLabels = {
  'executable-stories-vitest': 'Vitest',
  'executable-stories-jest': 'Jest',
  'executable-stories-playwright': 'Playwright',
  'executable-stories-cypress': 'Cypress',
};

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

test('JS adapter installation docs include executable-stories-formatters when the package requires it', async () => {
  for (const [pkgName, installDocPath] of Object.entries(packageToInstallDoc)) {
    const pkg = await readJson(`packages/${pkgName}/package.json`);
    const installDoc = await readFile(installDocPath, 'utf8');
    const requiresFormatters = Object.hasOwn(pkg.peerDependencies ?? {}, 'executable-stories-formatters');

    if (!requiresFormatters) continue;

    assert.match(
      installDoc,
      /executable-stories-formatters/,
      `${pkgName} install docs should mention executable-stories-formatters because it is a peer dependency`,
    );
  }
});

test('homepage install snippets stay aligned with JS adapter peer dependencies', async () => {
  const homeDoc = await readFile(
    path.join(repoRoot, 'apps/docs-site/src/content/docs/index.mdx'),
    'utf8',
  );

  for (const pkgName of Object.keys(packageToInstallDoc)) {
    const pkg = await readJson(`packages/${pkgName}/package.json`);
    const requiresFormatters = Object.hasOwn(pkg.peerDependencies ?? {}, 'executable-stories-formatters');

    if (!requiresFormatters) continue;

    const heading = `**${homepageLabels[pkgName]}:**`;
    const start = homeDoc.indexOf(heading);

    assert.notEqual(start, -1, `Expected a homepage install snippet for ${pkgName}`);

    const snippet = homeDoc.slice(start, start + 160);
    assert.match(
      snippet,
      /executable-stories-formatters/,
      `${pkgName} homepage install snippet should mention executable-stories-formatters because it is a peer dependency`,
    );
  }
});
