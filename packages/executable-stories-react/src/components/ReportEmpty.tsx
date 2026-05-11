export interface ReportEmptyProps {
  message?: string;
}

export function ReportEmpty({ message }: ReportEmptyProps) {
  return (
    <section className="es-empty" aria-live="polite">
      <p>{message ?? "No scenarios in this report."}</p>
    </section>
  );
}
