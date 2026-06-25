// @ts-check
import starlight from '@astrojs/starlight';
import astroMermaid from 'astro-mermaid';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    astroMermaid(),
    starlight({
      title: 'Product Demo',
      description: 'Generated demo site from executable stories.',
      sidebar: [
        { label: 'Home', slug: 'index' },
        {
          // Starlight v0.39+ requires autogenerate to live inside `items`.
          label: 'Stories',
          items: [{ autogenerate: { directory: 'stories' } }],
        },
        { label: 'Themes', slug: 'themes' },
      ],
      customCss: [
        './src/styles/global.css',
        './src/styles/themes/default.css',
      ],
    }),
  ],
});
