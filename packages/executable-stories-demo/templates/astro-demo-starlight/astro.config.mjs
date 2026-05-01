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
          label: 'Stories',
          autogenerate: { directory: 'stories' },
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
