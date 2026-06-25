import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  ReportGenerator,
  canonicalizeRun,
  copyMarkdownAssets,
  type Attachment,
  type RawRun,
  type TestCaseResult,
  type TestRunResult,
} from "executable-stories-formatters";

export interface DemoCta {
  primary: string;
  url: string;
}

export interface DemoScenarioConfig {
  order?: string[];
}

export type DemoTemplate = "splash" | "dashboard";

export type DemoStatsMode = "test" | "capability" | "off";

export interface DemoStatsConfig {
  mode?: DemoStatsMode;
}

export interface DemoFeaturedConfig {
  /** Slug of a story (e.g. "stories/checkout/happy-path") to feature inline on the landing page. */
  scenario?: string;
}

export interface DemoBrandingConfig {
  /** Site-relative path or absolute URL to a logo. */
  logo?: string;
  /** Site-relative path or absolute URL to an OG/Twitter card image. */
  ogImage?: string;
  /** Site-relative path or absolute URL to a favicon. */
  favicon?: string;
  /** Optional CSS color string that overrides the active theme's --demo-accent. */
  accent?: string;
}

export interface DemoSeoConfig {
  /** Defaults to productName. */
  title?: string;
  /** Defaults to tagline. */
  description?: string;
  /** Twitter handle including @, e.g. "@acme". */
  twitter?: string;
  /** Canonical URL for og:url and link rel=canonical. */
  canonical?: string;
}

export type DemoSection =
  | { kind: "feature-grid"; heading?: string; items: Array<{ title: string; body: string }> }
  | { kind: "narrative"; heading?: string; eyebrow?: string; body: string; media?: string }
  | { kind: "quote"; quote: string; attribution?: string };

export interface DemoConfig {
  productName?: string;
  tagline?: string;
  theme?: string;
  template?: DemoTemplate;
  cta?: DemoCta;
  scenarios?: DemoScenarioConfig;
  stats?: DemoStatsConfig;
  featured?: DemoFeaturedConfig;
  branding?: DemoBrandingConfig;
  seo?: DemoSeoConfig;
  sections?: DemoSection[];
}

export interface InitDemoOptions {
  targetDir?: string;
  force?: boolean;
  productName?: string;
}

export interface InitDemoResult {
  targetDir: string;
  configPath: string;
}

export interface BuildDemoOptions {
  input: string;
  siteDir: string;
  configPath?: string;
  allowMissingAssets?: boolean;
  assetsBaseUrl?: string;
  assetsDir?: string;
  strict?: boolean;
}

export interface DemoPage {
  title: string;
  slug: string;
  file: string;
}

export interface BuildDemoResult {
  pages: DemoPage[];
  manifestPath: string;
  storiesDir: string;
}

export interface PreviewDemoOptions {
  siteDir: string;
  mode?: "dev" | "preview" | "build";
}

interface ResolvedConfig {
  productName: string;
  tagline: string;
  theme: string;
  template: DemoTemplate;
  cta: DemoCta;
  scenarios: { order: string[] };
  stats: { mode: DemoStatsMode };
  featured: { scenario?: string };
  branding: DemoBrandingConfig;
  seo: DemoSeoConfig;
  sections: DemoSection[];
}

const DEFAULT_CONFIG = {
  productName: "Product Demo",
  tagline: "Executable stories turned into product walkthroughs.",
  theme: "default",
  template: "splash" as DemoTemplate,
  cta: {
    primary: "Get Started",
    url: "/",
  },
  scenarios: {
    order: [] as string[],
  },
  // Splash audiences = customers/prospects; capability framing reads better than test counts.
  // Dashboard mode flips to "test" by default in loadConfig.
  stats: {
    mode: "capability" as DemoStatsMode,
  },
} as const;
const SUPPORTED_THEMES = new Set([
  "default",
  "corporate",
  "terminal",
  "minimal",
  "dashboard",
  "playful",
]);
const TEST_EXTENSIONS = [
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  ".spec.tsx",
  ".test.js",
  ".spec.js",
  ".story.test.ts",
  ".story.spec.ts",
];
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDemo(options: InitDemoOptions = {}): InitDemoResult {
  const targetDir = path.resolve(options.targetDir ?? "./demo-site");
  const force = options.force ?? false;

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      throw new Error(
        `Directory \"${targetDir}\" already exists and is not empty. Use --force to overwrite.`,
      );
    }
  }

  const templateDir = path.resolve(
    __dirname,
    "..",
    "templates",
    "astro-demo-starlight",
  );

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found at ${templateDir}`);
  }

  copyDirRecursive(templateDir, targetDir);

  const productName = options.productName ?? toTitleCase(path.basename(targetDir));
  const config: DemoConfig = {
    productName,
    tagline: DEFAULT_CONFIG.tagline,
    theme: DEFAULT_CONFIG.theme,
    template: DEFAULT_CONFIG.template,
    cta: { ...DEFAULT_CONFIG.cta },
    scenarios: { order: [] },
    stats: { mode: DEFAULT_CONFIG.stats.mode },
    seo: {
      title: productName,
      description: DEFAULT_CONFIG.tagline,
    },
  };

  const configPath = path.join(targetDir, "demo.config.json");
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  return { targetDir, configPath };
}

export async function buildDemo(options: BuildDemoOptions): Promise<BuildDemoResult> {
  const siteDir = path.resolve(options.siteDir);
  const inputPath = path.resolve(options.input);
  const configPath = path.resolve(options.configPath ?? path.join(siteDir, "demo.config.json"));
  const astroConfigPath = path.join(siteDir, "astro.config.mjs");

  if (!fs.existsSync(siteDir)) {
    throw new Error(
      `Demo site directory not found: ${siteDir}. Run \"executable-stories-demo init <dir>\" first.`,
    );
  }

  if (!fs.existsSync(astroConfigPath)) {
    throw new Error(
      `astro.config.mjs not found in ${siteDir}. This directory is not a valid demo site scaffold.`,
    );
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input run file not found: ${inputPath}`);
  }

  const config = loadConfig(configPath);
  const run = loadRun(inputPath);

  const docsDir = path.join(siteDir, "src", "content", "docs");
  const storiesDir = path.join(docsDir, "stories");
  const strict = options.strict ?? false;
  const allowMissingAssets = strict ? false : options.allowMissingAssets ?? true;
  const assetsDir = resolveAssetsDir(siteDir, options.assetsDir);
  const assetsBaseUrl = normalizeAssetsBaseUrl(options.assetsBaseUrl);

  fs.mkdirSync(storiesDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const generator = new ReportGenerator({
    formats: ["astro-markdown"],
    outputDir: storiesDir,
    output: {
      mode: "colocated",
      colocatedStyle: "mirrored",
    },
    astro: {
      assetsDir,
      assetsBaseUrl,
      markdown: {
        title: `${config.productName} Stories`,
      },
    },
    assetMode: "copy",
    allowMissingAssets,
  });

  const output = await generator.generate(run);
  const astroFiles = output.get("astro-markdown") ?? [];
  appendAttachmentsToPages({
    astroFiles,
    run,
    storiesDir,
    assetsDir,
    assetsBaseUrl,
    allowMissingAssets,
  });

  const pages = toPages(astroFiles, docsDir, config.scenarios.order);
  writeLandingPage(path.join(docsDir, "index.mdx"), config, pages, run, docsDir, assetsBaseUrl);
  applyThemeToAstroConfig(siteDir, config.theme);

  const manifest = {
    generatedAt: new Date().toISOString(),
    input: toPosix(inputPath),
    config: toPosix(configPath),
    productName: config.productName,
    theme: config.theme,
    assets: {
      dir: toPosix(assetsDir),
      baseUrl: assetsBaseUrl,
      allowMissing: allowMissingAssets,
      strict,
    },
    stats: {
      scenarios: run.testCases.length,
      passed: run.testCases.filter((tc) => tc.status === "passed").length,
      failed: run.testCases.filter((tc) => tc.status === "failed").length,
      skipped: run.testCases.filter((tc) => tc.status === "skipped").length,
      pending: run.testCases.filter((tc) => tc.status === "pending").length,
    },
    pages,
  };

  const manifestPath = path.join(siteDir, "demo-manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    pages,
    manifestPath,
    storiesDir,
  };
}

export function previewDemo(options: PreviewDemoOptions): void {
  const siteDir = path.resolve(options.siteDir);
  const mode = options.mode ?? "dev";

  const command = mode === "build" ? "build" : mode === "preview" ? "preview" : "dev";
  const result = spawnSync("pnpm", [command], {
    cwd: siteDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`pnpm ${command} failed with exit code ${result.status ?? 1}`);
  }
}

function loadConfig(configPath: string): ResolvedConfig {
  const userConfig = fs.existsSync(configPath)
    ? (JSON.parse(fs.readFileSync(configPath, "utf8")) as DemoConfig)
    : {};
  const theme = normalizeTheme(userConfig.theme);
  const template: DemoTemplate =
    userConfig.template === "dashboard" ? "dashboard" : DEFAULT_CONFIG.template;
  const statsMode: DemoStatsMode = (() => {
    const m = userConfig.stats?.mode;
    if (m === "test" || m === "capability" || m === "off") return m;
    // Dashboard audiences are engineering — test framing fits.
    return template === "dashboard" ? "test" : DEFAULT_CONFIG.stats.mode;
  })();

  return {
    productName: userConfig.productName ?? DEFAULT_CONFIG.productName,
    tagline: userConfig.tagline ?? DEFAULT_CONFIG.tagline,
    theme,
    template,
    cta: {
      primary: userConfig.cta?.primary ?? DEFAULT_CONFIG.cta.primary,
      url: userConfig.cta?.url ?? DEFAULT_CONFIG.cta.url,
    },
    scenarios: {
      order: userConfig.scenarios?.order ?? [...DEFAULT_CONFIG.scenarios.order],
    },
    stats: { mode: statsMode },
    featured: {
      scenario: userConfig.featured?.scenario,
    },
    branding: {
      logo: userConfig.branding?.logo,
      ogImage: userConfig.branding?.ogImage,
      favicon: userConfig.branding?.favicon,
      accent: userConfig.branding?.accent,
    },
    seo: {
      title: userConfig.seo?.title,
      description: userConfig.seo?.description,
      twitter: userConfig.seo?.twitter,
      canonical: userConfig.seo?.canonical,
    },
    sections: userConfig.sections ?? [],
  };
}

function loadRun(inputPath: string): TestRunResult {
  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8")) as unknown;

  if (isRawLikePayload(payload)) {
    return canonicalizeRun(payload as RawRun);
  }

  return payload as TestRunResult;
}

function isRawLikePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;

  const maybeCases = (payload as { testCases?: Array<{ status?: unknown }> }).testCases;
  const firstStatus = maybeCases?.[0]?.status;

  return firstStatus === "pass" || firstStatus === "fail" || firstStatus === "skip";
}

function appendAttachmentsToPages(args: {
  astroFiles: string[];
  run: TestRunResult;
  storiesDir: string;
  assetsDir: string;
  assetsBaseUrl: string;
  allowMissingAssets: boolean;
}): void {
  const byPage = groupAttachmentsByPage(args.run.testCases, args.storiesDir, "index");

  for (const filePath of args.astroFiles) {
    const attachments = byPage.get(toPosix(path.resolve(filePath)));
    if (!attachments || attachments.length === 0) continue;

    const markdownDir = path.dirname(filePath);
    const unique = dedupeAttachments(attachments);
    const rendered = renderAttachmentSection(unique, markdownDir, args.run.projectRoot);
    if (rendered.length === 0) continue;

    const original = fs.readFileSync(filePath, "utf8");
    const appended = `${original.trimEnd()}\n\n${rendered}\n`;

    const copied = copyMarkdownAssets({
      markdown: appended,
      markdownDir,
      assetsDir: args.assetsDir,
      assetsBaseUrl: args.assetsBaseUrl,
      allowMissing: args.allowMissingAssets,
    });

    fs.writeFileSync(filePath, copied.markdown, "utf8");
  }
}

function groupAttachmentsByPage(
  testCases: TestCaseResult[],
  storiesDir: string,
  outputName: string,
): Map<string, Attachment[]> {
  const grouped = new Map<string, Attachment[]>();
  const baseDir = toPosix(path.resolve(storiesDir));

  for (const tc of testCases) {
    if (tc.attachments.length === 0) continue;

    const outputPath = computeStoryOutputPath(tc.sourceFile, baseDir, outputName);
    const existing = grouped.get(outputPath) ?? [];
    existing.push(...tc.attachments);
    grouped.set(outputPath, existing);
  }

  return grouped;
}

function computeStoryOutputPath(sourceFile: string, baseOutputDir: string, outputName: string): string {
  if (sourceFile === "unknown") {
    return toPosix(path.join(baseOutputDir, `${outputName}.md`));
  }

  const normalizedSource = toPosix(sourceFile);
  const dirOfSource = path.posix.dirname(normalizedSource);
  let baseName = path.posix.basename(normalizedSource);

  for (const extension of TEST_EXTENSIONS) {
    if (baseName.endsWith(extension)) {
      baseName = baseName.slice(0, -extension.length);
      break;
    }
  }

  const fileName = `${baseName}.${outputName}.md`;
  return toPosix(path.posix.join(baseOutputDir, dirOfSource, fileName));
}

function dedupeAttachments(attachments: Attachment[]): Attachment[] {
  const seen = new Set<string>();
  const deduped: Attachment[] = [];

  for (const attachment of attachments) {
    const key = `${attachment.name}|${attachment.mediaType}|${attachment.contentEncoding}|${attachment.body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(attachment);
  }

  return deduped;
}

function renderAttachmentSection(
  attachments: Attachment[],
  markdownDir: string,
  projectRoot: string,
): string {
  const lines: string[] = ["## Media", ""];

  for (const attachment of attachments) {
    const source = resolveAttachmentSource(attachment, markdownDir, projectRoot);
    if (!source) continue;

    const label = attachment.name || "Attachment";
    if (attachment.mediaType.startsWith("video/")) {
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(`<video controls preload=\"metadata\" src=\"${source}\"></video>`);
      lines.push("");
      continue;
    }

    if (attachment.mediaType.startsWith("image/")) {
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(`![${label}](${source})`);
      lines.push("");
      continue;
    }

    lines.push(`- [${label}](${source})`);
  }

  if (lines.length <= 2) return "";
  return lines.join("\n");
}

function resolveAttachmentSource(
  attachment: Attachment,
  markdownDir: string,
  projectRoot: string,
): string | undefined {
  if (!attachment.body) return undefined;

  if (attachment.contentEncoding === "BASE64") {
    return `data:${attachment.mediaType};base64,${attachment.body}`;
  }

  const body = attachment.body.trim();
  if (
    body.startsWith("http://") ||
    body.startsWith("https://") ||
    body.startsWith("data:") ||
    body.startsWith("#")
  ) {
    return body;
  }

  if (path.isAbsolute(body) && fs.existsSync(body)) {
    return toPosix(path.relative(markdownDir, body));
  }

  const candidateFromProject = path.resolve(projectRoot, body);
  if (fs.existsSync(candidateFromProject)) {
    return toPosix(path.relative(markdownDir, candidateFromProject));
  }

  return body;
}

function toPages(astroFiles: string[], docsDir: string, orderedSlugs: string[]): DemoPage[] {
  const pages = astroFiles.map((absPath) => {
    const rel = toPosix(path.relative(docsDir, absPath));
    const withoutExt = rel.replace(/\.md$/, "");
    const slug = withoutExt;
    const title = toTitleCase(normalizePageName(path.basename(withoutExt)));
    return {
      title,
      slug,
      file: rel,
    };
  });

  if (orderedSlugs.length === 0) return pages;

  const rank = new Map(orderedSlugs.map((slug, index) => [slug, index]));
  return [...pages].sort((a, b) => {
    const ar = rank.get(a.slug);
    const br = rank.get(b.slug);

    if (ar === undefined && br === undefined) return a.slug.localeCompare(b.slug);
    if (ar === undefined) return 1;
    if (br === undefined) return -1;
    return ar - br;
  });
}

function normalizePageName(fileBase: string): string {
  return fileBase
    .replace(/\.story\.index$/i, "")
    .replace(/\.index$/i, "")
    .replace(/\.story$/i, "");
}

function applyThemeToAstroConfig(siteDir: string, requestedTheme: string): void {
  const configPath = path.join(siteDir, "astro.config.mjs");
  if (!fs.existsSync(configPath)) return;

  const theme = normalizeTheme(requestedTheme);
  const config = fs.readFileSync(configPath, "utf8");
  const updated = config.replace(
    /'\.\/src\/styles\/themes\/[^']+\.css'/,
    `'./src/styles/themes/${theme}.css'`,
  );

  fs.writeFileSync(configPath, updated, "utf8");
}

function normalizeTheme(requestedTheme: string | undefined): string {
  if (!requestedTheme) return DEFAULT_CONFIG.theme;
  return SUPPORTED_THEMES.has(requestedTheme) ? requestedTheme : DEFAULT_CONFIG.theme;
}

type PageStatus = "passed" | "failed" | "skipped" | "pending";

interface RunStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

function computeStats(run: TestRunResult): RunStats {
  return {
    total: run.testCases.length,
    passed: run.testCases.filter((tc) => tc.status === "passed").length,
    failed: run.testCases.filter((tc) => tc.status === "failed").length,
    skipped: run.testCases.filter((tc) => tc.status === "skipped").length,
  };
}

function renderHead(config: ResolvedConfig): string[] {
  const seoTitle = config.seo.title ?? config.productName;
  const seoDesc = config.seo.description ?? config.tagline;
  const ogImage = config.branding.ogImage;
  const canonical = config.seo.canonical;
  const twitter = config.seo.twitter;

  const tags: Array<{ tag: string; attrs: Record<string, string> }> = [
    { tag: "meta", attrs: { property: "og:type", content: "website" } },
    { tag: "meta", attrs: { property: "og:title", content: seoTitle } },
    { tag: "meta", attrs: { property: "og:description", content: seoDesc } },
    { tag: "meta", attrs: { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" } },
    { tag: "meta", attrs: { name: "twitter:title", content: seoTitle } },
    { tag: "meta", attrs: { name: "twitter:description", content: seoDesc } },
  ];
  if (ogImage) {
    tags.push({ tag: "meta", attrs: { property: "og:image", content: ogImage } });
    tags.push({ tag: "meta", attrs: { name: "twitter:image", content: ogImage } });
  }
  if (canonical) {
    tags.push({ tag: "meta", attrs: { property: "og:url", content: canonical } });
    tags.push({ tag: "link", attrs: { rel: "canonical", href: canonical } });
  }
  if (twitter) {
    tags.push({ tag: "meta", attrs: { name: "twitter:site", content: twitter } });
  }
  if (config.branding.favicon) {
    tags.push({ tag: "link", attrs: { rel: "icon", href: config.branding.favicon } });
  }

  const lines = ["head:"];
  for (const { tag, attrs } of tags) {
    lines.push(`  - tag: ${tag}`);
    lines.push(`    attrs:`);
    for (const [k, v] of Object.entries(attrs)) {
      lines.push(`      ${k}: ${yamlString(v)}`);
    }
  }
  return lines;
}

function renderStats(mode: DemoStatsMode, stats: RunStats): string[] {
  if (mode === "off") return [];

  if (mode === "capability") {
    // Customer-facing framing: total = capabilities verified, no fail count up top.
    const verified = stats.passed;
    const inProgress = stats.failed + stats.skipped;
    const items: string[] = [
      `  <ul class="demo-stats" aria-label="Coverage summary">`,
      `    <li class="demo-stat" data-tone="total"><span class="demo-stat__value">${stats.total}</span><span class="demo-stat__label">Scenarios</span></li>`,
      `    <li class="demo-stat" data-tone="pass"><span class="demo-stat__value">${verified}</span><span class="demo-stat__label">Verified</span></li>`,
    ];
    if (inProgress > 0) {
      items.push(
        `    <li class="demo-stat" data-tone="pending"><span class="demo-stat__value">${inProgress}</span><span class="demo-stat__label">In progress</span></li>`,
      );
    }
    items.push(`  </ul>`);
    return ["", ...items];
  }

  // Test mode: original engineering dashboard.
  return [
    "",
    `  <ul class="demo-stats" aria-label="Test results">`,
    `    <li class="demo-stat" data-tone="total"><span class="demo-stat__value">${stats.total}</span><span class="demo-stat__label">Scenarios</span></li>`,
    `    <li class="demo-stat" data-tone="pass"><span class="demo-stat__value">${stats.passed}</span><span class="demo-stat__label">Passed</span></li>`,
    `    <li class="demo-stat" data-tone="fail"><span class="demo-stat__value">${stats.failed}</span><span class="demo-stat__label">Failed</span></li>`,
    `    <li class="demo-stat" data-tone="skip"><span class="demo-stat__value">${stats.skipped}</span><span class="demo-stat__label">Skipped</span></li>`,
    `  </ul>`,
  ];
}

function renderStoryList(
  pages: DemoPage[],
  statusBySlug: Map<string, PageStatus>,
  heading: string,
): string[] {
  const lines: string[] = [
    "",
    `  <section class="demo-section">`,
    `    <h2 class="demo-section-heading">${escapeHtml(heading)}</h2>`,
  ];
  if (pages.length === 0) {
    lines.push(
      `    <div class="demo-empty">No stories generated yet. Run <code>executable-stories-demo build</code>.</div>`,
    );
  } else {
    lines.push(`    <ol class="demo-stories">`);
    pages.forEach((page, index) => {
      const status = statusBySlug.get(page.slug) ?? "pending";
      const indexLabel = String(index + 1).padStart(2, "0");
      const title = escapeHtml(page.title);
      const statusLabel = escapeHtml(status);
      const href = toAstroUrl(page.slug);
      lines.push(
        `      <li><a class="demo-story" data-status="${statusLabel}" href="${href}">` +
          `<span class="demo-story__index">${indexLabel}</span>` +
          `<span class="demo-story__title">${title}</span>` +
          `<span class="demo-story__status">${statusLabel}</span></a></li>`,
      );
    });
    lines.push(`    </ol>`);
  }
  lines.push(`  </section>`);
  return lines;
}

function findFeaturedMedia(
  featuredSlug: string,
  pages: DemoPage[],
  run: TestRunResult,
  docsDir: string,
  assetsBaseUrl: string,
):
  | { kind: "video" | "image"; src: string; alt: string; storyHref: string; storyTitle: string }
  | undefined {
  const target = pages.find((p) => p.slug === featuredSlug);
  if (!target) return undefined;

  const storiesDir = path.join(docsDir, "stories");
  const baseDir = toPosix(path.resolve(storiesDir));

  for (const tc of run.testCases) {
    const out = computeStoryOutputPath(tc.sourceFile, baseDir, "index");
    const rel = toPosix(path.posix.relative(toPosix(path.resolve(docsDir)), out));
    const slug = rel.replace(/\.md$/, "");
    if (slug !== featuredSlug) continue;

    for (const att of tc.attachments) {
      const isVideo = att.mediaType.startsWith("video/");
      const isImage = att.mediaType.startsWith("image/");
      if (!isVideo && !isImage) continue;
      // Best-effort src: data URI for embedded, otherwise assume it lives under assetsBaseUrl
      // by name (the attachment pipeline already copies + hashes files into assetsDir).
      let src: string | undefined;
      if (att.contentEncoding === "BASE64") {
        src = `data:${att.mediaType};base64,${att.body}`;
      } else if (att.body) {
        const body = att.body.trim();
        if (body.startsWith("http") || body.startsWith("data:") || body.startsWith("/")) {
          src = body;
        } else {
          src = `${assetsBaseUrl}/${path.posix.basename(body)}`;
        }
      }
      if (!src) continue;
      return {
        kind: isVideo ? "video" : "image",
        src,
        alt: att.name || target.title,
        storyHref: toAstroUrl(target.slug),
        storyTitle: target.title,
      };
    }
  }

  return undefined;
}

function renderFeatured(
  featured: NonNullable<ReturnType<typeof findFeaturedMedia>>,
): string[] {
  const lines: string[] = [
    "",
    `  <section class="demo-featured" aria-labelledby="demo-featured-title">`,
    `    <span class="demo-featured__eyebrow">Watch first</span>`,
    `    <h2 id="demo-featured-title" class="demo-featured__title">${escapeHtml(featured.storyTitle)}</h2>`,
    `    <div class="demo-featured__media">`,
  ];
  if (featured.kind === "video") {
    lines.push(
      `      <video class="demo-featured__video" controls preload="metadata" src="${escapeHtml(featured.src)}" aria-label="${escapeHtml(featured.alt)}"></video>`,
    );
  } else {
    lines.push(
      `      <img class="demo-featured__image" src="${escapeHtml(featured.src)}" alt="${escapeHtml(featured.alt)}" />`,
    );
  }
  lines.push(`    </div>`);
  lines.push(
    `    <a class="demo-featured__link" href="${escapeHtml(featured.storyHref)}">Read the full scenario →</a>`,
  );
  lines.push(`  </section>`);
  return lines;
}

function renderSections(sections: DemoSection[]): string[] {
  if (sections.length === 0) return [];
  const lines: string[] = [];

  for (const section of sections) {
    lines.push("");
    if (section.kind === "feature-grid") {
      lines.push(`  <section class="demo-section">`);
      if (section.heading) {
        lines.push(`    <h2 class="demo-section-heading">${escapeHtml(section.heading)}</h2>`);
      }
      lines.push(`    <ul class="demo-feature-grid">`);
      for (const item of section.items) {
        lines.push(`      <li class="demo-feature">`);
        lines.push(`        <h3 class="demo-feature__title">${escapeHtml(item.title)}</h3>`);
        lines.push(`        <p class="demo-feature__body">${escapeHtml(item.body)}</p>`);
        lines.push(`      </li>`);
      }
      lines.push(`    </ul>`);
      lines.push(`  </section>`);
    } else if (section.kind === "narrative") {
      lines.push(`  <section class="demo-narrative">`);
      lines.push(`    <div class="demo-narrative__copy">`);
      if (section.eyebrow) {
        lines.push(`      <span class="demo-narrative__eyebrow">${escapeHtml(section.eyebrow)}</span>`);
      }
      if (section.heading) {
        lines.push(`      <h2 class="demo-narrative__heading">${escapeHtml(section.heading)}</h2>`);
      }
      lines.push(`      <p class="demo-narrative__body">${escapeHtml(section.body)}</p>`);
      lines.push(`    </div>`);
      if (section.media) {
        lines.push(`    <div class="demo-narrative__media">`);
        lines.push(`      <img src="${escapeHtml(section.media)}" alt="" />`);
        lines.push(`    </div>`);
      }
      lines.push(`  </section>`);
    } else if (section.kind === "quote") {
      lines.push(`  <figure class="demo-quote">`);
      lines.push(`    <blockquote class="demo-quote__body">${escapeHtml(section.quote)}</blockquote>`);
      if (section.attribution) {
        lines.push(`    <figcaption class="demo-quote__attribution">${escapeHtml(section.attribution)}</figcaption>`);
      }
      lines.push(`  </figure>`);
    }
  }

  return lines;
}

function writeLandingPage(
  indexPath: string,
  config: ResolvedConfig,
  pages: DemoPage[],
  run: TestRunResult,
  docsDir: string,
  assetsBaseUrl: string,
): void {
  const stats = computeStats(run);
  const statusBySlug = buildStatusBySlug(run, docsDir);
  const ctaHref = config.cta.url || "/";
  const ctaLabel = escapeHtml(config.cta.primary);
  const productName = escapeHtml(config.productName);
  const tagline = escapeHtml(config.tagline);
  const isSplash = config.template === "splash";

  const frontmatter: string[] = [
    "---",
    `title: ${yamlString(config.productName)}`,
    `description: ${yamlString(config.tagline)}`,
    "template: splash",
  ];
  // SEO/OG meta via Starlight's frontmatter `head:` block.
  for (const line of renderHead(config)) frontmatter.push(line);
  frontmatter.push("---", "");

  const accentVar = config.branding.accent
    ? ` style="--demo-accent-override: ${cssColorEscape(config.branding.accent)};"`
    : "";

  const lines: string[] = [
    ...frontmatter,
    `{/* Generated by executable-stories-demo. Edit demo.config.json, not this file. */}`,
    `{/* template=${config.template} theme=${config.theme} stats=${config.stats.mode} */}`,
    "",
    `<div class="demo-landing not-content" data-template="${config.template}"${accentVar}>`,
    "",
    `  <section class="demo-hero">`,
  ];

  if (config.branding.logo) {
    lines.push(
      `    <img class="demo-hero__logo" src="${escapeHtml(config.branding.logo)}" alt="${escapeHtml(config.productName + " logo")}" />`,
    );
  }
  lines.push(
    `    <span class="demo-hero__eyebrow">${escapeHtml(isSplash ? "Product demo" : "Executable stories")}</span>`,
    `    <h1 class="demo-hero__title">${productName}</h1>`,
    `    <p class="demo-hero__tagline">${tagline}</p>`,
    `    <a class="demo-hero__cta" href="${escapeHtml(ctaHref)}">${ctaLabel}</a>`,
    `  </section>`,
  );

  // Featured scenario (splash mode only — and only if config.featured.scenario resolves to a real story).
  if (isSplash && config.featured.scenario) {
    const featured = findFeaturedMedia(
      config.featured.scenario,
      pages,
      run,
      docsDir,
      assetsBaseUrl,
    );
    if (featured) lines.push(...renderFeatured(featured));
  }

  // Stats — capability framing in splash, test framing in dashboard, hidden if mode=off.
  for (const line of renderStats(config.stats.mode, stats)) lines.push(line);

  // Custom sections (splash only — dashboard stays focused on the test run).
  if (isSplash) {
    for (const line of renderSections(config.sections)) lines.push(line);
  }

  // Story list (always, but heading copy depends on mode).
  const storyHeading = isSplash ? "Scenarios" : "Stories";
  for (const line of renderStoryList(pages, statusBySlug, storyHeading)) {
    lines.push(line);
  }

  lines.push("");
  lines.push("</div>");

  fs.writeFileSync(indexPath, `${lines.join("\n")}\n`, "utf8");
}

/**
 * YAML-safe scalar quote: `"foo"` for any value that contains characters YAML
 * would interpret. Used for frontmatter values we generate from user config.
 */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Inline CSS values get a tighter sanitisation than HTML attributes. */
function cssColorEscape(value: string): string {
  // Strip anything that isn't a plausible CSS value character to neutralise
  // injection via style attributes. Keep alnum + common color punctuation.
  return value.replace(/[^a-zA-Z0-9#%(),.\-\s/]/g, "");
}

function buildStatusBySlug(run: TestRunResult, docsDir: string): Map<string, PageStatus> {
  const storiesDir = path.join(docsDir, "stories");
  const baseDir = toPosix(path.resolve(storiesDir));
  const absDocsDir = toPosix(path.resolve(docsDir));
  const result = new Map<string, PageStatus>();

  for (const tc of run.testCases) {
    const outputPath = computeStoryOutputPath(tc.sourceFile, baseDir, "index");
    const relative = toPosix(path.posix.relative(absDocsDir, outputPath));
    const slug = relative.replace(/\.md$/, "");
    const current = result.get(slug);
    result.set(slug, mergePageStatus(current, tc.status as PageStatus));
  }

  return result;
}

function mergePageStatus(current: PageStatus | undefined, incoming: PageStatus): PageStatus {
  if (!current) return incoming;
  if (current === "failed" || incoming === "failed") return "failed";
  if (current === "passed" || incoming === "passed") return "passed";
  if (current === "skipped" && incoming === "skipped") return "skipped";
  return current;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Astro Starlight's content loader sanitizes slug segments by stripping
// non-alphanumeric/-/_ characters and lower-casing. Mirror that so the
// landing-page links resolve to the pages Astro actually emits.
function toAstroUrl(pageSlug: string): string {
  const sanitized = pageSlug
    .split("/")
    .map((segment) => segment.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");
  return sanitized.length === 0 ? "/" : `/${sanitized}/`;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizeAssetsBaseUrl(value: string | undefined): string {
  const base = value ?? "/demo-assets";
  if (!base.startsWith("/")) return `/${base.replace(/\/+$/, "")}`;
  return base.replace(/\/+$/, "") || "/demo-assets";
}

function resolveAssetsDir(siteDir: string, value: string | undefined): string {
  if (!value) return path.join(siteDir, "public", "demo-assets");
  if (path.isAbsolute(value)) return value;
  return path.join(siteDir, value);
}
