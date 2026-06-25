// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { executableStories, storiesSidebar } from 'executable-stories-astro';
import esConfig from './executable-stories.config.mjs';

// The story pages render the React report components from
// executable-stories-react (the SAME components the standalone single-file HTML
// report uses), so a React renderer must be registered. executable-stories-astro
// can't auto-add it on Astro 7 — wire `react()` here, before the integration.

// Run your tests in watch mode in one terminal and `astro dev` in another —
// editing tests hot-reloads the Stories pages here. Nothing is written to disk;
// tests stay the source of truth.
export default defineConfig({
  // Set this to your deployed URL to enable canonical links + the sitemap
  // Starlight ships (otherwise `astro build` prints a harmless sitemap notice).
  // site: 'https://docs.example.com',
  vite: {
    // The Stories page is a `client:load` React island. Pre-bundle React and the
    // report component subtree in ONE optimize pass at startup so Astro's dev
    // server never re-optimizes them mid-render when the island first hydrates.
    // That mid-render re-optimize otherwise drops `react-dom/client`'s
    // `createRoot` export and 504s the page ("Outdated Optimize Dep"), leaving
    // the island unhydrated and the page rendered as unstyled SSR fallback.
    // If you add your OWN React islands, add their heavy deps to `include` too.
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'executable-stories-react',
        'executable-stories-react/interactive',
      ],
      noDiscovery: true,
    },
    // Keep a single React copy so hooks/context work across the island boundary.
    resolve: { dedupe: ['react', 'react-dom'] },
  },
  integrations: [
    // React renderer for the report islands — must come before executableStories.
    react(),
    // Mermaid diagrams are rendered by a small inline loader on
    // `pre[data-mermaid]`. Don't add astro-mermaid — both would process the same
    // element and double-render.
    executableStories(esConfig),
    starlight({
      title: 'Story Docs',
      description: 'Living documentation generated from executable stories.',
      customCss: ['./src/styles/stories.css'],
      // Nav is built straight from the config (Stories + Explorer, plus a group
      // per `docs` source). Edit the array to taste.
      sidebar: [
        { label: 'Home', slug: 'index' },
        ...storiesSidebar(esConfig),
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
      ],
    }),
  ],
});
