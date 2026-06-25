// @ts-check
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import astroMermaid from 'astro-mermaid';
import { defineConfig } from 'astro/config';


export default defineConfig({
  site: 'https://executablestories.com',
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
            {
              label: 'Install',
              slug: 'getting-started/install',
            },
            {
              label: 'Installation (Vitest)',
              slug: 'getting-started/installation-vitest',
            },
            {
              label: 'Installation (Jest)',
              slug: 'getting-started/installation-jest',
            },
            {
              label: 'Installation (Playwright)',
              slug: 'getting-started/installation-playwright',
            },
            {
              label: 'Installation (Cypress)',
              slug: 'getting-started/installation-cypress',
            },
            {
              label: 'Installation (Ruby)',
              slug: 'getting-started/installation-ruby',
            },
            {
              label: 'Installation (Go)',
              slug: 'getting-started/installation-go',
            },
            {
              label: 'Installation (pytest)',
              slug: 'getting-started/installation-pytest',
            },
            {
              label: 'Installation (Rust)',
              slug: 'getting-started/installation-rust',
            },
            {
              label: 'Installation (JUnit 5)',
              slug: 'getting-started/installation-junit5',
            },
            {
              label: 'Installation (xUnit)',
              slug: 'getting-started/installation-xunit',
            },
            {
              label: 'First Story (Vitest)',
              slug: 'getting-started/first-story-vitest',
            },
            {
              label: 'First Story (Jest)',
              slug: 'getting-started/first-story-jest',
            },
            {
              label: 'First Story (Playwright)',
              slug: 'getting-started/first-story-playwright',
            },
            {
              label: 'First Story (Cypress)',
              slug: 'getting-started/first-story-cypress',
            },
            {
              label: 'First Story (Ruby)',
              slug: 'getting-started/first-story-ruby',
            },
            {
              label: 'First Story (Go)',
              slug: 'getting-started/first-story-go',
            },
            {
              label: 'First Story (pytest)',
              slug: 'getting-started/first-story-pytest',
            },
            {
              label: 'First Story (Rust)',
              slug: 'getting-started/first-story-rust',
            },
            {
              label: 'First Story (JUnit 5)',
              slug: 'getting-started/first-story-junit5',
            },
            {
              label: 'First Story (xUnit)',
              slug: 'getting-started/first-story-xunit',
            },
          ],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'GitHub Action',
              slug: 'guides/github-action',
            },
            {
              label: 'Release confidence',
              slug: 'guides/release-confidence',
            },
            {
              label: 'Developer experience',
              slug: 'guides/developer-experience',
            },
            { label: 'Output modes', slug: 'guides/output-modes' },
            {
              label: 'Astro docs site',
              slug: 'guides/astro-docs-site',
            },
            {
              label: 'Product sites with CMS and demos',
              slug: 'guides/product-sites-with-cms-and-demos',
            },
            {
              label: 'Publishing to Confluence & Jira',
              slug: 'guides/publishing-to-atlassian',
            },
            {
              label: 'Embedding skill & agent HTML output',
              slug: 'guides/embedding-skill-html-output',
            },
            {
              label: 'Understanding the report',
              slug: 'guides/understanding-the-report',
            },
            { label: 'Common issues', slug: 'guides/common-issues' },
            { label: 'Why not Cucumber?', slug: 'guides/why-not-cucumber' },
            {
              label: 'CI and source links',
              slug: 'guides/ci-and-source-links',
            },
            { label: 'Collating reports', slug: 'guides/collating-reports' },
            {
              label: 'Formatting and metadata',
              slug: 'guides/formatting-and-metadata',
            },
            {
              label: 'Agent artifact contract',
              slug: 'guides/agent-artifact-contract',
            },
            {
              label: 'MCP server',
              slug: 'guides/mcp-server',
            },
            {
              label: 'Agent loops and backpressure',
              slug: 'guides/agent-loops',
            },
            {
              label: 'Setup decision tree',
              slug: 'guides/setup-decision-tree',
            },
            {
              label: 'Converting existing Vitest tests',
              slug: 'guides/converting-vitest',
            },
            {
              label: 'Converting existing Jest tests',
              slug: 'guides/converting-jest',
            },
            {
              label: 'Converting existing Playwright tests',
              slug: 'guides/converting-playwright',
            },
            {
              label: 'Embed reports in React apps',
              slug: 'guides/embed-in-react-apps',
            },
          ],
        },
        {
          label: 'AI Writing Skills',
          items: [
            {
              label: 'Overview',
              slug: 'ai-skills',
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Package map', slug: 'reference/package-map' },
            { label: 'Cross-language parity', slug: 'reference/cross-language-parity' },
            { label: 'Core types & constants', slug: 'reference/core-api' },
            { label: 'Other adapters', slug: 'reference/other-adapters' },
            { label: 'Formatters API', slug: 'reference/formatters-api' },
            { label: 'React renderer', slug: 'reference/react-renderer' },
            { label: 'ESLint plugins', slug: 'reference/eslint-plugins' },
            { label: 'Theming', slug: 'reference/themes' },
            {
              label: 'Vitest reporter options',
              slug: 'reference/vitest-config',
            },
            {
              label: 'Vitest story & doc API',
              slug: 'reference/vitest-story-api',
            },
            { label: 'Jest reporter options', slug: 'reference/jest-config' },
            { label: 'Jest story & doc API', slug: 'reference/jest-story-api' },
            {
              label: 'Playwright reporter options',
              slug: 'reference/playwright-config',
            },
            {
              label: 'Playwright story & doc API',
              slug: 'reference/playwright-story-api',
            },
            {
              label: 'Cypress reporter options',
              slug: 'reference/cypress-config',
            },
            {
              label: 'Cypress story & doc API',
              slug: 'reference/cypress-story-api',
            },
          ],
        },
        {
          label: 'Recipes (Vitest)',
          items: [
            { label: 'Overview', slug: 'recipes/vitest' },
            {
              label: 'User logs in successfully',
              slug: 'recipes/vitest/user-logs-in-successfully',
            },
            {
              label: 'User updates profile details',
              slug: 'recipes/vitest/user-updates-profile-details',
            },
            {
              label: 'Checkout calculates totals',
              slug: 'recipes/vitest/checkout-calculates-totals',
            },
            {
              label: 'Password reset flow',
              slug: 'recipes/vitest/password-reset-flow',
            },
            {
              label: 'Login blocked for suspended user',
              slug: 'recipes/vitest/login-blocked-suspended-user',
            },
            { label: 'Login works (tags)', slug: 'recipes/vitest/login-works' },
            {
              label: 'Login errors (outline)',
              slug: 'recipes/vitest/login-errors',
            },
            {
              label: 'Many login attempts (outline)',
              slug: 'recipes/vitest/many-login-attempts',
            },
            {
              label: 'Bulk user creation',
              slug: 'recipes/vitest/bulk-user-creation',
            },
            {
              label: 'Create users from table',
              slug: 'recipes/vitest/create-users-from-table',
            },
            {
              label: 'Calculate shipping options',
              slug: 'recipes/vitest/calculate-shipping-options',
            },
            {
              label: 'Shipping eligibility',
              slug: 'recipes/vitest/shipping-eligibility',
            },
            {
              label: 'Tax calculation by region',
              slug: 'recipes/vitest/tax-calculation-by-region',
            },
            {
              label: 'API accepts JSON payload',
              slug: 'recipes/vitest/api-accepts-json-payload',
            },
            {
              label: 'Post JSON payload (outline)',
              slug: 'recipes/vitest/post-json-payload',
            },
            {
              label: 'Import XML invoice',
              slug: 'recipes/vitest/import-xml-invoice',
            },
            {
              label: 'Import users + welcome email',
              slug: 'recipes/vitest/import-users-welcome-email',
            },
            {
              label: 'Render markdown',
              slug: 'recipes/vitest/render-markdown',
            },
            {
              label: 'Change email address',
              slug: 'recipes/vitest/change-email-address',
            },
            {
              label: 'Change password',
              slug: 'recipes/vitest/change-password',
            },
            {
              label: 'Eligible customer gets discount',
              slug: 'recipes/vitest/eligible-customer-gets-discount',
            },
            {
              label: 'Ineligible customer no discount',
              slug: 'recipes/vitest/ineligible-customer-no-discount',
            },
            {
              label: 'Two step checkout',
              slug: 'recipes/vitest/two-step-checkout',
            },
            {
              label: 'Payment declined',
              slug: 'recipes/vitest/payment-declined',
            },
            {
              label: 'Guest checkout allowed',
              slug: 'recipes/vitest/guest-checkout-allowed',
            },
            {
              label: 'Logout clears session',
              slug: 'recipes/vitest/logout-clears-session',
            },
            {
              label: 'Document status changes',
              slug: 'recipes/vitest/document-status-changes',
            },
            {
              label: 'Update preferences',
              slug: 'recipes/vitest/update-preferences',
            },
            {
              label: 'Configure feature flags',
              slug: 'recipes/vitest/configure-feature-flags',
            },
            { label: 'Create order', slug: 'recipes/vitest/create-order' },
            {
              label: 'Search results show highlights',
              slug: 'recipes/vitest/search-results-show-highlights',
            },
            {
              label: 'Report shows fields in order',
              slug: 'recipes/vitest/report-shows-fields-in-order',
            },
          ],
        },
        {
          label: 'Recipes (Jest)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/jest' },
            { label: 'User logs in successfully', slug: 'recipes/jest/user-logs-in-successfully' },
            { label: 'User updates profile details', slug: 'recipes/jest/user-updates-profile-details' },
            { label: 'Checkout calculates totals', slug: 'recipes/jest/checkout-calculates-totals' },
            { label: 'Password reset flow', slug: 'recipes/jest/password-reset-flow' },
            { label: 'Login blocked for suspended user', slug: 'recipes/jest/login-blocked-suspended-user' },
            { label: 'Login works (tags)', slug: 'recipes/jest/login-works' },
            { label: 'Login errors (outline)', slug: 'recipes/jest/login-errors' },
            { label: 'Many login attempts (outline)', slug: 'recipes/jest/many-login-attempts' },
            { label: 'Bulk user creation', slug: 'recipes/jest/bulk-user-creation' },
            { label: 'Create users from table', slug: 'recipes/jest/create-users-from-table' },
            { label: 'Calculate shipping options', slug: 'recipes/jest/calculate-shipping-options' },
            { label: 'Shipping eligibility', slug: 'recipes/jest/shipping-eligibility' },
            { label: 'Tax calculation by region', slug: 'recipes/jest/tax-calculation-by-region' },
            { label: 'API accepts JSON payload', slug: 'recipes/jest/api-accepts-json-payload' },
            { label: 'Post JSON payload (outline)', slug: 'recipes/jest/post-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/jest/import-xml-invoice' },
            { label: 'Import users + welcome email', slug: 'recipes/jest/import-users-welcome-email' },
            { label: 'Render markdown', slug: 'recipes/jest/render-markdown' },
            { label: 'Change email address', slug: 'recipes/jest/change-email-address' },
            { label: 'Change password', slug: 'recipes/jest/change-password' },
            { label: 'Eligible customer gets discount', slug: 'recipes/jest/eligible-customer-gets-discount' },
            { label: 'Ineligible customer no discount', slug: 'recipes/jest/ineligible-customer-no-discount' },
            { label: 'Two step checkout', slug: 'recipes/jest/two-step-checkout' },
            { label: 'Payment declined', slug: 'recipes/jest/payment-declined' },
            { label: 'Guest checkout allowed', slug: 'recipes/jest/guest-checkout-allowed' },
            { label: 'Logout clears session', slug: 'recipes/jest/logout-clears-session' },
            { label: 'Document status changes', slug: 'recipes/jest/document-status-changes' },
            { label: 'Update preferences', slug: 'recipes/jest/update-preferences' },
            { label: 'Configure feature flags', slug: 'recipes/jest/configure-feature-flags' },
            { label: 'Create order', slug: 'recipes/jest/create-order' },
            { label: 'Search results show highlights', slug: 'recipes/jest/search-results-show-highlights' },
            { label: 'Report shows fields in order', slug: 'recipes/jest/report-shows-fields-in-order' },
          ],
        },
        {
          label: 'Recipes (Playwright)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/playwright' },
            { label: 'User logs in successfully', slug: 'recipes/playwright/user-logs-in-successfully' },
            { label: 'User updates profile details', slug: 'recipes/playwright/user-updates-profile-details' },
            { label: 'Checkout calculates totals', slug: 'recipes/playwright/checkout-calculates-totals' },
            { label: 'Password reset flow', slug: 'recipes/playwright/password-reset-flow' },
            { label: 'Login blocked for suspended user', slug: 'recipes/playwright/login-blocked-suspended-user' },
            { label: 'Login works (tags)', slug: 'recipes/playwright/login-works' },
            { label: 'Login errors (outline)', slug: 'recipes/playwright/login-errors' },
            { label: 'Many login attempts (outline)', slug: 'recipes/playwright/many-login-attempts' },
            { label: 'Bulk user creation', slug: 'recipes/playwright/bulk-user-creation' },
            { label: 'Create users from table', slug: 'recipes/playwright/create-users-from-table' },
            { label: 'Calculate shipping options', slug: 'recipes/playwright/calculate-shipping-options' },
            { label: 'Shipping eligibility', slug: 'recipes/playwright/shipping-eligibility' },
            { label: 'Tax calculation by region', slug: 'recipes/playwright/tax-calculation-by-region' },
            { label: 'API accepts JSON payload', slug: 'recipes/playwright/api-accepts-json-payload' },
            { label: 'Post JSON payload (outline)', slug: 'recipes/playwright/post-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/playwright/import-xml-invoice' },
            { label: 'Import users + welcome email', slug: 'recipes/playwright/import-users-welcome-email' },
            { label: 'Render markdown', slug: 'recipes/playwright/render-markdown' },
            { label: 'Change email address', slug: 'recipes/playwright/change-email-address' },
            { label: 'Change password', slug: 'recipes/playwright/change-password' },
            { label: 'Eligible customer gets discount', slug: 'recipes/playwright/eligible-customer-gets-discount' },
            { label: 'Ineligible customer no discount', slug: 'recipes/playwright/ineligible-customer-no-discount' },
            { label: 'Two step checkout', slug: 'recipes/playwright/two-step-checkout' },
            { label: 'Payment declined', slug: 'recipes/playwright/payment-declined' },
            { label: 'Guest checkout allowed', slug: 'recipes/playwright/guest-checkout-allowed' },
            { label: 'Logout clears session', slug: 'recipes/playwright/logout-clears-session' },
            { label: 'Document status changes', slug: 'recipes/playwright/document-status-changes' },
            { label: 'Update preferences', slug: 'recipes/playwright/update-preferences' },
            { label: 'Configure feature flags', slug: 'recipes/playwright/configure-feature-flags' },
            { label: 'Create order', slug: 'recipes/playwright/create-order' },
            { label: 'Search results show highlights', slug: 'recipes/playwright/search-results-show-highlights' },
            { label: 'Report shows fields in order', slug: 'recipes/playwright/report-shows-fields-in-order' },
          ],
        },
        {
          label: 'Recipes (Cypress)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/cypress' },
            { label: 'User logs in successfully', slug: 'recipes/cypress/user-logs-in-successfully' },
            { label: 'User updates profile details', slug: 'recipes/cypress/user-updates-profile-details' },
            { label: 'Checkout calculates totals', slug: 'recipes/cypress/checkout-calculates-totals' },
            { label: 'Password reset flow', slug: 'recipes/cypress/password-reset-flow' },
            { label: 'Login blocked for suspended user', slug: 'recipes/cypress/login-blocked-suspended-user' },
            { label: 'Login works (tags)', slug: 'recipes/cypress/login-works' },
            { label: 'Login errors (outline)', slug: 'recipes/cypress/login-errors' },
            { label: 'Many login attempts (outline)', slug: 'recipes/cypress/many-login-attempts' },
            { label: 'Bulk user creation', slug: 'recipes/cypress/bulk-user-creation' },
            { label: 'Create users from table', slug: 'recipes/cypress/create-users-from-table' },
            { label: 'Calculate shipping options', slug: 'recipes/cypress/calculate-shipping-options' },
            { label: 'Shipping eligibility', slug: 'recipes/cypress/shipping-eligibility' },
            { label: 'Tax calculation by region', slug: 'recipes/cypress/tax-calculation-by-region' },
            { label: 'API accepts JSON payload', slug: 'recipes/cypress/api-accepts-json-payload' },
            { label: 'Post JSON payload (outline)', slug: 'recipes/cypress/post-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/cypress/import-xml-invoice' },
            { label: 'Import users + welcome email', slug: 'recipes/cypress/import-users-welcome-email' },
            { label: 'Render markdown', slug: 'recipes/cypress/render-markdown' },
            { label: 'Change email address', slug: 'recipes/cypress/change-email-address' },
            { label: 'Change password', slug: 'recipes/cypress/change-password' },
            { label: 'Eligible customer gets discount', slug: 'recipes/cypress/eligible-customer-gets-discount' },
            { label: 'Ineligible customer no discount', slug: 'recipes/cypress/ineligible-customer-no-discount' },
            { label: 'Two step checkout', slug: 'recipes/cypress/two-step-checkout' },
            { label: 'Payment declined', slug: 'recipes/cypress/payment-declined' },
            { label: 'Guest checkout allowed', slug: 'recipes/cypress/guest-checkout-allowed' },
            { label: 'Logout clears session', slug: 'recipes/cypress/logout-clears-session' },
            { label: 'Document status changes', slug: 'recipes/cypress/document-status-changes' },
            { label: 'Update preferences', slug: 'recipes/cypress/update-preferences' },
            { label: 'Configure feature flags', slug: 'recipes/cypress/configure-feature-flags' },
            { label: 'Create order', slug: 'recipes/cypress/create-order' },
            { label: 'Search results show highlights', slug: 'recipes/cypress/search-results-show-highlights' },
            { label: 'Report shows fields in order', slug: 'recipes/cypress/report-shows-fields-in-order' },
          ],
        },
        {
          label: 'Recipes (Go)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/go' },
            { label: 'User logs in successfully', slug: 'recipes/go/user-logs-in-successfully' },
            { label: 'Login works (tags)', slug: 'recipes/go/login-works' },
            { label: 'Login blocked for suspended user', slug: 'recipes/go/login-blocked-suspended-user' },
            { label: 'Checkout calculates totals', slug: 'recipes/go/checkout-calculates-totals' },
            { label: 'Bulk user creation', slug: 'recipes/go/bulk-user-creation' },
            { label: 'API accepts JSON payload', slug: 'recipes/go/api-accepts-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/go/import-xml-invoice' },
            { label: 'Create order', slug: 'recipes/go/create-order' },
          ],
        },
        {
          label: 'Recipes (pytest)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/pytest' },
            { label: 'User logs in successfully', slug: 'recipes/pytest/user-logs-in-successfully' },
            { label: 'Login works (tags)', slug: 'recipes/pytest/login-works' },
            { label: 'Login blocked for suspended user', slug: 'recipes/pytest/login-blocked-suspended-user' },
            { label: 'Checkout calculates totals', slug: 'recipes/pytest/checkout-calculates-totals' },
            { label: 'Bulk user creation', slug: 'recipes/pytest/bulk-user-creation' },
            { label: 'API accepts JSON payload', slug: 'recipes/pytest/api-accepts-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/pytest/import-xml-invoice' },
            { label: 'Create order', slug: 'recipes/pytest/create-order' },
          ],
        },
        {
          label: 'Recipes (Rust)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/rust' },
            { label: 'User logs in successfully', slug: 'recipes/rust/user-logs-in-successfully' },
            { label: 'Login works (tags)', slug: 'recipes/rust/login-works' },
            { label: 'Login blocked for suspended user', slug: 'recipes/rust/login-blocked-suspended-user' },
            { label: 'Checkout calculates totals', slug: 'recipes/rust/checkout-calculates-totals' },
            { label: 'Bulk user creation', slug: 'recipes/rust/bulk-user-creation' },
            { label: 'API accepts JSON payload', slug: 'recipes/rust/api-accepts-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/rust/import-xml-invoice' },
            { label: 'Create order', slug: 'recipes/rust/create-order' },
          ],
        },
        {
          label: 'Recipes (JUnit 5)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/junit5' },
            { label: 'User logs in successfully', slug: 'recipes/junit5/user-logs-in-successfully' },
            { label: 'Login works (tags)', slug: 'recipes/junit5/login-works' },
            { label: 'Login blocked for suspended user', slug: 'recipes/junit5/login-blocked-suspended-user' },
            { label: 'Checkout calculates totals', slug: 'recipes/junit5/checkout-calculates-totals' },
            { label: 'Bulk user creation', slug: 'recipes/junit5/bulk-user-creation' },
            { label: 'API accepts JSON payload', slug: 'recipes/junit5/api-accepts-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/junit5/import-xml-invoice' },
            { label: 'Create order', slug: 'recipes/junit5/create-order' },
          ],
        },
        {
          label: 'Recipes (xUnit)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'recipes/xunit' },
            { label: 'User logs in successfully', slug: 'recipes/xunit/user-logs-in-successfully' },
            { label: 'Login works (tags)', slug: 'recipes/xunit/login-works' },
            { label: 'Login blocked for suspended user', slug: 'recipes/xunit/login-blocked-suspended-user' },
            { label: 'Checkout calculates totals', slug: 'recipes/xunit/checkout-calculates-totals' },
            { label: 'Bulk user creation', slug: 'recipes/xunit/bulk-user-creation' },
            { label: 'API accepts JSON payload', slug: 'recipes/xunit/api-accepts-json-payload' },
            { label: 'Import XML invoice', slug: 'recipes/xunit/import-xml-invoice' },
            { label: 'Create order', slug: 'recipes/xunit/create-order' },
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
