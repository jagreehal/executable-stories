import type { StorybookConfig } from "@storybook/html-vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  framework: "@storybook/html-vite",
  viteFinal: async (vite) => {
    vite.resolve = vite.resolve ?? {};
    vite.resolve.alias = {
      ...(vite.resolve.alias as Record<string, string> | undefined),
      "node:crypto": resolve(here, "./node-crypto-shim.ts"),
    };
    return vite;
  },
};

export default config;
