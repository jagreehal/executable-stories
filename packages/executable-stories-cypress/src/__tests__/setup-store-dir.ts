// Plugin and reporter share one process here, and test files run in parallel:
// give each worker its own store directory.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

process.env.EXECUTABLE_STORIES_CYPRESS_STORE = fs.mkdtempSync(path.join(os.tmpdir(), "es-cypress-store-"));
