import { defineExecutableStories } from 'executable-stories-astro';

/**
 * One config object drives the whole docs site. It is imported by BOTH
 * astro.config.mjs (route injection, nav, theme) and src/content.config.ts
 * (the loaders) — so everything lives in one place.
 *
 * `source` points at the run JSON your test adapter writes. Emit it by setting
 * `rawRunPath: "reports/raw-run.json"` in your StoryReporter config, then run
 * your tests in watch mode + `astro dev` to hot-reload these pages.
 */
export default defineExecutableStories({
  source: process.env.ES_RUN_JSON ?? '../reports/raw-run.json',

  // Shown only until your tests emit the run JSON above, so `astro dev` is
  // populated on first run instead of empty. Replaced automatically the moment
  // real results land; the Stories page labels these as sample data. Delete the
  // file (and this line) once you're wired up.
  sampleSource: './reports/sample-run.json',

  // How scenarios are categorised in the index/explorer/nav:
  //   'feature' (default) | 'tag' | 'source' | 'status' | 'none'
  groupBy: 'feature',

  // Only show some scenarios (optional):
  // include: { tags: ['security', 'observability'] },
  // exclude: { status: ['skipped'] },

  // Combine several test suites in one site (optional):
  // sources: [
  //   { name: 'web', label: 'Web app', source: '../apps/web/reports/raw-run.json' },
  //   { name: 'api', label: 'API',     source: '../apps/api/reports/raw-run.json' },
  // ],

  // Theme the story pages (optional). `preset` picks a built-in palette
  // ('default' | 'terminal' | 'minimal' | 'vibrant'); `accent` is a shorthand;
  // `tokens` overrides any individual token (accent, pass, fail, warn, fg,
  // muted, border, surface). These restyle the story content only — the
  // Starlight shell keeps its own light/dark theme.
  // theme: { preset: 'terminal', accent: '#3245ff', tokens: { pass: '#16a34a' } },

  // Where the Stories/Explorer pages render (optional). 'auto' (default) uses
  // the Starlight shell — sidebar, search, theme toggle — when this site has
  // Starlight, and falls back to standalone pages otherwise. Force it with
  // 'starlight' or 'standalone' if you embed the integration in your own site.
  // shell: 'auto',

  // Agent-readable endpoints (on by default): /llms.txt indexes every scenario
  // and each story page gets a plain-Markdown twin at /stories/<slug>.md, so
  // the deployed site is consumable by agents/curl, not just browsers.
  // agentEndpoints: true,
});
