"use client";

import { useEffect, useRef } from "react";
import { Button } from "../components/ui/button";

export interface ReportShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

// Kept in lockstep with the bindings in use-keyboard-shortcuts.ts — every key it
// handles is listed here so the help never lies about what's available.
const SHORTCUTS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: "/", description: "Focus search" },
  { keys: "f", description: "Jump to next failure" },
  { keys: "Shift F", description: "Jump to previous failure" },
  { keys: "e", description: "Expand all" },
  { keys: "c", description: "Collapse all" },
  { keys: "?", description: "Toggle this help" },
  { keys: "Esc", description: "Clear search / close" },
];

function Keys({ keys }: { keys: string }) {
  // Split combos ("Shift F") into one chip per key with a "+" between.
  const parts = keys.split(" ");
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((k, i) => (
        <span key={k} className="inline-flex items-center gap-1">
          {i > 0 ? <span className="text-xs text-muted-foreground">+</span> : null}
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
            {k}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function ReportShortcutsHelp({ open, onClose }: ReportShortcutsHelpProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="es-shortcuts-help m-auto w-[min(90vw,28rem)] rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg [overscroll-behavior:contain] backdrop:bg-black/40"
      aria-label="Keyboard shortcuts"
      onClose={onClose}
    >
      <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
      <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="col-span-2 grid grid-cols-subgrid items-center">
            <dt className="justify-self-start">
              <Keys keys={s.keys} />
            </dt>
            <dd className="text-sm text-muted-foreground">{s.description}</dd>
          </div>
        ))}
      </dl>
      <form method="dialog" className="mt-6">
        <Button type="submit" variant="outline" size="sm">
          Close
        </Button>
      </form>
    </dialog>
  );
}
