"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" suppressHydrationWarning {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

// ============================================================
// SheetContent v4 — Pure CSS, Zero JS Animation
// ============================================================
// ROOT CAUSE HISTORY:
//   v1: Tailwind data-[state=open]:translate-x-0 didn't work in Tailwind v4
//       because translate-x-* uses CSS `translate` property, not `transform`.
//   v2: Custom CSS classes (sheet-slide-*) with [data-state] selectors.
//       Works in theory but can fail if CSS bundle is corrupted by stale chunks.
//   v3: MutationObserver watches data-state and applies inline styles.
//       BROKEN: React 19 ref forwarding + Radix timing caused the observer
//       to miss mutations or fire on a null ref, leaving inline
//       visibility:hidden overriding CSS visibility:visible.
//   v4 (CURRENT): Pure CSS approach with !important guarantees.
//       - No ref, no MutationObserver, no inline styles.
//       - CSS attribute selectors [data-slot="sheet-content"][data-state="open"]
//       override everything (including potential Tailwind translate conflicts).
//       - The .sheet-transition class handles smooth 300ms animation.
//       - Initial hidden state handled by [data-state="closed"] selector
//         (Radix sets data-state="closed" immediately on mount).
// ============================================================
function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        suppressHydrationWarning
        className={cn(
          "bg-background fixed z-[51] flex flex-col shadow-lg overflow-y-auto overscroll-contain",
          side === "right" && [
            "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-[520px]",
            "sheet-slide-right",
          ],
          side === "left" && [
            "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
            "sheet-slide-left",
          ],
          side === "top" && [
            "inset-x-0 top-0 h-auto border-b",
            "sheet-slide-top",
          ],
          side === "bottom" && [
            "inset-x-0 bottom-0 h-auto border-t",
            "sheet-slide-bottom",
          ],
          "sheet-transition",
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-3 right-3 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none z-10 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}


function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 px-6 pt-6 pb-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetPortal,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
