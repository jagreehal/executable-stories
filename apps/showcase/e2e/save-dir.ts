import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Where the demo's "Save to project" writes during e2e, outside the scenarios glob. */
export const E2E_SAVE_DIR = join(tmpdir(), 'executable-stories-showcase-e2e-saves');
