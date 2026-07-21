/**
 * Sentence-case a slug for a derived display label: "guest-checkout" →
 * "Guest checkout". The one canonical helper behind every tag-derived label
 * (journeys, UI states, persona views) so they can't drift apart.
 */
export function humanizeSlug(slug: string): string {
  const words = slug.split(/[_-]+/).filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
