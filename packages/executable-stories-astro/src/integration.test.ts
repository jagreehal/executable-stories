import { describe, expect, it } from "vitest";

import { executableStories } from "./index.js";

/** The minimal vite-plugin surface these tests exercise. */
interface VitePluginLike {
  name?: string;
  resolveId(id: string): string;
  load(id: string): string;
}

/** A fake Astro integration entry (only `name` is inspected by detection). */
interface IntegrationLike {
  name: string;
}

/**
 * Run the integration's astro:config:setup hook, capturing routes + vite
 * plugins. `integrations` populates the fake Astro `config.integrations` the
 * Starlight detection reads (default: none -> standalone routes).
 */
interface ViteUpdate {
  plugins?: VitePluginLike[];
  optimizeDeps?: { include?: string[] };
  resolve?: { dedupe?: string[] };
}

function runSetup(
  integration: ReturnType<typeof executableStories>,
  integrations: IntegrationLike[] = [],
) {
  const routes: { pattern: string; entrypoint: string }[] = [];
  const plugins: VitePluginLike[] = [];
  const viteUpdates: ViteUpdate[] = [];
  const setup = integration.hooks["astro:config:setup"];
  if (!setup) throw new Error("astro:config:setup hook missing");
  setup({
    injectRoute: (r: { pattern: string; entrypoint: string }) => routes.push(r),
    updateConfig: (c: { vite?: ViteUpdate }) => {
      if (c?.vite) viteUpdates.push(c.vite);
      plugins.push(...(c?.vite?.plugins ?? []));
    },
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    config: { integrations },
  } as never);
  return { routes, plugins, viteUpdates };
}

function injectedRoutes(
  integration: ReturnType<typeof executableStories>,
  integrations: IntegrationLike[] = [],
) {
  return runSetup(integration, integrations).routes;
}

/** Load the virtual config module the integration registers, as an object. */
function virtualConfig(integration: ReturnType<typeof executableStories>) {
  const plugin = runSetup(integration).plugins.find(
    (p) => p.name === "executable-stories:virtual-config",
  );
  if (!plugin) throw new Error("virtual-config plugin not registered");
  const id = "virtual:executable-stories/config";
  const resolved = plugin.resolveId(id);
  const code: string = plugin.load(resolved);
  const cfg: Record<string, string> = {};
  for (const m of code.matchAll(/export const (\w+) = ("[^"]*");/g)) {
    cfg[m[1]] = JSON.parse(m[2]);
  }
  return cfg;
}

describe("executableStories route injection", () => {
  it("injects a stories index at the route base so it is never a dead link", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }));
    const index = routes.find((r) => r.pattern === "/stories");
    expect(index).toBeDefined();
    expect(index?.entrypoint).toBe("executable-stories-astro/routes/stories.astro");
  });

  it("injects the detail route as a single [slug] segment, not a rest param", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }));
    const detail = routes.find((r) => r.entrypoint.endsWith("routes/story.astro"));
    expect(detail?.pattern).toBe("/stories/[slug]");
    // A rest param ([...slug]) also matches the empty base and would collide
    // with the index route.
    expect(routes.some((r) => r.pattern.includes("[..."))).toBe(false);
  });

  it("honours a custom routeBase for both index and detail", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json", routeBase: "/scenarios/" }));
    expect(routes.some((r) => r.pattern === "/scenarios")).toBe(true);
    expect(routes.some((r) => r.pattern === "/scenarios/[slug]")).toBe(true);
  });

  it("can opt out of the story routes while keeping the explorer", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json", injectStoryRoute: false }));
    expect(routes.some((r) => r.entrypoint.endsWith("routes/story.astro"))).toBe(false);
    expect(routes.some((r) => r.entrypoint.endsWith("routes/stories.astro"))).toBe(false);
    expect(routes.some((r) => r.pattern === "/explorer")).toBe(true);
  });

  it("exposes resolved bases via the virtual config module so page links honour them", () => {
    const cfg = virtualConfig(executableStories({ source: "run.json" }));
    expect(cfg).toEqual({
      collection: "stories",
      routeBase: "/stories",
      explorerBase: "/explorer",
      journeysBase: "/journeys",
      statesBase: "/states",
      driftBase: "/drift",
      groupBy: "feature",
      themeCss: "",
    });
  });

  it("normalizes and propagates custom bases to routes and the virtual config", () => {
    const integration = executableStories({
      source: "run.json",
      routeBase: "/docs/scenarios/",
      explorerBase: "browse",
    });
    const { routes } = runSetup(integration);
    expect(routes.some((r) => r.pattern === "/docs/scenarios")).toBe(true);
    expect(routes.some((r) => r.pattern === "/docs/scenarios/[slug]")).toBe(true);
    expect(routes.some((r) => r.pattern === "/browse")).toBe(true);
    expect(virtualConfig(integration)).toEqual({
      collection: "stories",
      routeBase: "/docs/scenarios",
      explorerBase: "/browse",
      journeysBase: "/journeys",
      statesBase: "/states",
      driftBase: "/drift",
      groupBy: "feature",
      themeCss: "",
    });
  });

  it("propagates a custom collection name to the route pages via the virtual config", () => {
    const cfg = virtualConfig(executableStories({ source: "run.json", collection: "scenarios" }));
    expect(cfg.collection).toBe("scenarios");
  });

  it("builds clean (no double-slash) route patterns when mounted at the root", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json", routeBase: "/", explorerBase: "/browse" }));
    // The detail pattern must be "/[slug]", never "//[slug]".
    expect(routes.some((r) => r.pattern === "/[slug]")).toBe(true);
    expect(routes.every((r) => !r.pattern.includes("//"))).toBe(true);
  });

  it("injects the drift page only when there is more than one source to compare", () => {
    const single = injectedRoutes(executableStories({ source: "run.json" }));
    expect(single.some((r) => r.pattern === "/drift")).toBe(false);

    const multi = injectedRoutes(
      executableStories({ sources: [{ source: "a/run.json" }, { source: "b/run.json" }] }),
    );
    expect(multi.find((r) => r.pattern === "/drift")?.entrypoint).toBe(
      "executable-stories-astro/routes/drift.astro",
    );

    // injectDrift forces it either way.
    const forced = injectedRoutes(executableStories({ source: "run.json", injectDrift: true }));
    expect(forced.some((r) => r.pattern === "/drift")).toBe(true);
    const disabled = injectedRoutes(
      executableStories({ sources: [{ source: "a/run.json" }, { source: "b/run.json" }], injectDrift: false }),
    );
    expect(disabled.some((r) => r.pattern === "/drift")).toBe(false);
  });

  it("fails fast when two enabled built-in routes share a base, unless one is disabled", () => {
    expect(() => executableStories({ source: "run.json", journeysBase: "/stories" })).toThrow(/collides with routeBase/);
    expect(() => executableStories({ source: "run.json", statesBase: "/explorer" })).toThrow(/collides with explorerBase/);
    // Disabling the route frees its base.
    const routes = injectedRoutes(
      executableStories({ source: "run.json", injectStoryRoute: false, journeysBase: "/stories" }),
    );
    expect(routes.find((r) => r.pattern === "/stories")?.entrypoint).toBe(
      "executable-stories-astro/routes/journeys.astro",
    );
  });
});

describe("executableStories persona views", () => {
  it("injects one route per view at its base, sharing the view entrypoint", () => {
    const routes = injectedRoutes(
      executableStories({ source: "run.json", views: [{ base: "/for/product" }, { base: "for/design/" }] }),
    );
    const product = routes.find((r) => r.pattern === "/for/product");
    const design = routes.find((r) => r.pattern === "/for/design");
    expect(product?.entrypoint).toBe("executable-stories-astro/routes/view.astro");
    expect(design?.entrypoint).toBe("executable-stories-astro/routes/view.astro");
  });

  it("uses the starlight view variant when Starlight is present", () => {
    const routes = injectedRoutes(
      executableStories({ source: "run.json", views: [{ base: "/for/qa" }] }),
      [{ name: "@astrojs/starlight" }],
    );
    expect(routes.find((r) => r.pattern === "/for/qa")?.entrypoint).toBe(
      "executable-stories-astro/routes/starlight/view.astro",
    );
  });

  it("fails fast at config time on a view base colliding with the story routes", () => {
    expect(() => executableStories({ source: "run.json", views: [{ base: "/stories" }] })).toThrow(/collides/);
  });
});

describe("executableStories journeys", () => {
  it("injects the journeys index and [slug] detail by default", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }));
    expect(routes.find((r) => r.pattern === "/journeys")?.entrypoint).toBe(
      "executable-stories-astro/routes/journeys.astro",
    );
    expect(routes.find((r) => r.pattern === "/journeys/[slug]")?.entrypoint).toBe(
      "executable-stories-astro/routes/journey.astro",
    );
  });

  it("honours a custom journeysBase and can be switched off", () => {
    const custom = injectedRoutes(executableStories({ source: "run.json", journeysBase: "/flows" }));
    expect(custom.find((r) => r.pattern === "/flows")).toBeDefined();
    const off = injectedRoutes(executableStories({ source: "run.json", injectJourneys: false }));
    expect(off.find((r) => r.pattern.startsWith("/journeys"))).toBeUndefined();
  });

  it("uses the starlight journey variants when Starlight is present", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }), [{ name: "@astrojs/starlight" }]);
    expect(routes.find((r) => r.pattern === "/journeys")?.entrypoint).toBe(
      "executable-stories-astro/routes/starlight/journeys.astro",
    );
  });
});

describe("executableStories UI-state catalog", () => {
  it("injects the states grid by default and honours statesBase/injectStates", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }));
    expect(routes.find((r) => r.pattern === "/states")?.entrypoint).toBe(
      "executable-stories-astro/routes/states.astro",
    );
    const custom = injectedRoutes(executableStories({ source: "run.json", statesBase: "/ui" }));
    expect(custom.find((r) => r.pattern === "/ui")).toBeDefined();
    const off = injectedRoutes(executableStories({ source: "run.json", injectStates: false }));
    expect(off.find((r) => r.pattern === "/states")).toBeUndefined();
  });
});

describe("executableStories agent endpoints", () => {
  it("injects /llms.txt and the per-story Markdown twin by default", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }));
    const md = routes.find((r) => r.pattern === "/stories/[slug].md");
    expect(md?.entrypoint).toBe("executable-stories-astro/routes/story-md.ts");
    const llms = routes.find((r) => r.pattern === "/llms.txt");
    expect(llms?.entrypoint).toBe("executable-stories-astro/routes/llms-txt.ts");
  });

  it("mounts the Markdown twin under a custom routeBase", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json", routeBase: "/scenarios" }));
    expect(routes.some((r) => r.pattern === "/scenarios/[slug].md")).toBe(true);
  });

  it("can be switched off with agentEndpoints: false", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json", agentEndpoints: false }));
    expect(routes.some((r) => r.pattern.endsWith(".md"))).toBe(false);
    expect(routes.some((r) => r.pattern === "/llms.txt")).toBe(false);
  });

  it("is suppressed alongside the story routes it links to (injectStoryRoute: false)", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json", injectStoryRoute: false }));
    expect(routes.some((r) => r.pattern === "/llms.txt")).toBe(false);
  });
});

describe("executableStories vite tuning", () => {
  it("pre-bundles the report island deps so first hydration never re-optimizes", () => {
    const { viteUpdates } = runSetup(executableStories({ source: "run.json" }));
    const include = viteUpdates.flatMap((v) => v.optimizeDeps?.include ?? []);
    // The exact deps the island pulls in on hydration; missing any of these
    // reintroduces the "Outdated Optimize Dep" 504 the scaffold used to
    // work around in its own astro.config.
    expect(include).toEqual(
      expect.arrayContaining([
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "executable-stories-react",
        "executable-stories-react/interactive",
      ]),
    );
  });

  it("dedupes React so hooks/context work across the island boundary", () => {
    const { viteUpdates } = runSetup(executableStories({ source: "run.json" }));
    const dedupe = viteUpdates.flatMap((v) => v.resolve?.dedupe ?? []);
    expect(dedupe).toEqual(expect.arrayContaining(["react", "react-dom"]));
  });
});

describe("executableStories shell selection", () => {
  const STARLIGHT = [{ name: "@astrojs/starlight" }];

  it("uses the standalone routes when no Starlight integration is present", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }));
    expect(routes.find((r) => r.pattern === "/stories")?.entrypoint).toBe(
      "executable-stories-astro/routes/stories.astro",
    );
    expect(routes.find((r) => r.pattern === "/stories/[slug]")?.entrypoint).toBe(
      "executable-stories-astro/routes/story.astro",
    );
    expect(routes.find((r) => r.pattern === "/explorer")?.entrypoint).toBe(
      "executable-stories-astro/routes/explorer.astro",
    );
  });

  it("auto-detects Starlight and injects the starlight route variants", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json" }), STARLIGHT);
    expect(routes.find((r) => r.pattern === "/stories")?.entrypoint).toBe(
      "executable-stories-astro/routes/starlight/stories.astro",
    );
    expect(routes.find((r) => r.pattern === "/stories/[slug]")?.entrypoint).toBe(
      "executable-stories-astro/routes/starlight/story.astro",
    );
    expect(routes.find((r) => r.pattern === "/explorer")?.entrypoint).toBe(
      "executable-stories-astro/routes/starlight/explorer.astro",
    );
  });

  it("shell: \"standalone\" overrides auto-detection even when Starlight is present", () => {
    const routes = injectedRoutes(
      executableStories({ source: "run.json", shell: "standalone" }),
      STARLIGHT,
    );
    expect(routes.find((r) => r.pattern === "/stories")?.entrypoint).toBe(
      "executable-stories-astro/routes/stories.astro",
    );
    expect(routes.some((r) => r.entrypoint.includes("/starlight/"))).toBe(false);
  });

  it("shell: \"starlight\" forces the starlight routes even without Starlight detected", () => {
    const routes = injectedRoutes(executableStories({ source: "run.json", shell: "starlight" }));
    expect(routes.find((r) => r.pattern === "/stories")?.entrypoint).toBe(
      "executable-stories-astro/routes/starlight/stories.astro",
    );
    expect(routes.find((r) => r.pattern === "/explorer")?.entrypoint).toBe(
      "executable-stories-astro/routes/starlight/explorer.astro",
    );
  });
});
