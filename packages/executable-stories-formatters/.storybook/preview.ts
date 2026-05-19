import type { Preview } from "storybook";
import {
  resolveTheme,
  getAvailableThemes,
} from "../src/formatters/html/themes/index";

// Lazy-load Mermaid once per Storybook session so live mermaid blocks render.
let mermaidPromise: Promise<{
  initialize: (cfg: unknown) => void;
  run: (opts: { nodes: Element[] }) => Promise<void>;
}> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
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

      // Wire up minimal interactivity so rendered buttons work inside Storybook.
      const w = window as unknown as Record<string, unknown>;
      const toast = (el: Element) => {
        const existing = el.querySelector(".copy-toast");
        if (existing) existing.remove();
        const t = document.createElement("span");
        t.className = "copy-toast";
        t.textContent = "Copied!";
        const header = el.querySelector(".feature-header, .scenario-header");
        if (header) {
          (header as HTMLElement).style.position = "relative";
          header.appendChild(t);
          setTimeout(() => t.remove(), 1500);
        }
      };
      w.copyScenarioAsMarkdown = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const title =
          (el.querySelector(".scenario-name") as HTMLElement | null)
            ?.textContent ?? "";
        const lines = [`### Scenario: ${title.trim()}`, ""];
        el.querySelectorAll(".step, .step.continuation").forEach((step) => {
          const k = step.getAttribute("data-keyword") || "";
          const t = step.getAttribute("data-text") || "";
          lines.push(`- **${k}** ${t}`);
        });
        navigator.clipboard?.writeText(lines.join("\n"));
        toast(el);
      };
      w.copyScenarioAsPrompt = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const title =
          (el.querySelector(".scenario-name") as HTMLElement | null)
            ?.textContent ?? "";
        const lines = [
          "I need help investigating a failing executable-story scenario.",
          "",
          `Scenario: ${title.trim()}`,
          "Status: failed",
          "",
          "Steps:",
        ];
        el.querySelectorAll(".step, .step.continuation").forEach((step) => {
          const k = step.getAttribute("data-keyword") || "";
          const t = step.getAttribute("data-text") || "";
          const stat = step.querySelector(".step-status");
          const marker = stat?.classList.contains("status-failed")
            ? "x "
            : stat?.classList.contains("status-passed")
              ? "+ "
              : "  ";
          lines.push(`${marker}${k} ${t}`);
        });
        const errEl = el.querySelector(".error-message, .error-box");
        if (errEl)
          lines.push("", "Error:", (errEl.textContent || "").trim());
        navigator.clipboard?.writeText(lines.join("\n"));
        toast(el);
      };
      w.copyPermalink = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
          navigator.clipboard?.writeText(
            location.href.split("#")[0] + "#" + id,
          );
          toast(el);
        }
      };
      w.toggleToc = () => {};

      // Render any live mermaid blocks asynchronously.
      const mermaidNodes = Array.from(
        wrapper.querySelectorAll<HTMLElement>("pre.mermaid"),
      );
      if (mermaidNodes.length > 0) {
        // mermaid mutates innerHTML; reset processedness on re-renders
        mermaidNodes.forEach((n) => n.removeAttribute("data-processed"));
        loadMermaid()
          .then((mermaid) => mermaid.run({ nodes: mermaidNodes }))
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn("Mermaid render failed:", err);
          });
      }

      // Click-to-toggle collapse for headers rendered in stories
      wrapper.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".scenario-actions")) return;
        const header = target.closest(
          ".scenario-header, .feature-header",
        ) as HTMLElement | null;
        if (!header) return;
        const containerEl = header.closest(".scenario, .feature");
        containerEl?.classList.toggle("collapsed");
        const expanded = !containerEl?.classList.contains("collapsed");
        header.setAttribute("aria-expanded", String(expanded));
      });

      return wrapper;
    },
  ],
};

export default preview;
