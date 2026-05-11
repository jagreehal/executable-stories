import type { ReportFeature as ReportFeatureT } from "executable-stories-formatters";
import { ReportScenarioList } from "./ReportScenarioList";
import { ReportSummaryView } from "./ReportSummary";

export interface ReportFeatureProps {
  feature: ReportFeatureT;
}

export function ReportFeature({ feature }: ReportFeatureProps) {
  const titleId = `${feature.id}-title`;
  return (
    <section
      id={feature.id}
      className="es-feature"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="es-feature-title">{feature.title}</h2>
      <p className="es-feature-source">{feature.sourceFile}</p>
      <ReportSummaryView summary={feature.summary} className="es-feature-summary" />
      <ReportScenarioList feature={feature} />
    </section>
  );
}
