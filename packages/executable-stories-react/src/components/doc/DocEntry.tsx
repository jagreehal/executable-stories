import type { ReportDocEntry } from "executable-stories-core";
import { DocNote } from "./DocNote";
import { DocTag } from "./DocTag";
import { DocKv } from "./DocKv";
import { DocCode } from "./DocCode";
import { DocTable } from "./DocTable";
import { DocLink } from "./DocLink";
import { DocSection } from "./DocSection";
import { DocMermaid } from "./DocMermaid";
import { DocScreenshot } from "./DocScreenshot";
import { DocVideo } from "./DocVideo";
import { DocHtml } from "./DocHtml";
import { DocState } from "./DocState";
import { DocCustom } from "./DocCustom";

export function DocEntry({ entry }: { entry: ReportDocEntry }) {
  switch (entry.kind) {
    case "note":
      return <DocNote entry={entry} />;
    case "tag":
      return <DocTag entry={entry} />;
    case "kv":
      return <DocKv entry={entry} />;
    case "code":
      return <DocCode entry={entry} />;
    case "table":
      return <DocTable entry={entry} />;
    case "link":
      return <DocLink entry={entry} />;
    case "section":
      return <DocSection entry={entry} />;
    case "mermaid":
      return <DocMermaid entry={entry} />;
    case "screenshot":
      return <DocScreenshot entry={entry} />;
    case "video":
      return <DocVideo entry={entry} />;
    case "html":
      return <DocHtml entry={entry} />;
    case "state":
      return <DocState entry={entry} />;
    case "custom":
      return <DocCustom entry={entry} />;
  }
}
