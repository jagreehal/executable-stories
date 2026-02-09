// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import starlightThemeNext from 'starlight-theme-next';
import tailwindcss from '@tailwindcss/vite';
import astroMermaid from 'astro-mermaid';

// Use base path for GitHub Pages (e.g. /executable-stories). Local dev uses same by default; use pnpm dev:root or BASE=/ pnpm dev to run from /.
const base = process.env.BASE || '/executable-stories';

export default defineConfig({
  site: 'https://jagreehal.github.io',
  base,
  integrations: [
    sitemap(),
    astroMermaid(),
    starlight({
      title: 'Executable Stories',
      description:
        'Framework-native BDD-style tests with generated docs for Vitest, Jest, Playwright, and Cypress.',
      head: [
        {
          tag: 'base',
          attrs: {
            href: base.replace(/\/?$/, '/'),
          },
        },
      ],
      favicon: '/favicon.svg',
      logo: {
        src: './public/logo.svg',
        alt: 'Executable Stories',
      },
      customCss: ['./src/styles/global.css'],
      plugins: [starlightThemeNext()],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      editLink: {
        baseUrl: 'https://github.com/jagreehal/executable-stories/edit/main/apps/docs-site/',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/jagreehal/executable-stories',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation (Vitest)', slug: 'getting-started/installation-vitest' },
            { label: 'Installation (Jest)', slug: 'getting-started/installation-jest' },
            { label: 'Installation (Playwright)', slug: 'getting-started/installation-playwright' },
            { label: 'Installation (Cypress)', slug: 'getting-started/installation-cypress' },
            { label: 'First Story (Vitest)', slug: 'getting-started/first-story-vitest' },
            { label: 'First Story (Jest)', slug: 'getting-started/first-story-jest' },
            { label: 'First Story (Playwright)', slug: 'getting-started/first-story-playwright' },
            { label: 'First Story (Cypress)', slug: 'getting-started/first-story-cypress' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Developer experience', slug: 'guides/developer-experience' },
            { label: 'Output modes', slug: 'guides/output-modes' },
            { label: 'Understanding the report', slug: 'guides/understanding-the-report' },
            { label: 'Common issues', slug: 'guides/common-issues' },
            { label: 'Why not Cucumber?', slug: 'guides/why-not-cucumber' },
            { label: 'CI and source links', slug: 'guides/ci-and-source-links' },
            { label: 'Collating reports', slug: 'guides/collating-reports' },
            { label: 'Formatting and metadata', slug: 'guides/formatting-and-metadata' },
            { label: 'Converting existing Vitest tests', slug: 'guides/converting-vitest' },
            { label: 'Converting existing Jest tests', slug: 'guides/converting-jest' },
            { label: 'Converting existing Playwright tests', slug: 'guides/converting-playwright' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Core types & constants', slug: 'reference/core-api' },
            { label: 'Formatters API', slug: 'reference/formatters-api' },
            { label: 'ESLint plugins', slug: 'reference/eslint-plugins' },
            { label: 'Vitest reporter options', slug: 'reference/vitest-config' },
            { label: 'Vitest story & doc API', slug: 'reference/vitest-story-api' },
            { label: 'Jest reporter options', slug: 'reference/jest-config' },
            { label: 'Jest story & doc API', slug: 'reference/jest-story-api' },
            { label: 'Playwright reporter options', slug: 'reference/playwright-config' },
            { label: 'Playwright story & doc API', slug: 'reference/playwright-story-api' },
            { label: 'Cypress reporter options', slug: 'reference/cypress-config' },
            { label: 'Cypress story & doc API', slug: 'reference/cypress-story-api' },
          ],
        },
        {
          label: 'Recipes (Vitest)',
          items: [
            { label: 'Overview', slug: 'recipes/vitest' },
            { label: 'User logs in successfully', slug: 'recipes/vitest/user-logs-in-successfully' },
            { label: 'Bulk user creation', slug: 'recipes/vitest/bulk-user-creation' },
            { label: 'API accepts JSON payload', slug: 'recipes/vitest/api-accepts-json-payload' },
            { label: 'Login blocked for suspended user', slug: 'recipes/vitest/login-blocked-suspended-user' },
          ],
        },
        {
          label: 'Recipes (Jest)',
          items: [
            { label: 'Overview', slug: 'recipes/jest' },
          ],
        },
        {
          label: 'Recipes (Playwright)',
          items: [
            { label: 'Overview', slug: 'recipes/playwright' },
          ],
        },
        {
          label: 'Recipes (Cypress)',
          items: [
            { label: 'Overview', slug: 'recipes/cypress' },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: /** @type {any} */ ([tailwindcss()]),
  },
});
