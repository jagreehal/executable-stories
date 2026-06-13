import { defineCollection } from 'astro:content';
import { z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    // `verifiedBy` links a page to the stories that prove it is still true.
    // The PageTitle override renders a live verification badge from it.
    schema: docsSchema({
      extend: z.object({
        verifiedBy: z.union([z.string(), z.array(z.string())]).optional(),
        scenarioId: z.string().optional(),
      }),
    }),
  }),
};
