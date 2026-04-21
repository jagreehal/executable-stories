// @ts-check
import starlight from '@astrojs/starlight';
import astroMermaid from 'astro-mermaid';
import { defineConfig } from 'astro/config';

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