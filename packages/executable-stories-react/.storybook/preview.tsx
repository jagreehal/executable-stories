import type { Preview } from "@storybook/react-vite";
import React from "react";
import "../src/styles/tailwind.css";

/**
 * Component-tier preview. A `colorMode` toolbar toggles the report's
 * light/dark via `data-theme` (the same hook consumers use), so every story —
 * and every play function run under `test:component` — is exercised in both
 * palettes. a11y violations fail the component test run.
 */
const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    layout: "fullscreen",
  },
  globalTypes: {
    colorMode: {
      description: "Color mode",
      toolbar: {
        title: "Mode",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { colorMode: "light" },
  decorators: [
    (Story, context) => {
      const mode = (context.globals.colorMode as string) || "light";
      return (
        <div
          data-theme={mode}
          className="es-report-island font-sans text-foreground"
          style={{ background: "var(--background)", minHeight: "100vh", padding: "1.5rem" }}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
