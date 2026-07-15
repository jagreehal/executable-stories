import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        // Pass/skip/pending are the quiet states: outline + coloured text, no
        // fill, so a green report reads calm. Only `failed` keeps a tinted
        // fill, making it the single loud badge on the page, so red pops the
        // instant something breaks. Colour-as-accent, matching the KPI cards.
        passed: "border-pass-border text-pass font-mono uppercase",
        failed: "border-fail-border bg-fail-bg text-fail font-mono uppercase",
        skipped: "border-skip-border text-skip font-mono uppercase",
        pending: "border-pend-border text-pend font-mono uppercase",
        tag: "border-border text-muted-foreground font-mono font-medium [a&]:hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    // Base UI composition: pass `render={<a … />}` to swap the underlying tag —
    // replaces Radix's `asChild`. See rules/base-vs-radix.md.
    render?: useRender.RenderProp
  }) {
  return useRender({
    defaultTagName: "span",
    render,
    props: {
      "data-slot": "badge",
      "data-variant": variant,
      className: cn(badgeVariants({ variant }), className),
      ...props,
    },
  })
}

export { Badge, badgeVariants }
