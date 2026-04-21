// @ts-check
import starlight from '@astrojs/starlight';
import astroMermaid from 'astro-mermaid';
import { defineConfig } from 'astro/config';

/*
 * Available themes (match HTML formatter themes):
 *   default    — cucumber green, IBM Plex typography
 *   corporate  — navy, Playfair Display serif headings
 *   terminal   — green-on-dark, JetBrains Mono, flat
 *   minimal    — teal, Noto Serif Display headings, warm neutrals
 *   dashboard  — blue, DM Sans + JetBrains Mono
 *   playful    — coral, rounded corners, Source Sans 3
 *
 * To switch themes, replace `themes/default.css` below with the filename
 * of the theme you want (e.g. `./src/styles/themes/corporate.css`).
 */

export default defineConfig({
  integrations: [
    astroMermaid(),
    starlight({
      title: 'Story Docs',
      description: 'Living documentation generated from executable stories.',
      sidebar: [
        { label: 'Home', slug: 'index' },
        {
          label: 'Stories',
          autogenerate: { directory: 'stories' },
        },
      ],
      customCss: [
        './src/styles/global.css',
        './src/styles/themes/default.css',
      ],
    }),
  ],
});
