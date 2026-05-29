import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // FIX: Initialize with sync matchMedia check instead of undefined.
  // Previous version initialized as undefined, which !!undefined → false on first render.
  // This caused a desktop→mobile layout flash on mobile devices — components briefly
  // rendered in desktop layout before the useEffect fired and set isMobile to true.
  // Using a lazy initializer reads matchMedia synchronously, avoiding the flash.
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    // Sync on mount (handles SSR hydration mismatch gracefully)
    setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
