import type { Preview } from "storybook";
import { REPORT_THEME_CSS } from "../src/formatters/report-theme-css";

// Lazy-load Mermaid once per Storybook session so live mermaid blocks render.
let mermaidPromise: Promise<{
  initialize: (cfg: unknown) => void;
  run: (opts: { nodes: Element[] }) => Promise<void>;
}> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    // Mermaid is fetched from a CDN at runtime: a remote URL has no static
    // import to write.
    // eslint-disable-next-line no-restricted-syntax
    mermaidPromise = import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs"
    ).then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "neutral" });
      return m.default;
    });
  }
  return mermaidPromise;
}

const preview: Preview = {
  globalTypes: {
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
    colorMode: "light",
  },
  decorators: [
    (story, context) => {
      const colorMode = context.globals.colorMode || "light";

      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-theme", colorMode);

      // The remaining stories (review-html, run-diff-html) build their own
      // markup + component CSS and only need the shared design tokens.
      const style = document.createElement("style");
      style.textContent = REPORT_THEME_CSS;
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

      // Render any live mermaid blocks asynchronously.
      const mermaidNodes = Array.from(
        wrapper.querySelectorAll<HTMLElement>("pre.mermaid, pre[data-mermaid]"),
      );
      if (mermaidNodes.length > 0) {
        mermaidNodes.forEach((n) => n.removeAttribute("data-processed"));
        loadMermaid()
          .then((mermaid) => mermaid.run({ nodes: mermaidNodes }))
          .catch((err) => {
            console.warn("Mermaid render failed:", err);
          });
      }

      return wrapper;
    },
  ],
};

export default preview;
