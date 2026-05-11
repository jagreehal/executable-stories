import type { ReportDocTable } from "executable-stories-formatters";

export function DocTable({ entry }: { entry: ReportDocTable }) {
  return (
    <figure className="es-doc es-doc-table">
      <figcaption>{entry.label}</figcaption>
      <table>
        <thead>
          <tr>
            {entry.columns.map((c) => (
              <th key={c} scope="col">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entry.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
