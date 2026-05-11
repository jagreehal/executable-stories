import { useReport } from "../hooks/useReport";
import { ReportFeature } from "./ReportFeature";

export function ReportFeatureList() {
  const report = useReport();
  return (
    <>
      {report.features.map((feature) => (
        <ReportFeature key={feature.id} feature={feature} />
      ))}
    </>
  );
}
