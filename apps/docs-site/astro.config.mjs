// @ts-check
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import astroMermaid from 'astro-mermaid';
import { defineConfig } from 'astro/config';


// The recipes and getting-started trees used to carry one page per framework.
// They collapsed into single pages with a framework tab strip; keep the old
// URLs alive so external links and search results still land somewhere useful.
const RECIPE_FRAMEWORKS = [
  'vitest',
  'jest',
  'playwright',
  'cypress',
  'go',
  'pytest',
  'rust',
  'junit5',
  'xunit',
];

const RECIPE_SLUGS = [
  'api-accepts-json-payload',
  'bulk-user-creation',
  'calculate-shipping-options',
  'change-email-address',
  'change-password',
  'checkout-calculates-totals',
  'configure-feature-flags',
  'create-order',
  'create-users-from-table',
  'document-status-changes',
  'eligible-customer-gets-discount',
  'guest-checkout-allowed',
  'import-users-welcome-email',
  'import-xml-invoice',
  'ineligible-customer-no-discount',
  'login-blocked-suspended-user',
  'login-errors',
  'login-works',
  'logout-clears-session',
  'many-login-attempts',
  'password-reset-flow',
  'payment-declined',
  'post-json-payload',
  'render-markdown',
  'report-shows-fields-in-order',
  'search-results-show-highlights',
  'shipping-eligibility',
  'tax-calculation-by-region',
  'two-step-checkout',
  'update-preferences',
  'user-logs-in-successfully',
  'user-updates-profile-details',
];

const SETUP_FRAMEWORKS = [
  'vitest',
  'jest',
  'playwright',
  'cypress',
  'ruby',
  'go',
  'pytest',
  'rust',
  'junit5',
  'xunit',
];

const legacyRedirects = Object.fromEntries([
  ...RECIPE_FRAMEWORKS.flatMap((fw) => [
    [`/recipes/${fw}`, '/recipes'],
    ...RECIPE_SLUGS.map((slug) => [`/recipes/${fw}/${slug}`, `/recipes/${slug}`]),
  ]),
  ...SETUP_FRAMEWORKS.flatMap((fw) => [
    [`/getting-started/installation-${fw}`, '/getting-started/install'],
    [`/getting-started/first-story-${fw}`, '/getting-started/first-story'],
  ]),
]);

export default defineConfig({
  site: 'https://executablestories.com',
  redirects: legacyRedirects,
  integrations: [
    sitemap(),
    astroMermaid(),
    starlight({
      title: 'Executable Stories',
      description:
        'Framework-native BDD-style tests with generated reports for Vitest, Jest, Playwright, Cypress, Go, Python, Ruby, Rust, Kotlin, and C#.',
      head: [
        {
          tag: 'base',
          attrs: {
            href: '/',
          },
        },
      ],
      favicon: '/favicon.svg',
      logo: {
        src: './public/logo.svg',
        alt: 'Executable Stories',
      },
      expressiveCode: {
        themes: ['github-light', 'github-dark'],
      },
      customCss: ['./src/styles/global.css'],

      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      editLink: {
        baseUrl:
          'https://github.com/jagreehal/executable-stories/edit/main/apps/docs-site/',
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
            { label: 'Install', slug: 'getting-started/install' },
            { label: 'Your first story', slug: 'getting-started/first-story' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Overview', slug: 'guides' },
            {
              label: 'Concepts',
              collapsed: true,
              items: [
                { label: 'Why not Cucumber?', slug: 'guides/why-not-cucumber' },
                { label: 'Four layers, without a world object', slug: 'guides/four-layer-model' },
                { label: 'The specification layer', slug: 'guides/the-specification-layer' },
                { label: 'Developer experience', slug: 'guides/developer-experience' },
                { label: 'Understanding the report', slug: 'guides/understanding-the-report' },
              ],
            },
            {
              label: 'Writing stories',
              collapsed: true,
              items: [
                { label: 'Formatting and metadata', slug: 'guides/formatting-and-metadata' },
                { label: 'Tagging for your audience', slug: 'guides/tagging-for-your-audience' },
              ],
            },
            {
              label: 'Adopting an existing suite',
              collapsed: true,
              items: [
                { label: 'Setup decision tree', slug: 'guides/setup-decision-tree' },
                { label: 'Converting Vitest tests', slug: 'guides/converting-vitest' },
                { label: 'Converting Jest tests', slug: 'guides/converting-jest' },
                { label: 'Converting Playwright tests', slug: 'guides/converting-playwright' },
                { label: 'Converting a CucumberJS suite', slug: 'guides/converting-cucumber' },
              ],
            },
            {
              label: 'Output and reports',
              collapsed: true,
              items: [
                { label: 'Output modes', slug: 'guides/output-modes' },
                { label: 'Collating reports', slug: 'guides/collating-reports' },
                { label: 'Sharing reports', slug: 'guides/sharing-reports' },
                { label: 'CI and source links', slug: 'guides/ci-and-source-links' },
              ],
            },
            {
              label: 'Publishing living docs',
              collapsed: true,
              items: [
                { label: 'Astro docs site', slug: 'guides/astro-docs-site' },
                { label: 'Add to an existing Astro site', slug: 'guides/existing-astro-site' },
                { label: 'Multi-repo docs hub', slug: 'guides/multi-repo-docs-hub' },
                { label: 'Embed reports in React apps', slug: 'guides/embed-in-react-apps' },
                { label: 'Product sites with CMS and demos', slug: 'guides/product-sites-with-cms-and-demos' },
                { label: 'Embedding skill & agent HTML', slug: 'guides/embedding-skill-html-output' },
              ],
            },
            {
              label: 'CI gates and review',
              collapsed: true,
              items: [
                { label: 'GitHub Action', slug: 'guides/github-action' },
                { label: 'Release confidence', slug: 'guides/release-confidence' },
                { label: 'Evidence Review and Code Diff', slug: 'guides/evidence-review' },
              ],
            },
            {
              label: 'Integrations',
              collapsed: true,
              items: [
                { label: 'Publishing to Confluence & Jira', slug: 'guides/publishing-to-atlassian' },
                { label: 'TestRail & Xray sync', slug: 'guides/test-management-sync' },
              ],
            },
            {
              label: 'For coding agents',
              collapsed: true,
              items: [
                { label: 'Agent artifact contract', slug: 'guides/agent-artifact-contract' },
                { label: 'MCP server', slug: 'guides/mcp-server' },
                { label: 'Agent loops and backpressure', slug: 'guides/agent-loops' },
              ],
            },
            {
              label: 'When something breaks',
              collapsed: true,
              items: [
                { label: 'Common issues', slug: 'guides/common-issues' },
              ],
            },
          ],
        },
        {
          label: 'Agent Skills',
          items: [
            {
              label: 'Overview and install',
              slug: 'ai-skills',
            },
            {
              label: 'Skill catalogue',
              slug: 'ai-skills/catalogue',
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Overview', slug: 'reference' },
            {
              label: 'Story & doc API',
              collapsed: true,
              items: [
                { label: 'Vitest', slug: 'reference/vitest-story-api' },
                { label: 'Jest', slug: 'reference/jest-story-api' },
                { label: 'Playwright', slug: 'reference/playwright-story-api' },
                { label: 'Cypress', slug: 'reference/cypress-story-api' },
                { label: 'Ruby', slug: 'reference/ruby-story-api' },
                { label: 'Go, Python, Rust, Kotlin, C#', slug: 'reference/other-adapters' },
              ],
            },
            {
              label: 'Reporter options',
              collapsed: true,
              items: [
                { label: 'Vitest', slug: 'reference/vitest-config' },
                { label: 'Jest', slug: 'reference/jest-config' },
                { label: 'Playwright', slug: 'reference/playwright-config' },
                { label: 'Cypress', slug: 'reference/cypress-config' },
              ],
            },
            {
              label: 'CLI, packages, and types',
              collapsed: true,
              items: [
                { label: 'Formatters API and CLI', slug: 'reference/formatters-api' },
                { label: 'Package map', slug: 'reference/package-map' },
                { label: 'Core types & constants', slug: 'reference/core-api' },
                { label: 'Cross-language parity', slug: 'reference/cross-language-parity' },
              ],
            },
            {
              label: 'Rendering and tooling',
              collapsed: true,
              items: [
                { label: 'React renderer', slug: 'reference/react-renderer' },
                { label: 'Theming', slug: 'reference/themes' },
                { label: 'ESLint plugins', slug: 'reference/eslint-plugins' },
              ],
            },
          ],
        },
        {
          label: 'Recipes',
          items: [
            { label: 'Overview', slug: 'recipes' },
            {
              label: 'Step structure',
              collapsed: true,
              items: [
                { label: 'User logs in successfully', slug: 'recipes/user-logs-in-successfully' },
                { label: 'User updates profile details', slug: 'recipes/user-updates-profile-details' },
                { label: 'Checkout calculates totals', slug: 'recipes/checkout-calculates-totals' },
                { label: 'Password reset flow', slug: 'recipes/password-reset-flow' },
                { label: 'Logout clears session', slug: 'recipes/logout-clears-session' },
                { label: 'Two step checkout', slug: 'recipes/two-step-checkout' },
              ],
            },
            {
              label: 'Contrast and explicit keywords',
              collapsed: true,
              items: [
                { label: 'Login blocked for suspended user', slug: 'recipes/login-blocked-suspended-user' },
                { label: 'Payment declined', slug: 'recipes/payment-declined' },
                { label: 'Guest checkout allowed', slug: 'recipes/guest-checkout-allowed' },
                { label: 'Search results show highlights', slug: 'recipes/search-results-show-highlights' },
                { label: 'Report shows fields in order', slug: 'recipes/report-shows-fields-in-order' },
                { label: 'Document status changes', slug: 'recipes/document-status-changes' },
              ],
            },
            {
              label: 'Attaching data',
              collapsed: true,
              items: [
                { label: 'Bulk user creation', slug: 'recipes/bulk-user-creation' },
                { label: 'Calculate shipping options', slug: 'recipes/calculate-shipping-options' },
                { label: 'Configure feature flags', slug: 'recipes/configure-feature-flags' },
                { label: 'Update preferences', slug: 'recipes/update-preferences' },
                { label: 'API accepts a JSON payload', slug: 'recipes/api-accepts-json-payload' },
                { label: 'Import XML invoice', slug: 'recipes/import-xml-invoice' },
                { label: 'Render markdown', slug: 'recipes/render-markdown' },
                { label: 'Import users and welcome email', slug: 'recipes/import-users-welcome-email' },
              ],
            },
            {
              label: 'Scenario outlines',
              collapsed: true,
              items: [
                { label: 'Login errors', slug: 'recipes/login-errors' },
                { label: 'Many login attempts', slug: 'recipes/many-login-attempts' },
                { label: 'Shipping eligibility', slug: 'recipes/shipping-eligibility' },
                { label: 'Tax calculation by region', slug: 'recipes/tax-calculation-by-region' },
                { label: 'Create users from table', slug: 'recipes/create-users-from-table' },
                { label: 'Post JSON payload', slug: 'recipes/post-json-payload' },
              ],
            },
            {
              label: 'Setup, rules, and tags',
              collapsed: true,
              items: [
                { label: 'Change email address', slug: 'recipes/change-email-address' },
                { label: 'Change password', slug: 'recipes/change-password' },
                { label: 'Eligible customer gets discount', slug: 'recipes/eligible-customer-gets-discount' },
                { label: 'Ineligible customer no discount', slug: 'recipes/ineligible-customer-no-discount' },
                { label: 'Create order', slug: 'recipes/create-order' },
                { label: 'Login works', slug: 'recipes/login-works' },
              ],
            },
          ],
        },
        {
          // Starlight v0.39 removed autogenerated groups with a top-level
          // `label`; wrap the autogenerate config in an `items` array instead.
          label: 'Generated Stories',
          collapsed: true,
          items: [{ autogenerate: { directory: 'stories' } }],
        },
      ],
    }),
  ],
  vite: {
    plugins: /** @type {any} */ ([tailwindcss()]),
  },
});
