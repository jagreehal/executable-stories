import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { scenarioJsonSchema } from 'executable-stories-showcase';

/** Create a scenarios dir, schema, default stub, and print a wiring snippet. */
export function initScenarios(scenariosDir: string, cwd = process.cwd()) {
  const dir = resolve(cwd, scenariosDir);
  mkdirSync(dir, { recursive: true });

  const schemaPath = join(dirname(dir), 'scenario.schema.json');
  const defaultPath = join(dir, 'default.json');
  const schemaRel = relative(dir, schemaPath).replaceAll('\\', '/');

  const schemaExisted = existsSync(schemaPath);
  const defaultExisted = existsSync(defaultPath);

  if (!schemaExisted) {
    writeFileSync(schemaPath, `${JSON.stringify(scenarioJsonSchema(), null, 2)}\n`);
  }

  if (!defaultExisted) {
    writeFileSync(
      defaultPath,
      `${
        JSON.stringify(
          {
            $schema: schemaRel,
            name: 'default',
            description: 'Happy path: record the real network, then Save as scenario from the panel',
          },
          null,
          2,
        )
      }\n`,
    );
  }

  const stack = detectStack(cwd);
  const scenariosImport = relative(cwd, dir).replaceAll('\\', '/');

  console.log(`${defaultExisted ? 'Kept existing' : 'Created'} ${relative(cwd, defaultPath)}`);
  console.log(`${schemaExisted ? 'Kept existing' : 'Created'} ${relative(cwd, schemaPath)}`);
  console.log('');
  console.log('Wire the runtime (DEV only), then open the app with ?scenario-record,');
  console.log('click through the flow, Mark ready, and Download JSON into this folder.');
  console.log('');
  console.log(wiringSnippet(stack, scenariosImport));

  return { stack };
}

type Stack = 'vite' | 'next' | 'unknown';

function detectStack(cwd: string): Stack {
  if (hasFile(cwd, ['next.config.ts', 'next.config.js', 'next.config.mjs', 'next.config.cjs'])) {
    return 'next';
  }

  if (hasFile(cwd, ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs'])) {
    return 'vite';
  }

  return 'unknown';
}

function hasFile(cwd: string, names: string[]): boolean {
  return names.some((name) => existsSync(join(cwd, name)));
}

function wiringSnippet(stack: Stack, scenariosImport: string): string {
  // Root-relative: Vite resolves '/…' globs from the project root, wherever the snippet is pasted.
  const glob = `import.meta.glob<ScenarioInput>('${
    scenariosImport ? `/${scenariosImport}` : ''
  }/*.json', { eager: true, import: 'default' })`;

  if (stack === 'next') {
    return `// Next.js (App Router): wrap children in a client <Scenarios> gate (see README).
// List scenario JSON imports explicitly (Next has no import.meta.glob).
// Serve the MSW worker with: npx msw init public
//
// mountPanel(session, { schemaPath: '../scenario.schema.json' });
//
// Let the panel save into ${scenariosImport || '.'}: create app/%5F%5Fexecutable-stories-showcase/save/route.ts with
//   import { createSaveRoute } from 'executable-stories-showcase/next';
//   export const { GET } = createSaveRoute({ dir: '${scenariosImport || '.'}' });`;
  }

  const plugins = `import { msw } from 'msw/vite';
//   import { executableStoriesShowcase } from 'executable-stories-showcase/vite';
//   plugins: [msw({ mode: 'worker-only' }), executableStoriesShowcase({ dir: '${scenariosImport || '.'}' })]
// executableStoriesShowcase lets the panel save scenarios straight into this folder.`;

  const viteNote = stack === 'vite'
    ? `// In vite.config.ts:\n//   ${plugins}`
    : `// Vite, in vite.config.ts:\n//   ${plugins}
// Next: see README "Next.js (App Router)"`;

  return `${viteNote}

import { type ScenarioInput, startScenarios } from 'executable-stories-showcase';
import { mountPanel } from 'executable-stories-showcase/panel';
// import { tanstackQuery } from 'executable-stories-showcase/tanstack-query'; // if you use it

if (import.meta.env.DEV) {
  const session = await startScenarios({
    scenarios: Object.values(${glob}),
    // adapters: [tanstackQuery(queryClient)],
    // refresh: () => queryClient.resetQueries(),
  });
  mountPanel(session, { schemaPath: '../scenario.schema.json' });
}

// Then: open /?scenario-record → use the app → panel → Mark ready → Download JSON`;
}
