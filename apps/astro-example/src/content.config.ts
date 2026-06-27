import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import {
  storiesLoader,
  trajectoryLoader,
  authoredDocsLoader,
} from 'executable-stories-astro';
import esConfig from '../executable-stories.config.mjs';

export const collections = {
  // Hand-authored docs. `authoredDocsLoader` is a drop-in for Starlight's
  // docsLoader that ALSO: auto-titles frontmatter-free markdown from its first
  // H1, and rewrites relative `*.md` cross-links to their routes — so you can
  // drop in plain GitHub-style docs without edits.
  docs: defineCollection({
    loader: authoredDocsLoader({ path: 'src/content/docs' }),
    schema: docsSchema({
      extend: z.object({ verifiedBy: z.union([z.string(), z.array(z.string())]).optional() }),
    }),
  }),
  // Generated scenarios (executable-stories) — in-memory, never written to disk.
  stories: defineCollection({ loader: storiesLoader(esConfig) }),
  // Session trajectory ("passed N → M since you started"). Render with the
  // shipped <Trajectory /> component (executable-stories-astro/components/Trajectory.astro).
  trajectory: defineCollection({ loader: trajectoryLoader(esConfig) }),
};
