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
  // H1, rewrites relative `*.md` cross-links to their routes, and (because the
  // shared config is passed as `explainers`) injects a fresh/stale banner into
  // any doc carrying an `explainer` provenance block (explain-change skill) —
  // with deep links to the cited scenarios' story pages.
  docs: defineCollection({
    loader: authoredDocsLoader({ path: 'src/content/docs', explainers: esConfig }),
    schema: docsSchema({
      extend: z.object({
        verifiedBy: z.union([z.string(), z.array(z.string())]).optional(),
        // Explainer provenance block — kept loose here (zod would otherwise
        // strip it); `executable-stories check-explainers` validates strictly.
        explainer: z.record(z.unknown()).optional(),
      }),
    }),
  }),
  // Generated scenarios (executable-stories) — in-memory, never written to disk.
  stories: defineCollection({ loader: storiesLoader(esConfig) }),
  // Session trajectory ("passed N → M since you started"). Render with the
  // shipped <Trajectory /> component (executable-stories-astro/components/Trajectory.astro).
  trajectory: defineCollection({ loader: trajectoryLoader(esConfig) }),
};
