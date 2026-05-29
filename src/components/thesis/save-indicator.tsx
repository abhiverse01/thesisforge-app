"use client";

import React from "react";
import { useThesisStore, type SaveStatus } from "@/lib/thesis-store";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Invisible placeholder for idle state — never rendered
function InvisiblePlaceholder(_props: { className?: string }) {
  return null;
}

const STATUS_CONFIG: Record<SaveStatus, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: InvisiblePlaceholder, label: "", color: "text-muted-foreground/0" },
  saving: { icon: Loader2, label: "Saving...", color: "text-[var(--color-text-warning)]" },
  saved: { icon: Check, label: "Saved", color: "text-[var(--color-text-success)]" },
  error: { icon: AlertCircle, label: "Error", color: "text-[var(--color-text-danger)]" },
  'quota-exceeded': { icon: AlertCircle, label: "Storage full — backup downloaded", color: "text-[var(--color-text-warning)]" },
  conflict: { icon: AlertCircle, label: "Conflict — save downloaded", color: "text-[var(--color-text-warning)]" },
};

export function SaveIndicator() {
  const saveStatus = useThesisStore((s) => s.saveStatus);
  const wizardStarted = useThesisStore((s) => s.wizardStarted);
  const [hasShownFirstSave, setHasShownFirstSave] = React.useState(false);

  // Mark first save after mount — must be above early returns to obey Rules of Hooks
  React.useEffect(() => {
    if (saveStatus === 'saved' && !hasShownFirstSave) {
      setHasShownFirstSave(true);
    }
  }, [saveStatus, hasShownFirstSave]);

  if (!wizardStarted) return null;
  if (saveStatus === "idle") return null;

  const config = STATUS_CONFIG[saveStatus];

  // First-save indicator — shown once per session
  if (saveStatus === 'saved' && !hasShownFirstSave) {
    return (
      <motion.span
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Auto-save on
      </motion.span>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={saveStatus}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-2 text-xs font-medium",
          config.color
        )}
        aria-live="polite"
        aria-label={config.label}
      >
        {config.icon === Loader2 ? (
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        ) : config.icon !== InvisiblePlaceholder ? (
          <config.icon className="w-3 h-3 shrink-0" />
        ) : null}
        <span>{config.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// Mobile Save Indicator — Ultra-compact for header center
// Shows a small colored dot: amber (saving), green (saved), red (error)
// ============================================================
export function SaveIndicatorMobile() {
  const saveStatus = useThesisStore((s) => s.saveStatus);
  const wizardStarted = useThesisStore((s) => s.wizardStarted);

  if (!wizardStarted) return null;
  if (saveStatus === "idle") return null;

  const dotColor =
    saveStatus === "saving" || saveStatus === "quota-exceeded" || saveStatus === "conflict"
      ? "bg-amber-500"
      : saveStatus === "saved"
        ? "bg-emerald-500"
        : "bg-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.2 }}
      className="w-2.5 h-2.5 rounded-full flex items-center justify-center"
      aria-live="polite"
      aria-label={STATUS_CONFIG[saveStatus].label}
    >
      <span
        className={cn(
          "w-2.5 h-2.5 rounded-full",
          dotColor,
          saveStatus === "saving" && "animate-pulse"
        )}
      />
    </motion.div>
  );
}
