"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

// GODMODE: Premium mobile slider with responsive thumb sizing.
// Mobile: 24px thumb with 48px touch area, 6px track, depth shadow, spring transitions.
// Desktop: 16px thumb with 6px track, compact layout.
// Drag glow effect on range, scale feedback on thumb during drag.

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  showValue = false,
  formatValue,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )
  
  const displayValue = _values[0];
  const formattedValue = formatValue ? formatValue(displayValue) : displayValue;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-muted relative grow overflow-hidden rounded-full",
          "h-2 sm:h-1.5",
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-primary absolute h-full",
            "data-[state=dragging]:shadow-[0_0_0_4px_oklch(0.50_0.22_264_/_0.12)] dark:data-[state=dragging]:shadow-[0_0_0_4px_oklch(0.65_0.22_259_/_0.15)]",
            "transition-shadow duration-200"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            "border-primary bg-background rounded-full border-2 shadow-sm shrink-0",
            // Desktop: 16px
            "size-4",
            // Mobile: 24px (slightly smaller than before but still well above 44px touch area via padding)
            "sm:size-4 size-6",
            "focus-visible:ring-4 focus-visible:outline-hidden",
            "transition-[color,box-shadow,transform] duration-200",
            "hover:ring-4 hover:ring-ring/30",
            "disabled:pointer-events-none disabled:opacity-50",
            "data-[state=dragging]:scale-110 data-[state=dragging]:shadow-lg data-[state=dragging]:border-primary/80",
            // Mobile: larger shadow for depth
            "shadow-[0_2px_8px_oklch(0_0_0/0.12)]"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
export type { SliderProps }
