import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseStoryReport } from "executable-stories-react/parse";
import { ReportInteractive } from "executable-stories-react/interactive";
import { ExampleNav } from "../../components/ExampleNav";

async function loadReport() {
  const path = join(process.cwd(), "public", "story-report.json");
  const raw = await readFile(path, "utf8");
  const json = JSON.parse(raw);
  return parseStoryReport(json);
}

export default async function InteractivePage() {
  const result = await loadReport();
  return (
    <>
      <ExampleNav />
      <ReportInteractive report={result} title="Story Report (interactive)" />
    </>
  );
}
