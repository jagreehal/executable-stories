import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: { name: "@storybook/react-vite", options: {} },
  // The report fixtures use report-relative media paths ("screenshots/x.png").
  // Serving matching files makes a broken <img>/<video> in a story a real bug
  // rather than a missing fixture.
  staticDirs: ["./public"],
};

export default config;
