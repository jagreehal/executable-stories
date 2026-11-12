import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names with Tailwind-aware conflict resolution (shadcn `cn`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Fixed locale so the server and the browser format counts the same way.
const COUNT = new Intl.NumberFormat("en-US");

/** A count with thousands separators: 2000 → "2,000". */
export function formatCount(n: number): string {
  return COUNT.format(n);
}
