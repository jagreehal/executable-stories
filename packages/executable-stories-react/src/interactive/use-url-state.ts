"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_URL_STATE,
  decodeUrlState,
  encodeUrlState,
  splitHash,
  writeHash,
  type ReportUrlState,
} from "../lib/hash-state";

/** Keystroke-rate updates coalesce into one URL write. */
const WRITE_DELAY_MS = 250;

/**
 * Search / status / tag / detail state, mirrored into the URL fragment so a
 * refresh or a shared link restores the same view. See lib/hash-state for why
 * the fragment and not the query string.
 *
 * The URL is read in an effect rather than during render: this component also
 * hydrates a server-rendered tree (Astro `client:load`), where a first client
 * render that disagreed with the server markup would be a hydration mismatch.
 */
export function useUrlState(): [ReportUrlState, (patch: Partial<ReportUrlState>) => void] {
  const [state, setState] = useState<ReportUrlState>(DEFAULT_URL_STATE);
  const ready = useRef(false);

  useEffect(() => {
    const read = () => setState(decodeUrlState(splitHash(window.location.hash).params));
    read();
    ready.current = true;
    // Back/forward and in-page anchor jumps both surface as hashchange.
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    // Never write before the first read, or mount would erase incoming filters.
    if (!ready.current) return;
    const timer = setTimeout(
      () => writeHash(splitHash(window.location.hash).anchor, encodeUrlState(state)),
      WRITE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [state]);

  const update = useCallback(
    (patch: Partial<ReportUrlState>) => setState((prev) => ({ ...prev, ...patch })),
    [],
  );

  return [state, update];
}
