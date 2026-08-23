import type { ReportFeature } from "executable-stories-core";
import { dedent, safeMarkdownHtml } from "../lib/markdown";

export interface ReportFeatureIntroProps {
  feature: ReportFeature;
}

/**
 * What the feature is for, ahead of the scenarios that prove it.
 *
 * Scenarios answer "what does it do". A reader arriving cold needs "why does
 * this exist and who is it for" first, which is what `story.feature(...)`
 * records. Renders nothing when a file never declared one, so existing reports
 * look exactly as they did.
 */
export function ReportFeatureIntro({ feature }: ReportFeatureIntroProps) {
  const hasNarrative = Boolean(feature.narrative?.trim());
  const hasGlossary = Boolean(feature.glossary?.length);
  if (!hasNarrative && !hasGlossary) return null;

  return (
    <div className="flex flex-col gap-3 border-l-2 border-border pl-4 text-sm">
      {hasNarrative ? (
        <div
          className="es-doc-prose prose prose-sm max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: safeMarkdownHtml(dedent(feature.narrative!)) }}
        />
      ) : null}

      {hasGlossary ? (
        <dl className="grid gap-1.5" aria-label="Glossary">
          {feature.glossary!.map((entry) => (
            <div key={entry.term} className="flex flex-wrap gap-x-2 text-xs">
              <dt className="font-medium text-foreground">{entry.term}</dt>
              <dd className="flex-1 text-muted-foreground">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/**
 * Label the feature the way it was declared.
 *
 * An ability reads as something a person can now do; a business need covers the
 * cross-cutting concerns nobody asks for by name, like security or performance.
 * Naming the kind keeps that distinction visible to a reader who never sees the
 * test code. A derived title gets no badge, since nobody claimed anything.
 */
export function featureKindLabel(kind: ReportFeature["kind"]): string | null {
  if (kind === "ability") return "Ability";
  if (kind === "business-need") return "Business need";
  if (kind === "feature") return "Feature";
  return null;
}
