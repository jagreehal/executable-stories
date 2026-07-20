/**
 * Markdown twin of the story-detail page, injected at `<routeBase>/<slug>.md`
 * (linked from /llms.txt). Gives every published scenario a curl/LLM-friendly
 * plain-text form, rendered from the SAME collection entry as the HTML page so
 * the two can't drift. Static output prerenders these as real `.md` files.
 */
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { storyEntries, scenarioToMarkdown } from "executable-stories-astro";
import type { StoryEntryData } from "executable-stories-astro";
import { collection } from "virtual:executable-stories/config";

export async function getStaticPaths() {
  const stories = storyEntries(await getCollection(collection));
  return stories.map((s: StoryEntryData) => ({
    params: { slug: s.slug },
    props: { story: s },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const story = props.story as StoryEntryData;
  return new Response(scenarioToMarkdown(story), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
