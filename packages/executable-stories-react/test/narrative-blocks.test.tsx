import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import {
  DataModelBlock,
  FileTreeBlock,
  parseDataModel,
  parseFileTree,
} from "../src/components/doc/NarrativeBlocks";
import type { ReportDocCustom } from "executable-stories-core";

const custom = (type: string, data: unknown): ReportDocCustom => ({
  kind: "custom",
  type,
  data,
  phase: "runtime",
});

describe("file-tree block", () => {
  it("nests flat paths into directories", () => {
    render(
      <FileTreeBlock
        entry={custom("file-tree", {
          files: [
            { path: "src/lib/hash-state.ts", change: "added" },
            { path: "src/lib/scroll.ts", change: "modified" },
            "README.md",
          ],
        })}
      />,
    );

    // Each path segment appears once, directories marked with a trailing slash.
    expect(screen.getByText("src/")).toBeInTheDocument();
    expect(screen.getByText("lib/")).toBeInTheDocument();
    expect(screen.getByText("hash-state.ts")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("added")).toBeInTheDocument();
    expect(screen.getByText("modified")).toBeInTheDocument();
  });

  it("shows the raw data when the shape is wrong", () => {
    render(<FileTreeBlock entry={custom("file-tree", { nope: true })} />);
    expect(screen.getByText(/unrecognised shape/)).toBeInTheDocument();
    expect(screen.getByText(/"nope": true/)).toBeInTheDocument();
  });

  it("drops entries with no path rather than rendering blanks", () => {
    const parsed = parseFileTree({ files: [{ change: "added" }, { path: "a.ts" }] });
    expect(parsed?.files).toEqual([{ path: "a.ts", change: undefined, note: undefined }]);
  });

  it("ignores a change value it does not understand", () => {
    const parsed = parseFileTree({ files: [{ path: "a.ts", change: "exploded" }] });
    expect(parsed?.files[0].change).toBeUndefined();
  });
});

describe("data-model block", () => {
  it("renders fields as a table", () => {
    render(
      <DataModelBlock
        entry={custom("data-model", {
          name: "Order",
          fields: [
            { name: "id", type: "string" },
            { name: "total", type: "number", note: "in minor units", change: "added" },
          ],
        })}
      />,
    );

    expect(screen.getByText("Order")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("total")).toBeInTheDocument();
    expect(within(table).getByText("in minor units")).toBeInTheDocument();
    expect(within(table).getByText("added")).toBeInTheDocument();
  });

  it("omits the note column when no field has one", () => {
    render(
      <DataModelBlock
        entry={custom("data-model", { fields: [{ name: "id", type: "string" }] })}
      />,
    );
    expect(screen.queryByRole("columnheader", { name: "Note" })).toBeNull();
  });

  it("needs at least one named field", () => {
    expect(parseDataModel({ fields: [] })).toBeUndefined();
    expect(parseDataModel({ fields: [{ type: "string" }] })).toBeUndefined();
  });
});

describe("provenance", () => {
  it("marks a block an agent wrote", () => {
    render(
      <FileTreeBlock
        entry={custom("file-tree", { authored: "agent", files: ["a.ts"] })}
      />,
    );
    expect(screen.getByText(/AI-authored, not verified by a run/)).toBeInTheDocument();
  });

  it("says nothing when authorship was not declared", () => {
    render(<FileTreeBlock entry={custom("file-tree", { files: ["a.ts"] })} />);
    expect(screen.queryByText(/AI-authored/)).toBeNull();
  });
});
