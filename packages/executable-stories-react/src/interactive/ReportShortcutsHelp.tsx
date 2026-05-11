"use client";

import { useEffect, useRef } from "react";

export interface ReportShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: "/", description: "Focus search" },
  { keys: "f", description: "Jump to next failure" },
  { keys: "Shift+F", description: "Jump to previous failure" },
  { keys: "Esc", description: "Clear search / close dialog" },
  { keys: "?", description: "Toggle this help" },
];

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
      className="es-shortcuts-help"
      aria-label="Keyboard shortcuts"
      onClose={onClose}
    >
      <h2>Keyboard shortcuts</h2>
      <dl>
        {SHORTCUTS.map((s) => (
          <div key={s.keys}>
            <dt>
              <kbd>{s.keys}</kbd>
            </dt>
            <dd>{s.description}</dd>
          </div>
        ))}
      </dl>
      <form method="dialog">
        <button type="submit" className="es-shortcuts-close">Close</button>
      </form>
    </dialog>
  );
}
