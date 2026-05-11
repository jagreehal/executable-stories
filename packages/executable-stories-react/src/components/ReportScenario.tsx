import type { ReportScenario as ReportScenarioT } from "executable-stories-formatters";
import { ReportSteps } from "./ReportSteps";
import { ReportDocEntries } from "./ReportDocEntries";

export interface ReportScenarioProps {
  scenario: ReportScenarioT;
}

const STATUS_LABEL: Record<ReportScenarioT["status"], string> = {
  passed: "Passed",
  failed: "Failed",
  skipped: "Skipped",
  pending: "Pending",
};

export function ReportScenario({ scenario }: ReportScenarioProps) {
  const titleId = `${scenario.id}-title`;
  return (
    <article
      id={scenario.id}
      className={`es-scenario es-status-${scenario.status}`}
      aria-labelledby={titleId}
      data-status={scenario.status}
    >
      <h3 id={titleId} className="es-scenario-title">
        <span>{scenario.title}</span>
        <span className="es-scenario-status" aria-label={`Status: ${STATUS_LABEL[scenario.status]}`}>
          {STATUS_LABEL[scenario.status]}
        </span>
      </h3>
      {scenario.tags.length > 0 ? (
        <ul className="es-tags" aria-label="Tags">
          {scenario.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
      {scenario.errorMessage ? (
        <pre className="es-scenario-error" role="alert">{scenario.errorMessage}</pre>
      ) : null}
      {scenario.docEntries.length > 0 ? (
        <div className="es-scenario-docs">
          <ReportDocEntries entries={scenario.docEntries} />
        </div>
      ) : null}
      <ReportSteps scenario={scenario} />
    </article>
  );
}
