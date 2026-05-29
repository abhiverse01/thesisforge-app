"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getGreetingMessage } from "./constants";

/**
 * Navbar Date Display — Center of navbar on homepage.
 * Shows current date with tooltip greeting on hover.
 */
export function NavbarDate() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // GODMODE 13: Memoize on date string, not Date object. The interval creates a new Date
  // every 60 seconds, which triggered random greeting re-computation each minute.
  // toDateString() is stable for the entire day, preventing greeting flicker.
  // eslint-disable-next-line react-hooks/use-memo -- toDateString() is a simple expression but eslint wants a bare variable
  const greeting = useMemo(() => getGreetingMessage(now), [now.toDateString()]);

  if (!mounted) {
    return <div className="h-5 w-40 rounded bg-muted/40" />;
  }

  const day = now.getDate();
  const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
  const month = now.toLocaleDateString("en-US", { month: "short" });
  const year = now.getFullYear();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="hidden sm:flex items-center justify-center gap-1.5 text-[13px] tabular-nums select-none tracking-wide cursor-default px-2.5 py-1 rounded-lg hover:bg-muted/30 transition-colors duration-200">
          <span className="font-semibold text-foreground/75">{day}</span>
          <span className="text-muted-foreground/20" aria-hidden="true">&middot;</span>
          <span className="text-muted-foreground/50 font-medium">{weekday}</span>
          <span className="text-muted-foreground/20" aria-hidden="true">&middot;</span>
          <span className="text-muted-foreground/50 font-medium">{month}</span>
          <span className="text-muted-foreground/30" aria-hidden="true">&middot;</span>
          <span className="text-muted-foreground/35 font-medium">{year}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs font-medium">{greeting}</p>
      </TooltipContent>
    </Tooltip>
  );
}
