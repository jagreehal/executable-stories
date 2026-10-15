/**
 * Slugify a string for Cucumber JSON IDs.
 *
 * Converts to lowercase, replaces path separators/spaces with hyphens,
 * removes other special chars, and trims leading/trailing hyphens.
 *
 * @param text - The text to slugify
 * @returns A URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[/\\]+/g, "-") // Convert path separators to hyphens
    .replace(/[^\w\s-]/g, "") // Remove other special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * The file name every artifact of a scenario uses (`gif`, `video`, their
 * manifests): its slugified title, or "scenario" when nothing is left.
 * An apostrophe is dropped, not split: "an artist's" → "an-artists".
 */
export function scenarioSlug(title: string): string {
  return slugify(title) || "scenario";
}
