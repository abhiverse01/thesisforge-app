"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { WizardStep } from "@/lib/thesis-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BrainCircuit } from "lucide-react";

// FIX: Memoize IntelligencePanel to prevent unnecessary re-renders.
// Root cause: Home component re-renders on every thesis store change (every keystroke),
// which cascades into IntelligencePanel even though its props haven't changed.
// React.memo ensures IntelligencePanel only re-renders when its 3 props actually change.
const IntelligencePanelDynamic = dynamic(
  () => import("@/components/thesis/intelligence-panel").then((m) => ({ default: m.default })),
  { ssr: false }
);
const IntelligencePanel = React.memo(IntelligencePanelDynamic);

export interface IntelligenceFloatProps {
  wizardStarted: boolean;
  isNarrow: boolean;
  selectedTemplate: string | null;
  currentStep: WizardStep;
  showIntelligencePanel: boolean;
  mobileIntelligenceOpen: boolean;
  completenessScore: number;
  setShowIntelligencePanel: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileIntelligenceOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseIntelligencePanel: () => void;
}

export function IntelligenceFloat({
  wizardStarted,
  isNarrow,
  selectedTemplate,
  currentStep,
  showIntelligencePanel,
  mobileIntelligenceOpen,
  completenessScore,
  setShowIntelligencePanel,
  setMobileIntelligenceOpen,
  handleCloseIntelligencePanel,
}: IntelligenceFloatProps) {
  return (
    <>
      {/* ============================================================ */}
      {/* Intelligence Panel — Mobile Sheet from bottom */}
      {/* ============================================================ */}
      {!isNarrow ? null : (
      <Sheet open={wizardStarted && mobileIntelligenceOpen} onOpenChange={(open) => { if (!open) { setMobileIntelligenceOpen(false); setShowIntelligencePanel(false); } }}>
        <SheetContent
          side="bottom"
          className="h-[75dvh] rounded-t-2xl p-0 overflow-y-auto overscroll-y-contain"
        >
          {/* Drag handle indicator */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="sr-only">
            <SheetTitle>Intelligence</SheetTitle>
          </SheetHeader>
          <IntelligencePanel
            isOpen={true}
            onClose={handleCloseIntelligencePanel}
            currentStep={currentStep}
          />
        </SheetContent>
      </Sheet>
      )}

      {/* Intelligence Panel — Desktop inline sidebar (existing) */}
      {/* Desktop panel is rendered inline in the wizard layout */}

      {/* Intelligence Panel — Mobile Floating Trigger */}
      {/* FIXTEN: Hide floating trigger when intelligence Sheet is open.
           The Sheet overlay (z-50) would cover the button (z-30), making it
           both invisible and tappable through the overlay — confusing UX.
           pointer-events-none + opacity-0 when open keeps the DOM stable. */}
      {wizardStarted && isNarrow && selectedTemplate && (
        <button
          type="button"
          onClick={() => {
            const next = !showIntelligencePanel;
            setShowIntelligencePanel(next);
            setMobileIntelligenceOpen(next);
          }}
          className={cn(
            "fixed bottom-20 right-4 z-30 flex items-center justify-center",
            "w-11 h-11 rounded-full shadow-lg transition-all duration-200",
            "border-0 cursor-pointer bg-primary text-primary-foreground",
            showIntelligencePanel
              ? "opacity-0 pointer-events-none"
              : "hover:scale-105 shadow-primary/25"
          )}
          aria-label={showIntelligencePanel ? "Close intelligence panel" : "Open intelligence panel"}
        >
          <BrainCircuit className="w-5 h-5" />
          {/* Issue count badge */}
          {!showIntelligencePanel && completenessScore > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              {completenessScore}
            </span>
          )}
        </button>
      )}
    </>
  );
}
