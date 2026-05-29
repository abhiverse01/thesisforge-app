"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * ThesisForge Logo — Custom PNG Logo
 *
 * Uses the official ThesisForge logo image (transparent PNG).
 * Falls back to text-only branding if the image fails to load.
 *
 * Sizes: "sm" (mobile menu), "md" (navbar), "lg" (hero), "icon" (favicon-only, no container)
 */
type LogoSize = "sm" | "md" | "lg" | "icon";

interface LogoProps {
  size?: LogoSize;
  className?: string;
  showBrandText?: boolean;
  animate?: boolean;
}

const sizeConfig: Record<LogoSize, { img: string; text: string }> = {
  sm: { img: "w-6 h-6", text: "text-xs" },
  md: { img: "w-7 h-7", text: "text-sm" },
  lg: { img: "w-16 h-16", text: "text-xl" },
  icon: { img: "w-full h-full", text: "text-sm" },
};

export function Logo({
  size = "md",
  className,
  showBrandText = true,
  animate = false,
}: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      {/* Logo icon */}
      <div
        className={cn(
          "shrink-0 overflow-hidden",
          config.img,
          animate && "animate-[tf-float_4s_ease-in-out_infinite]"
        )}
      >
        <Image
          src="/logo.png"
          alt="ThesisForge logo"
          width={size === "lg" ? 64 : size === "icon" ? 32 : 28}
          height={size === "lg" ? 64 : size === "icon" ? 32 : 28}
          className="w-full h-full object-contain"
          priority={size === "md" || size === "lg"}
        />
      </div>

      {/* Brand text — no gap between Thesis and Forge */}
      {showBrandText && (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground whitespace-nowrap",
            config.text
          )}
        >
          {"Thesis"}<span style={{ color: "var(--c-brand-600, #534AB7)" }}>{"Forge"}</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
