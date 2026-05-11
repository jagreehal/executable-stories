import type { ReportParseError } from "../result";

export interface ReportSchemaErrorProps {
  error: ReportParseError;
}

export function ReportSchemaError({ error }: ReportSchemaErrorProps) {
  return (
    <section className="es-schema-error" role="alert" aria-live="assertive">
      <p>
        <strong>Report could not be displayed.</strong>
      </p>
      <p>{error.message}</p>
      {error.code === "SCHEMA_VERSION_MISMATCH" ? (
        <p>
          The report bundle is newer than this version of <code>executable-stories-react</code>.
          Upgrade the package, or regenerate the report with an older formatters CLI.
        </p>
      ) : null}
      {error.issues && error.issues.length > 0 ? (
        <details>
          <summary>{error.issues.length} validation issue{error.issues.length === 1 ? "" : "s"}</summary>
          <pre>
            {error.issues
              .slice(0, 20)
              .map((i) => `${i.path}: ${i.message}`)
              .join("\n")}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
