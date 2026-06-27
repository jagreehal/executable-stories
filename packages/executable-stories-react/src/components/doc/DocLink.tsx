import type { ReportDocLink } from "executable-stories-core";

export function DocLink({ entry }: { entry: ReportDocLink }) {
  return (
    <a
      className="text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
      href={entry.url}
      rel="noreferrer noopener"
      target="_blank"
    >
      {entry.label}
    </a>
  );
}
