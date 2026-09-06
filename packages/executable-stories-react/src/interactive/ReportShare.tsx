'use client';

/** CLI handoff for sharing a standalone HTML report and its local assets. */

import { Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';

export const DEFAULT_SHARE_COMMAND = 'npx executable-stories share reports/';

export interface ReportShareProps {
  /** Command the dialog tells the user to run. */
  command?: string;
  /** Copy to clipboard + toast; supplied by the report so one toast serves all. */
  onCopy: (text: string, message: string) => void;
}

export function ReportShare({
  command = DEFAULT_SHARE_COMMAND,
  onCopy,
}: ReportShareProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Share this report"
        title="Share this report"
        onClick={() => setOpen(true)}
      >
        <Share2 aria-hidden="true" className="size-4" />
        <span className="sr-only sm:not-sr-only">Share</span>
      </Button>
      <dialog
        ref={dialogRef}
        className="es-report-share m-auto w-[min(90vw,32rem)] rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg [overscroll-behavior:contain] backdrop:bg-black/40"
        aria-label="Share this report"
        onClose={() => setOpen(false)}
      >
        <h2 className="text-base font-semibold">Share this report</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Publish it to Executable Stories Cloud and send a link. Screenshots
          and videos go with it. Run this from your project:
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded border border-border bg-muted px-3 py-2 font-mono text-xs">
            {command}
          </code>
          <Button
            type="button"
            size="sm"
            onClick={() => onCopy(command, 'Command copied')}
          >
            Copy
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The file you are reading cannot upload itself, so the command does it:
          only the CLI can read the assets this report links to.
        </p>
        <div className="mt-6 flex items-center justify-between gap-4">
          <a
            className="text-xs underline underline-offset-2"
            href="https://executablestories.com/guides/sharing-reports/"
            target="_blank"
            rel="noreferrer"
          >
            How sharing works
          </a>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </dialog>
    </>
  );
}
