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
  'quota-exceeded': { icon: AlertCircle, label: "Storage full — backup downloaded", color: "text-[var(--color-text-danger)]" },
};

export function SaveIndicator() {
  const saveStatus = useThesisStore((s) => s.saveStatus);
  const wizardStarted = useThesisStore((s) => s.wizardStarted);

  if (!wizardStarted) return null;
  if (saveStatus === "idle") return null;

  const config = STATUS_CONFIG[saveStatus];

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
