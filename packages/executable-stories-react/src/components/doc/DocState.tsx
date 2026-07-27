import type { ReportDocState } from "executable-stories-core";
import { CodeFigure } from "./DocCode";

/**
 * A `story.state()` snapshot in the step detail: label + pretty JSON, same
 * chrome as `code(json)`. Frame-to-frame diffs are the storyboard's job —
 * here the entry just shows what was captured at this step.
 */
export function DocState({ entry }: { entry: ReportDocState }) {
  let json: string;
  try {
    json = JSON.stringify(entry.value, null, 2) ?? String(entry.value);
  } catch {
    json = String(entry.value);
  }
  return (
    <CodeFigure label={entry.label ?? "State"}>
      <code className="font-mono text-xs language-json">{json}</code>
    </CodeFigure>
  );
}
