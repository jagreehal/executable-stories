// Starts the showcase demo app, records the scenarios in recordings/steps.ts, then stops it.
import { spawn, spawnSync } from 'node:child_process';

const port = 5399;
const app = '../showcase/examples/demo-react';
const server = spawn(
  'pnpm',
  ['exec', 'vite', '--port', String(port), '--strictPort'],
  {
    cwd: app,
    stdio: 'ignore',
    detached: true,
  },
);

try {
  for (let i = 0; ; i++) {
    if (
      await fetch(`http://localhost:${port}`).then(
        (r) => r.ok,
        () => false,
      )
    )
      break;
    if (i === 60) throw new Error('demo app did not start');
    await new Promise((r) => setTimeout(r, 500));
  }

  const { status } = spawnSync(
    'pnpm',
    [
      'exec',
      'executable-stories-showcase',
      'record',
      `${app}/scenarios`,
      '--base-url',
      `http://localhost:${port}`,
      '--steps',
      'recordings/steps.ts',
      '--format',
      'mp4',
      '--viewport',
      '1280x720',
      '--hold',
      '1500',
      '--out',
      'public/recordings',
    ],
    { stdio: 'inherit' },
  );
  process.exitCode = status ?? 1;
} finally {
  process.kill(-server.pid);
}
