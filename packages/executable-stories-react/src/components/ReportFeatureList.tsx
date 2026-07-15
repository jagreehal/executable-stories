import { useReport } from "../hooks/useReport";
import { ReportFeature } from "./ReportFeature";

export function ReportFeatureList() {
  const report = useReport();
  // Roomy gap between features — they're now divider-led sections rather than
  // self-contained cards, so they need clear air to read as separate suites.
  return (
    <div className="flex flex-col gap-8">
      {report.features.map((feature) => (
        <ReportFeature key={feature.id} feature={feature} />
      ))}
    </div>
  );
}
