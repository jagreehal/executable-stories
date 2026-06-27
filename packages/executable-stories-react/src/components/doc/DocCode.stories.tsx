import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocCode, CodeFigure } from "./DocCode";
import type { ReportDocCode } from "executable-stories-core";

const meta: Meta<typeof DocCode> = {
  title: "Doc/DocCode",
  component: DocCode,
};
export default meta;

type Story = StoryObj<typeof DocCode>;

function code(over: Partial<ReportDocCode> = {}): ReportDocCode {
  return {
    kind: "code",
    phase: "static",
    label: "Pricing call",
    lang: "ts",
    content: "const total = applyDiscount(cart, { loyalty: 0.45 });",
    ...over,
  };
}

export const TypeScript: Story = {
  args: { entry: code() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pricing call")).toBeVisible();
    await expect(canvas.getByText(/applyDiscount/)).toBeVisible();
  },
};

export const Json: Story = {
  args: {
    entry: code({
      label: "Gateway response",
      lang: "json",
      content: '{\n  "code": "declined",\n  "retriable": false\n}',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Gateway response")).toBeVisible();
    await expect(canvas.getByText(/"declined"/)).toBeVisible();
  },
};

export const Bash: Story = {
  args: {
    entry: code({
      label: "Run the suite",
      lang: "bash",
      content: "pnpm test\nexecutable-stories format reports/raw-run.json --format html",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/pnpm test/)).toBeVisible();
  },
};

// `label` is required on the type, but an empty string renders no figcaption —
// the same shape adapters emit for an unlabelled `story.code({ content })`.
export const WithoutLabel: Story = {
  args: { entry: code({ label: "" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/applyDiscount/)).toBeVisible();
  },
};

export const LongContentScrolls: Story = {
  args: {
    entry: code({
      label: "A wide, multi-line snippet",
      lang: "ts",
      content: Array.from(
        { length: 12 },
        (_, i) =>
          `const veryLongVariableName_${i} = computeSomethingWithAFairlyLongCallSignature(${i}, "padding-padding-padding");`,
      ).join("\n"),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/veryLongVariableName_0/)).toBeVisible();
  },
};

/** The shared shell `DocCode` (and the CDN-highlighted island) both render into. */
export const FigureShell: StoryObj<typeof CodeFigure> = {
  render: () => (
    <CodeFigure label="A raw CodeFigure">
      <code className="font-mono text-xs">echo "rendered straight into the shell"</code>
    </CodeFigure>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("A raw CodeFigure")).toBeVisible();
    await expect(canvas.getByText(/rendered straight into the shell/)).toBeVisible();
  },
};
