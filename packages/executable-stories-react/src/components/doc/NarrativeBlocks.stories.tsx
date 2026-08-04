import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DataModelBlock, FileTreeBlock } from "./NarrativeBlocks";

const meta: Meta<typeof FileTreeBlock> = {
  title: "Doc/NarrativeBlocks",
  component: FileTreeBlock,
};
export default meta;

type FileTreeStory = StoryObj<typeof FileTreeBlock>;
type DataModelStory = StoryObj<typeof DataModelBlock>;

// The shape of a change: which files moved, and how. Directories are derived
// from the paths, so an author only supplies a flat list.
export const FileTree: FileTreeStory = {
  args: {
    entry: {
      kind: "custom",
      phase: "static",
      type: "file-tree",
      data: {
        title: "Files changed",
        files: [
          { path: "src/lib/hash-state.ts", change: "added", note: "URL codec" },
          { path: "src/lib/scroll.ts", change: "modified" },
          { path: "src/interactive/use-url-state.ts", change: "added" },
          { path: "docs/reference.md", change: "modified" },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("lib/")).toBeVisible();
    await expect(canvas.getByText("hash-state.ts")).toBeVisible();
  },
};

// Written by an agent from a diff, so it carries the marker: nothing here ran.
export const AuthoredByAgent: FileTreeStory = {
  args: {
    entry: {
      kind: "custom",
      phase: "static",
      type: "file-tree",
      data: {
        authored: "agent",
        files: [{ path: "src/checkout/total.ts", change: "modified" }],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/AI-authored, not verified by a run/)).toBeVisible();
  },
};

export const Unreadable: FileTreeStory = {
  args: {
    entry: { kind: "custom", phase: "static", type: "file-tree", data: { files: "nope" } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/unrecognised shape/)).toBeVisible();
  },
};

export const DataModel: DataModelStory = {
  render: (args) => <DataModelBlock {...args} />,
  args: {
    entry: {
      kind: "custom",
      phase: "static",
      type: "data-model",
      data: {
        name: "Order",
        fields: [
          { name: "id", type: "string" },
          { name: "currency", type: "string", change: "added", note: "ISO 4217" },
          { name: "totalPence", type: "number", change: "renamed", note: "was total" },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Order")).toBeVisible();
    await expect(canvas.getByText("ISO 4217")).toBeVisible();
  },
};
