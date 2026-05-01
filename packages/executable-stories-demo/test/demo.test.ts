import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildDemo, initDemo } from "../src/index";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

describe("executable-stories-demo", () => {
  it("initializes a demo site scaffold with config", () => {
    const siteDir = createTempDir("demo-init-");

    const result = initDemo({
      targetDir: siteDir,
      force: true,
      productName: "Acme Product",
    });

    expect(result.targetDir).toBe(siteDir);
    expect(fs.existsSync(path.join(siteDir, "astro.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(siteDir, "demo.config.json"))).toBe(true);

    const config = JSON.parse(fs.readFileSync(path.join(siteDir, "demo.config.json"), "utf8")) as {
      productName: string;
    };
    expect(config.productName).toBe("Acme Product");
  });

  it("throws a clear error when site dir is missing", async () => {
    const missingSiteDir = path.join(os.tmpdir(), "does-not-exist-demo-site");
    const inputDir = createTempDir("demo-missing-site-input-");
    const inputPath = path.join(inputDir, "raw-run.json");

    fs.writeFileSync(inputPath, JSON.stringify(makeRawRun({ projectRoot: inputDir })), "utf8");

    await expect(
      buildDemo({
        input: inputPath,
        siteDir: missingSiteDir,
      }),
    ).rejects.toThrow("Demo site directory not found");
  });

  it("builds pages, applies scenario order, and switches Astro theme", async () => {
    const siteDir = createTempDir("demo-build-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "DX Demo" });

    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify(
        {
          productName: "DX Demo",
          tagline: "Executable stories as demos",
          theme: "terminal",
          cta: {
            primary: "Start",
            url: "/signup",
          },
          scenarios: {
            order: ["stories/tests/b-flow.story.index", "stories/tests/a-flow.story.index"],
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const inputDir = createTempDir("demo-build-input-");
    const inputPath = path.join(inputDir, "raw-run.json");

    fs.writeFileSync(
      inputPath,
      JSON.stringify(
        makeRawRun({
          projectRoot: inputDir,
          testCases: [
            makeRawTestCase({
              scenario: "A flow",
              sourceFile: "tests/a-flow.story.spec.ts",
            }),
            makeRawTestCase({
              scenario: "B flow",
              sourceFile: "tests/b-flow.story.spec.ts",
            }),
          ],
        }),
        null,
        2,
      ),
      "utf8",
    );

    const result = await buildDemo({
      input: inputPath,
      siteDir,
    });

    expect(result.pages.map((p) => p.slug)).toEqual([
      "stories/tests/b-flow.story.index",
      "stories/tests/a-flow.story.index",
    ]);

    const astroConfig = fs.readFileSync(path.join(siteDir, "astro.config.mjs"), "utf8");
    expect(astroConfig).toContain("./src/styles/themes/terminal.css");

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    expect(indexPage).toContain('template=splash theme=terminal');
    // CTA is rendered into the hero, not just hidden in a comment.
    expect(indexPage).toContain('href="/signup"');
    expect(indexPage).toContain('>Start</a>');
  });

  it("splash mode emits OG/Twitter meta in head", async () => {
    const siteDir = createTempDir("demo-seo-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "SEO Demo" });

    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify(
        {
          productName: "SEO Demo",
          tagline: "Buyer-facing copy.",
          template: "splash",
          seo: {
            title: "SEO Demo — verified scenarios",
            description: "Watch the product run end-to-end.",
            twitter: "@acme",
            canonical: "https://example.com/demo/",
          },
          branding: { ogImage: "https://example.com/og.png" },
        },
        null,
        2,
      ),
      "utf8",
    );

    const inputDir = createTempDir("demo-seo-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(inputPath, JSON.stringify(makeRawRun({ projectRoot: inputDir })), "utf8");

    await buildDemo({ input: inputPath, siteDir });

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    expect(indexPage).toContain("head:");
    expect(indexPage).toContain('property: "og:title"');
    expect(indexPage).toContain('"SEO Demo — verified scenarios"');
    expect(indexPage).toContain('content: "https://example.com/og.png"');
    expect(indexPage).toContain('name: "twitter:site"');
    expect(indexPage).toContain('rel: "canonical"');
    expect(indexPage).toContain('href: "https://example.com/demo/"');
    // summary_large_image because ogImage is set
    expect(indexPage).toContain('"summary_large_image"');
  });

  it("stats.mode 'off' hides the stats strip entirely", async () => {
    const siteDir = createTempDir("demo-stats-off-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Stats Off" });

    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify({ productName: "Stats Off", stats: { mode: "off" } }, null, 2),
      "utf8",
    );

    const inputDir = createTempDir("demo-stats-off-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(inputPath, JSON.stringify(makeRawRun({ projectRoot: inputDir })), "utf8");

    await buildDemo({ input: inputPath, siteDir });

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    expect(indexPage).not.toContain('class="demo-stats"');
  });

  it("dashboard template defaults stats to test-mode framing", async () => {
    const siteDir = createTempDir("demo-dashboard-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Dash Demo" });

    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify({ productName: "Dash Demo", template: "dashboard" }, null, 2),
      "utf8",
    );

    const inputDir = createTempDir("demo-dashboard-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(inputPath, JSON.stringify(makeRawRun({ projectRoot: inputDir })), "utf8");

    await buildDemo({ input: inputPath, siteDir });

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    // Engineering framing keeps the original Passed/Failed/Skipped labels.
    expect(indexPage).toContain('>Passed<');
    expect(indexPage).toContain('>Failed<');
    expect(indexPage).toContain('>Skipped<');
    // Storyboard heading reads "Stories" in dashboard mode (not "Scenarios").
    expect(indexPage).toContain('>Stories</h2>');
    expect(indexPage).toContain('template=dashboard');
  });

  it("splash capability mode shows verified count, not failed/skipped breakdown", async () => {
    const siteDir = createTempDir("demo-cap-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Cap Demo" });

    const inputDir = createTempDir("demo-cap-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(
      inputPath,
      JSON.stringify(
        makeRawRun({
          projectRoot: inputDir,
          testCases: [
            makeRawTestCase({ scenario: "Pass A", sourceFile: "tests/a.spec.ts" }),
            makeRawTestCase({ scenario: "Pass B", sourceFile: "tests/b.spec.ts" }),
          ],
        }),
      ),
      "utf8",
    );

    await buildDemo({ input: inputPath, siteDir });

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    expect(indexPage).toContain('>Verified<');
    expect(indexPage).not.toContain('>Failed<');
    expect(indexPage).not.toContain('>Skipped<');
    expect(indexPage).toContain('>Scenarios</h2>');
  });

  it("branding.accent is applied to the landing wrapper as a CSS variable", async () => {
    const siteDir = createTempDir("demo-accent-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Accent Demo" });

    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify(
        { productName: "Accent Demo", branding: { accent: "#ff5722" } },
        null,
        2,
      ),
      "utf8",
    );

    const inputDir = createTempDir("demo-accent-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(inputPath, JSON.stringify(makeRawRun({ projectRoot: inputDir })), "utf8");

    await buildDemo({ input: inputPath, siteDir });

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    expect(indexPage).toContain("--demo-accent-override: #ff5722");
  });

  it("branding.accent strips characters that don't belong in a CSS color value", async () => {
    const siteDir = createTempDir("demo-accent-xss-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Accent XSS" });

    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify(
        {
          productName: "Accent XSS",
          // Anything resembling a quote/script breakout must be stripped before
          // landing in a style attribute.
          branding: { accent: 'red"; background: url(javascript:alert(1));' },
        },
        null,
        2,
      ),
      "utf8",
    );

    const inputDir = createTempDir("demo-accent-xss-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(inputPath, JSON.stringify(makeRawRun({ projectRoot: inputDir })), "utf8");

    await buildDemo({ input: inputPath, siteDir });

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    // Two real risks for inline style="…": (a) attribute breakout via " and
    // (b) declaration injection via ; or :. Pull out the rendered accent value
    // and assert no dangerous chars survived.
    const match = indexPage.match(/--demo-accent-override:\s*([^"]*?);"/);
    expect(match, "accent override should be present").not.toBeNull();
    const accentValue = match![1];
    expect(accentValue).not.toContain('"');
    expect(accentValue).not.toContain(";");
    expect(accentValue).not.toContain(":");
    expect(indexPage).not.toContain("javascript:");
  });

  it("featured scenario inlines its first media attachment on the landing page", async () => {
    const siteDir = createTempDir("demo-featured-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Featured Demo" });

    const inputDir = createTempDir("demo-featured-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    const screenshotPath = path.join(inputDir, "hero.png");
    // 1x1 transparent PNG bytes
    fs.writeFileSync(
      screenshotPath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64",
      ),
    );

    // Featured slug must match the generated story's slug under stories/.
    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify(
        {
          productName: "Featured Demo",
          template: "splash",
          featured: { scenario: "stories/tests/checkout.story.index" },
        },
        null,
        2,
      ),
      "utf8",
    );

    fs.writeFileSync(
      inputPath,
      JSON.stringify(
        makeRawRun({
          projectRoot: inputDir,
          testCases: [
            makeRawTestCase({
              scenario: "Checkout flow",
              sourceFile: "tests/checkout.story.spec.ts",
              attachments: [
                { name: "Hero shot", mediaType: "image/png", path: "hero.png" },
              ],
            }),
          ],
        }),
      ),
      "utf8",
    );

    await buildDemo({ input: inputPath, siteDir });

    const indexPage = fs.readFileSync(path.join(siteDir, "src/content/docs/index.mdx"), "utf8");
    expect(indexPage).toContain('class="demo-featured"');
    expect(indexPage).toContain('class="demo-featured__image"');
    // Small files inline as data URIs (canonicalize embeds <512KB by default);
    // larger files copy to /demo-assets/. Either is correct.
    expect(indexPage).toMatch(/src="(?:data:image\/[^"]+|\/demo-assets\/[^"]+)"/);
  });

  it("appends video attachments as media and rewrites to /demo-assets", async () => {
    const siteDir = createTempDir("demo-media-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Media Demo" });

    const inputDir = createTempDir("demo-media-input-");
    const inputPath = path.join(inputDir, "raw-run.json");

    const videoPath = path.join(inputDir, "demo.webm");
    fs.writeFileSync(videoPath, Buffer.alloc(600 * 1024, 7));

    fs.writeFileSync(
      inputPath,
      JSON.stringify(
        makeRawRun({
          projectRoot: inputDir,
          testCases: [
            makeRawTestCase({
              scenario: "Video flow",
              sourceFile: "tests/video-flow.story.spec.ts",
              attachments: [
                {
                  name: "Demo Video",
                  mediaType: "video/webm",
                  path: "demo.webm",
                },
              ],
            }),
          ],
        }),
        null,
        2,
      ),
      "utf8",
    );

    await buildDemo({ input: inputPath, siteDir });

    const pagePath = path.join(
      siteDir,
      "src/content/docs/stories/tests/video-flow.story.index.md",
    );
    const page = fs.readFileSync(pagePath, "utf8");

    expect(page).toContain("## Media");
    expect(page).toContain("### Demo Video");
    expect(page).toMatch(/<video controls preload="metadata" src="\/demo-assets\//);
  });

  it("falls back to default theme for unknown values", async () => {
    const siteDir = createTempDir("demo-theme-fallback-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Theme Fallback" });

    fs.writeFileSync(
      path.join(siteDir, "demo.config.json"),
      JSON.stringify(
        {
          productName: "Theme Fallback",
          theme: "unknown-theme",
        },
        null,
        2,
      ),
      "utf8",
    );

    const inputDir = createTempDir("demo-theme-fallback-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(inputPath, JSON.stringify(makeRawRun({ projectRoot: inputDir }), null, 2), "utf8");

    await buildDemo({ input: inputPath, siteDir });

    const astroConfig = fs.readFileSync(path.join(siteDir, "astro.config.mjs"), "utf8");
    expect(astroConfig).toContain("./src/styles/themes/default.css");

    const manifest = JSON.parse(fs.readFileSync(path.join(siteDir, "demo-manifest.json"), "utf8")) as {
      theme: string;
    };
    expect(manifest.theme).toBe("default");
  });

  it("fails in strict mode when attachment assets are missing", async () => {
    const siteDir = createTempDir("demo-strict-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Strict Demo" });

    const inputDir = createTempDir("demo-strict-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    fs.writeFileSync(
      inputPath,
      JSON.stringify(
        makeRawRun({
          projectRoot: inputDir,
          testCases: [
            makeRawTestCase({
              scenario: "Missing media flow",
              sourceFile: "tests/missing-media.story.spec.ts",
              attachments: [
                {
                  name: "Missing Video",
                  mediaType: "video/webm",
                  path: "missing.webm",
                },
              ],
            }),
          ],
        }),
        null,
        2,
      ),
      "utf8",
    );

    await expect(
      buildDemo({
        input: inputPath,
        siteDir,
        strict: true,
      }),
    ).rejects.toThrow("Asset not found");
  });

  it("supports custom assets dir/base URL and rewrites media URLs", async () => {
    const siteDir = createTempDir("demo-custom-assets-site-");
    initDemo({ targetDir: siteDir, force: true, productName: "Custom Asset Demo" });

    const inputDir = createTempDir("demo-custom-assets-input-");
    const inputPath = path.join(inputDir, "raw-run.json");
    const videoPath = path.join(inputDir, "large-demo.webm");
    fs.writeFileSync(videoPath, Buffer.alloc(700 * 1024, 9));

    fs.writeFileSync(
      inputPath,
      JSON.stringify(
        makeRawRun({
          projectRoot: inputDir,
          testCases: [
            makeRawTestCase({
              scenario: "Custom asset flow",
              sourceFile: "tests/custom-assets.story.spec.ts",
              attachments: [
                {
                  name: "Custom Demo Video",
                  mediaType: "video/webm",
                  path: "large-demo.webm",
                },
              ],
            }),
          ],
        }),
        null,
        2,
      ),
      "utf8",
    );

    const assetsDir = "public/media";
    const assetsBaseUrl = "/media";
    const result = await buildDemo({
      input: inputPath,
      siteDir,
      assetsDir,
      assetsBaseUrl,
      allowMissingAssets: false,
    });

    const pagePath = path.join(
      siteDir,
      "src/content/docs/stories/tests/custom-assets.story.index.md",
    );
    const page = fs.readFileSync(pagePath, "utf8");
    expect(page).toContain("<video");
    expect(page).toContain("src=\"/media/");

    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, "utf8")) as {
      assets: { baseUrl: string; dir: string; allowMissing: boolean; strict: boolean };
    };
    expect(manifest.assets.baseUrl).toBe("/media");
    expect(manifest.assets.allowMissing).toBe(false);
    expect(manifest.assets.strict).toBe(false);
    expect(manifest.assets.dir.endsWith("/public/media")).toBe(true);
  });
});

type RawAttachmentInput = {
  name: string;
  mediaType: string;
  path?: string;
};

function makeRawRun(args: {
  projectRoot: string;
  testCases?: Array<ReturnType<typeof makeRawTestCase>>;
}) {
  return {
    schemaVersion: 1,
    startedAtMs: 1,
    finishedAtMs: 2,
    projectRoot: args.projectRoot,
    testCases:
      args.testCases ??
      [
        makeRawTestCase({
          scenario: "Default flow",
          sourceFile: "tests/default.story.spec.ts",
        }),
      ],
  };
}

function makeRawTestCase(args: {
  scenario: string;
  sourceFile: string;
  attachments?: RawAttachmentInput[];
}) {
  return {
    title: args.scenario,
    titlePath: [args.scenario],
    story: {
      scenario: args.scenario,
      steps: [
        {
          keyword: "Given",
          text: "a working flow",
          mode: "sync",
          phase: "runtime",
        },
      ],
      tags: [],
      tickets: [],
    },
    sourceFile: args.sourceFile,
    sourceLine: 1,
    status: "pass",
    durationMs: 10,
    retry: 0,
    retries: 0,
    attachments: args.attachments,
  };
}

function createTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}
