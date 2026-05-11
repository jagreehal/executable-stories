import type { ReportFeature } from "executable-stories-formatters";
import { ReportScenario } from "./ReportScenario";

export interface ReportScenarioListProps {
  feature: ReportFeature;
}

export function ReportScenarioList({ feature }: ReportScenarioListProps) {
  return (
    <>
      {feature.scenarios.map((scenario) => (
        <ReportScenario key={scenario.id} scenario={scenario} />
      ))}
    </>
  );
}
