import type { ReportDocTable } from "executable-stories-core";

export function DocTable({ entry }: { entry: ReportDocTable }) {
  return (
    <figure className="my-3">
      {entry.label ? (
        <figcaption className="mb-1.5 text-xs font-medium text-muted-foreground">
          {entry.label}
        </figcaption>
      ) : null}
      <div tabIndex={0} className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              {entry.columns.map((c) => (
                <th key={c} scope="col" className="border-b border-border px-3 py-2 text-left font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entry.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border-b border-border px-3 py-2 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
