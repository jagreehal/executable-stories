"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ListIcon, XIcon } from "lucide-react";
import { useReport } from "../hooks/useReport";
import { TocContent } from "./ReportToc";

/**
 * Narrow-screen table of contents: a left-sliding drawer holding the same
 * `TocContent` (and scroll-spy) as the sticky sidebar. The trigger is
 * `lg:hidden`, so on wide screens the sidebar shows instead and this stays out
 * of the way. Following a link closes the drawer so the scenario is revealed.
 */
export function ReportTocDrawer() {
  const report = useReport();
  const [open, setOpen] = useState(false);
  if (report.features.length === 0) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger className="flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden [&_svg]:size-3.5">
        <ListIcon aria-hidden /> Contents
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col gap-3 overflow-y-auto border-r border-border bg-background p-4 font-sans text-xs shadow-lg outline-none transition-transform duration-200 data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Contents
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close contents"
              className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4"
            >
              <XIcon aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <TocContent onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
