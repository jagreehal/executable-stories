/**
 * /llms.txt — an llms.txt-format (https://llmstxt.org) index of every scenario,
 * linking each one's Markdown twin at `<routeBase>/<slug>.md`. Injected by the
 * integration (agentEndpoints, default on) so the deployed docs site is a
 * first-class agent surface, not just a browser one. A project-defined
 * /llms.txt takes priority over this injected route.
 */
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { storyEntries, storiesLlmsTxt } from "executable-stories-astro";
import { collection, routeBase } from "virtual:executable-stories/config";

export const GET: APIRoute = async () => {
  const stories = storyEntries(await getCollection(collection));
  return new Response(storiesLlmsTxt(stories, { routeBase }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
