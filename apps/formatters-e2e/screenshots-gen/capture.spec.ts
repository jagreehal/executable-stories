/**
 * Generates the docs-site marketing screenshots from the REAL React-rendered,
 * fully interactive report (executable-stories-react SSR + the hydration
 * island). Run with `pnpm screenshots` (see playwright.config.ts in this dir).
 *
 * Output: apps/docs-site/public/screenshots/*.png at Retina (deviceScaleFactor
 * 2, scale:"device"). The previous PNGs were captured from the deleted string
 * renderer and no longer match the shipped UI.
 */
import { test, type Page } from "@playwright/test";
import { renderReportToHtml } from "executable-stories-react/ssr";
import { kitchenSinkReport } from "../../../packages/executable-stories-react/src/test/kitchen-sink";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const reactDist = resolve(here, "../../../packages/executable-stories-react/dist");
const OUT = resolve(here, "../../docs-site/public/screenshots");
const EXAMPLES = resolve(here, "../../docs-site/public/examples");
mkdirSync(OUT, { recursive: true });
mkdirSync(EXAMPLES, { recursive: true });

const css = readFileSync(resolve(reactDist, "tailwind.css"), "utf8");
const islandScript = readFileSync(resolve(reactDist, "report-island.global.js"), "utf8");

// A little page chrome so full-page/hero shots read as a polished artifact
// rather than edge-to-edge: themed background + centred column + breathing room.
const pageChrome = `
  html, body { margin: 0; }
  body { background: var(--background); padding: 32px; }
  .es-report-island { max-width: 1120px; margin: 0 auto; }
`;

function buildHtml(theme: "light" | "dark"): string {
  return renderReportToHtml(kitchenSinkReport(), {
    title: "Checkout — Story Report",
    css,
    theme,
    islandScript,
    headExtra: `<style>${pageChrome}</style>`,
  });
}

/** Load HTML on a real origin (route interception) so the island's localStorage works. */
async function load(page: Page, theme: "light" | "dark"): Promise<void> {
  // Match the OS color scheme to the report theme so the highlight.js dark
  // stylesheet (gated on prefers-color-scheme) applies in dark screenshots.
  await page.emulateMedia({ colorScheme: theme });
  const html = buildHtml(theme);
  await page.route("https://report.local/", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("https://report.local/", { waitUntil: "domcontentloaded" });
  // Island mounted → the interactive search box exists (SSR markup has no .es-search).
  await page.waitForSelector(".es-search", { timeout: 15_000 });
  await page.evaluate(() => (document as Document & { fonts: FontFaceSet }).fonts.ready);
  // Give highlight.js + mermaid (CDN) a moment to colour code / draw diagrams.
  await page
    .waitForSelector('figure[aria-label="Discount pipeline"] svg', { timeout: 12_000 })
    .catch(() => {});
  await page.waitForTimeout(600);
}

const shot = { scale: "device" as const, animations: "disabled" as const };

test("standalone interactive report — html", async () => {
  // The clickable live report linked from the docs. Same render as the
  // screenshots; the in-page Dark toggle covers both themes from one file.
  // data-pagefind-ignore keeps the demo report out of the docs search index.
  const html = buildHtml("light").replace("<body>", "<body data-pagefind-ignore>");
  writeFileSync(resolve(EXAMPLES, "report.html"), html, "utf8");
});

test("full report — light (report-output + hero)", async ({ page }) => {
  await load(page, "light");
  // Hero: the above-the-fold band (summary + filters + first scenario start).
  await page.screenshot({ path: resolve(OUT, "hero-report.png"), ...shot });
  // report-output: a bounded "report preview" — taller than the hero so it
  // shows a full passing scenario, but NOT the whole 6000px page (it feeds a
  // before/after vs a terminal shot and a small workflow thumbnail). A taller
  // viewport (clip alone is capped by the viewport) frames it cleanly.
  await page.setViewportSize({ width: 1280, height: 1180 });
  await page.screenshot({ path: resolve(OUT, "report-output.png"), ...shot });
});

test("full report — dark (hero)", async ({ page }) => {
  await load(page, "dark");
  await page.screenshot({ path: resolve(OUT, "hero-report-dark.png"), ...shot });
});

test("feature tiles — light", async ({ page }) => {
  test.setTimeout(120_000);
  await load(page, "light");

  // Capture each tile independently: a missing element must not abort the rest.
  const tile = async (name: string, selector: string) => {
    const el = page.locator(selector).first();
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 8_000 });
      await el.screenshot({ path: resolve(OUT, `${name}.png`), ...shot });
    } catch (err) {
      console.error(`✗ ${name}: ${selector} — ${(err as Error).message.split("\n")[0]}`);
    }
  };

  await tile("feature-search", "header.es-report-header");
  // The drawn mermaid diagram: the island puts aria-label on an inner
  // <div role="img">, so target the figure that CONTAINS it.
  await page
    .locator('[role="img"][aria-label="Discount pipeline"] svg')
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await tile("feature-mermaid", 'figure:has([role="img"][aria-label="Discount pipeline"])');
  await tile("feature-tables", "figure:has(table)");
  await tile("feature-code", "figure:has(pre code)");
  // Scope to the scenario CARD — the sidebar nav items also carry data-status.
  await tile("feature-tickets", "[data-slot='card'][data-status='passed']");
  await tile("feature-failure", "[data-slot='card'][data-status='failed']");

  // OTel trace waterfall — expand the <details> first.
  await page.evaluate(() => {
    document.querySelectorAll("details").forEach((d) => (d.open = true));
  });
  await page.waitForTimeout(200);
  await tile("feature-traces", "details:has(li)");
});
