import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { MermaidView, type MermaidApi } from "../src/components/doc/MermaidView";
import type { ReportDocMermaid } from "executable-stories-core";

const entry: ReportDocMermaid = {
  kind: "mermaid",
  code: "graph TD; A-->B;",
  phase: "given",
};

/** Just the surface MermaidView calls; the real library is CDN-loaded. */
function fakeMermaid(over: Partial<MermaidApi>): MermaidApi {
  return {
    initialize: () => {},
    parse: async () => true,
    render: async () => ({ svg: "<svg data-fake></svg>" }),
    ...over,
  } as unknown as MermaidApi;
}

describe("<MermaidView> failures", () => {
  it("names the syntax error instead of silently showing source", async () => {
    const mermaid = fakeMermaid({
      parse: async () => {
        throw new Error("Parse error on line 2: unexpected token");
      },
    });
    render(<MermaidView entry={entry} load={async () => mermaid} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Parse error on line 2");
    // The readable source stays put underneath.
    expect(screen.getByText(entry.code)).toBeInTheDocument();
  });

  it("reports a render failure that parse did not catch", async () => {
    const mermaid = fakeMermaid({
      render: async () => {
        throw new Error("Cannot read properties of undefined");
      },
    });
    render(<MermaidView entry={entry} load={async () => mermaid} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot read properties of undefined",
    );
  });

  it("stays quiet when the library itself never loads", async () => {
    render(
      <MermaidView
        entry={entry}
        load={async () => {
          throw new Error("Failed to fetch");
        }}
      />,
    );

    // Offline or a blocked CDN is not the author's fault: no error, just source.
    await waitFor(() => expect(screen.getByText(entry.code)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("draws the diagram when the code is valid", async () => {
    const { container } = render(
      <MermaidView entry={entry} load={async () => fakeMermaid({})} />,
    );

    await waitFor(() => expect(container.querySelector("svg[data-fake]")).not.toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
