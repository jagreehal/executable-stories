import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Vite config used ONLY by Storybook (the package itself builds with tsup).
 * Provides the React + Tailwind v4 pipeline so stories render the shadcn
 * component layer, and the `@/` alias mirrors the testing-levels-template.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
