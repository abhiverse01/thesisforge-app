"use client";

import React from "react";
import { useThesisStore, type SaveStatus } from "@/lib/thesis-store";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG: Record<SaveStatus, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: null, label: "", color: "text-muted-foreground/0" },
  saving: { icon: Loader2, label: "Saving...", color: "text-amber-600 dark:text-amber-400" },
  saved: { icon: Check, label: "Saved", color: "text-emerald-600 dark:text-emerald-400" },
  error: { icon: AlertCircle, label: "Error", color: "text-red-600 dark:text-red-400" },
  'quota-exceeded': { icon: AlertCircle, label: "Storage full — backup downloaded", color: "text-red-600 dark:text-red-400" },
};

export function SaveIndicator() {
  const saveStatus = useThesisStore((s) => s.saveStatus);
  const wizardStarted = useThesisStore((s) => s.wizardStarted);

  if (!wizardStarted || saveStatus === "idle") return null;

  const config = STATUS_CONFIG[saveStatus];

  return (
    <AnimatePresence mode="wait">
      {saveStatus !== "idle" && (
        <motion.div
          key={saveStatus}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium",
            config.color
          )}
          aria-live="polite"
          aria-label={config.label}
        >
          {config.icon && (
            <span className="flex-shrink-0">
              {config.icon === Loader2 ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <config.icon className="w-3 h-3" />
              )}
            </span>
          )}
          <span>{config.label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
