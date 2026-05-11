import type { ReportStep, ReportScenario } from "executable-stories-formatters";
import { ReportDocEntries } from "./ReportDocEntries";

export interface ReportStepsProps {
  scenario: ReportScenario;
}

export function ReportSteps({ scenario }: ReportStepsProps) {
  if (scenario.steps.length === 0) return null;
  return (
    <ol className="es-steps">
      {scenario.steps.map((step) => (
        <ReportStepItem key={step.id} step={step} />
      ))}
    </ol>
  );
}

export function ReportStepItem({ step }: { step: ReportStep }) {
  return (
    <li
      id={step.id}
      className={`es-step es-step-${step.status}`}
      data-status={step.status}
    >
      <span className="es-step-keyword">{step.keyword}</span>
      <span className="es-step-text">{step.text}</span>
      {step.errorMessage ? (
        <pre className="es-scenario-error" role="alert">{step.errorMessage}</pre>
      ) : null}
      {step.docEntries.length > 0 ? (
        <div className="es-step-docs">
          <ReportDocEntries entries={step.docEntries} />
        </div>
      ) : null}
    </li>
  );
}
