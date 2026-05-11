import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const USE_CLIENT_BANNER = { js: '"use client";' };

export default defineConfig([
  {
    // Server-safe: parseStoryReport, Result types, schema constants.
    entry: { parse: "src/parse-entry.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
  },
  {
    // Client: main UI components (use createContext, hooks).
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
    banner: USE_CLIENT_BANNER,
    onSuccess: async () => {
      copyFileSync(resolve("src/styles.css"), resolve("dist/styles.css"));
    },
  },
  {
    // Client: chrome (search, keyboard, failure banner, deep link, help).
    entry: { interactive: "src/interactive/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    external: ["react", "react-dom", "react/jsx-runtime", "executable-stories-react"],
    banner: USE_CLIENT_BANNER,
  },
]);
