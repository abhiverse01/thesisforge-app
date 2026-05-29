"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

// GODMODE: Premium iOS-style toggle switch.
// Mobile: h-[31px] w-[51px] with 27px thumb — iOS standard toggle dimensions.
// Desktop: h-[1.15rem] w-8 with size-4 (16px) thumb — compact toggle.
// Smooth 300ms cubic-bezier(0.4,0,0.2,1) transitions for premium feel.
// active:scale-[0.96] press feedback on mobile for tactile response.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex",
        // Mobile: h-[31px] w-[51px] — iOS standard toggle size
        // Desktop: h-[1.15rem] w-8 — compact toggle
        "h-[31px] w-[51px] sm:h-[1.15rem] sm:w-8 shrink-0 items-center rounded-full",
        "border border-transparent transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] outline-none",
        "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        // Active press effect on mobile
        "active:scale-[0.96]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none",
          "block rounded-full ring-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          // Mobile thumb: 27px (h-[27px] w-[27px])
          // Desktop thumb: 16px (size-4)
          "h-[27px] w-[27px] sm:h-4 sm:w-4",
          // Position: mobile checked = translate-x-[20px], unchecked = translate-x-[2px]
          // Desktop: sm:translate-x-[calc(100%-2px)], sm:translate-x-0.5
          "data-[state=checked]:translate-x-[20px] sm:data-[state=checked]:translate-x-[calc(100%-2px)]",
          "data-[state=unchecked]:translate-x-[2px] sm:data-[state=unchecked]:translate-x-0.5",
          // Shadow on mobile
          "shadow-[0_1px_3px_oklch(0_0_0/0.15),0_1px_2px_oklch(0_0_0/0.1)] sm:shadow-none",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
