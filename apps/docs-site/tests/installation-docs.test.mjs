import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

const installDocPath = path.join(
  repoRoot,
  'apps/docs-site/src/content/docs/getting-started/install.mdx',
);

// Manual setup lives in one page now, one <TabItem> per adapter.
const packageToTabLabel = {
  'executable-stories-vitest': 'Vitest',
  'executable-stories-jest': 'Jest',
  'executable-stories-playwright': 'Playwright',
  'executable-stories-cypress': 'Cypress',
};

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function tabContent(doc, label) {
  const start = doc.indexOf(`<TabItem label="${label}"`);
  if (start === -1) return null;
  const end = doc.indexOf('</TabItem>', start);
  return doc.slice(start, end === -1 ? undefined : end);
}

test('every JS adapter has a manual setup tab on the install page', async () => {
  const installDoc = await readFile(installDocPath, 'utf8');

  for (const label of Object.values(packageToTabLabel)) {
    assert.notEqual(
      tabContent(installDoc, label),
      null,
      `Expected a "${label}" tab in the manual setup section of install.mdx`,
    );
  }
});

test('JS adapter setup tabs include executable-stories-formatters when the package requires it', async () => {
  const installDoc = await readFile(installDocPath, 'utf8');

  for (const [pkgName, label] of Object.entries(packageToTabLabel)) {
    const pkg = await readJson(`packages/${pkgName}/package.json`);
    const requiresFormatters = Object.hasOwn(
      pkg.peerDependencies ?? {},
      'executable-stories-formatters',
    );

    if (!requiresFormatters) continue;

    assert.match(
      tabContent(installDoc, label),
      /executable-stories-formatters/,
      `The ${label} setup tab should mention executable-stories-formatters because it is a peer dependency of ${pkgName}`,
    );
  }
});
