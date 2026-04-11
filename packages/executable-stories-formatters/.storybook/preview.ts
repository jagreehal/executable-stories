import type { Preview } from "storybook";
import {
  resolveTheme,
  getAvailableThemes,
} from "../src/formatters/html/themes/index";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Report theme",
      toolbar: {
        title: "Theme",
        items: getAvailableThemes().map((name) => ({
          value: name,
          title: resolveTheme(name).label,
        })),
        dynamicTitle: true,
      },
    },
    colorMode: {
      description: "Color mode",
      toolbar: {
        title: "Mode",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "default",
    colorMode: "light",
  },
  decorators: [
    (story, context) => {
      const themeName = context.globals.theme || "default";
      const colorMode = context.globals.colorMode || "light";
      const theme = resolveTheme(themeName);

      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-theme", colorMode);
      wrapper.setAttribute("data-detail-level", "full");

      const style = document.createElement("style");
      style.textContent = theme.css;
      wrapper.appendChild(style);

      const container = document.createElement("div");
      container.className = "container";
      container.style.padding = "1rem";

      const content = story();
      if (typeof content === "string") {
        container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        container.appendChild(content);
      }

      wrapper.appendChild(container);
      return wrapper;
    },
  ],
};

export default preview;
