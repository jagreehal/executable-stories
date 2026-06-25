import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ExplorerStatus = "passed" | "failed" | "skipped" | "pending";

export interface ExplorerScenario {
  id: string;
  title: string;
  status: ExplorerStatus;
  tags: string[];
  /** Source file / feature label shown on the right. */
  feature: string;
  /** Resolved href to the scenario detail page. */
  href: string;
}

export interface ScenarioExplorerProps {
  scenarios: ExplorerScenario[];
  summary?: { total: number; passed: number; failed: number };
}

const STATUS_FILTERS: Array<{ value: "all" | ExplorerStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "pending", label: "Pending" },
];

/**
 * Scenario Explorer surface — a shadcn `Command` palette rendered inline. cmdk
 * filters by the item value (title + feature + tags) as you type; the status
 * pills pre-filter the list. Each row is a real `<a>` to the detail page.
 */
export function ScenarioExplorer({ scenarios, summary }: ScenarioExplorerProps) {
  const [status, setStatus] = useState<"all" | ExplorerStatus>("all");
  const visible = status === "all" ? scenarios : scenarios.filter((s) => s.status === status);

  return (
    <div className="font-sans text-foreground">
      {summary ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {summary.total} scenarios · <span className="text-pass">{summary.passed} passed</span> ·{" "}
          <span className="text-fail">{summary.failed} failed</span>
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={status === f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              status === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Command
        className="rounded-lg border border-border bg-card"
        filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
      >
        <CommandInput placeholder="Search scenarios…" />
        <CommandList className="max-h-none">
          <CommandEmpty>No scenarios match your filters.</CommandEmpty>
          <CommandGroup>
            {visible.map((s) => (
              <CommandItem
                key={s.id}
                value={`${s.title} ${s.feature} ${s.tags.join(" ")}`}
                asChild
                className="cursor-pointer"
              >
                <a href={s.href} className="flex items-center gap-3">
                  <Badge variant={s.status}>{s.status}</Badge>
                  <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                  {s.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="tag" className="hidden sm:inline-flex">
                      {t}
                    </Badge>
                  ))}
                  <code className="hidden font-mono text-xs text-muted-foreground md:inline">{s.feature}</code>
                </a>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
