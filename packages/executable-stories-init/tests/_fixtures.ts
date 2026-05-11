import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export type Fixture = { dir: string; cleanup: () => Promise<void> };

export async function makeFixture(files: Record<string, string>): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), 'es-init-'));
  for (const [rel, contents] of Object.entries(files)) {
    const abs = join(dir, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, contents);
  }
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
