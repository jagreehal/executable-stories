import type { ReportDocTag } from "executable-stories-core";
import { Badge } from "@/components/ui/badge";

export function DocTag({ entry }: { entry: ReportDocTag }) {
  return (
    <ul className="my-2 flex flex-wrap gap-1.5" aria-label="Tags">
      {entry.names.map((n) => (
        <li key={n} className="max-w-full">
          <Badge variant="tag" title={n} className="block truncate">{n}</Badge>
        </li>
      ))}
    </ul>
  );
}
