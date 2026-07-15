"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Segmented control on Base UI's ToggleGroup: a muted rounded track holding
// toggle "pills". The active item lifts to a `bg-background` surface with a
// subtle shadow (the shadcn Tabs look). Base UI's group holds an array value and
// its items are `Toggle` primitives (there is no `ToggleGroup.Item`), so
// ToggleGroupItem wraps Toggle. Radix's `data-[state=on]` is Base UI's
// `data-[pressed]`.
const toggleItemVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        default: "h-9 px-3 text-sm",
        sm: "h-8 px-2.5 text-[0.82rem]",
      },
    },
    defaultVariants: { size: "default" },
  },
)

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleItemVariants>>({
  size: "default",
})

function ToggleGroup({
  className,
  size,
  children,
  ...props
}: ToggleGroupPrimitive.Props & VariantProps<typeof toggleItemVariants>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex w-fit items-center gap-0.5 rounded-lg bg-muted p-0.5", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  )
}

function ToggleGroupItem({
  className,
  children,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleItemVariants>) {
  const context = React.useContext(ToggleGroupContext)
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(toggleItemVariants({ size: context.size ?? size }), "flex-1 shrink-0", className)}
      {...props}
    >
      {children}
    </TogglePrimitive>
  )
}

export { ToggleGroup, ToggleGroupItem }
