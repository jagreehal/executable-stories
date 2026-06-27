import type { ReportDocTag } from "executable-stories-core";
import { Badge } from "@/components/ui/badge";

export function DocTag({ entry }: { entry: ReportDocTag }) {
  return (
    <ul className="my-2 flex flex-wrap gap-1.5" aria-label="Tags">
      {entry.names.map((n) => (
        <li key={n}>
          <Badge variant="tag">{n}</Badge>
        </li>
      ))}
    </ul>
  );
}
