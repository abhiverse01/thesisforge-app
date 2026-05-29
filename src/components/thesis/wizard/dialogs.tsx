"use client";

import React, { useEffect } from "react";
import type { WizardStep } from "@/lib/thesis-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STEP_NAV } from "./constants";
import { Home, X, ArrowRight, AlertTriangle, RotateCcw } from "lucide-react";

export interface WizardDialogsProps {
  showShortcuts: boolean;
  showEasterEgg: boolean;
  showResetConfirm: boolean;
  showGoHomeConfirm: boolean;
  wizardStarted: boolean;
  currentStep: WizardStep;
  selectedTemplate: string | null;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEasterEgg: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResetConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGoHomeConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  handleGoHome: () => void;
  handleReset: () => void;
  handleGoToStep: (step: WizardStep) => void;
  canGoToStep: (step: WizardStep) => boolean;
}

export function WizardDialogs({
  showShortcuts,
  showEasterEgg,
  showResetConfirm,
  showGoHomeConfirm,
  wizardStarted,
  currentStep,
  selectedTemplate,
  setShowShortcuts,
  setShowEasterEgg,
  setShowResetConfirm,
  setShowGoHomeConfirm,
  handleGoHome,
  handleReset,
  handleGoToStep,
  canGoToStep,
}: WizardDialogsProps) {
  // FIX: Dim the navigation rail when any dialog is open.
  // The CSS :has() selector is a progressive enhancement but not universally
  // supported (Firefox < 121). This JS fallback adds a data attribute on
  // document.documentElement, which the CSS also targets, ensuring the rail
  // is always dimmed regardless of browser support.
  const anyDialogOpen = showShortcuts || showEasterEgg || showResetConfirm || showGoHomeConfirm;
  useEffect(() => {
    if (anyDialogOpen) {
      document.documentElement.setAttribute('data-tf-dialog-open', '');
    } else {
      document.documentElement.removeAttribute('data-tf-dialog-open');
    }
  }, [anyDialogOpen]);
  return (
    <>
      {/* ============================================================ */}
      {/* DIALOGS — Clean, no icons in headers */}
      {/* ============================================================ */}

      {/* ---- Keyboard Shortcuts ---- */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        {/* FIX19: overflow-hidden prevents nested scroll conflict — inner div handles scrolling */}
        <DialogContent className="sm:max-w-md rounded-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription className="sr-only">
              List of available keyboard shortcuts
            </DialogDescription>
          </DialogHeader>
          {/* FIX19: GODMODE-16 fix was correct in intent but incomplete.
               Three remaining issues caused half-cut buttons:
               1) Nested overflow-y-auto on both DialogContent and this div
                  caused scroll event conflicts — outer dialog stole scroll.
               2) max-h-[50vh] was viewport-relative but didn't account for
                  dialog chrome (header, padding, gap) on short viewports.
               3) No bottom padding — last row buttons were clipped at edge.
               Fix: DialogContent gets overflow-hidden (line above), this div
               gets dvh-based max-h + pb-3 for bottom breathing room. */}
          <div className="overflow-y-auto max-h-[calc(100dvh-16rem)] space-y-1 px-1 pb-3">
            {[
              { label: "Go to next step", keys: ["Ctrl", "\u2192"] },
              { label: "Go to previous step", keys: ["Ctrl", "\u2190"] },
              { label: "Return to templates", keys: ["Esc"] },
              { label: "Show shortcuts", keys: ["Ctrl", "/"] },
              { label: "Show shortcuts", keys: ["?"] },
              { label: "Save snapshot", keys: ["Ctrl", "S"] },
              { label: "Next step", keys: ["Ctrl", "Enter"] },
              { label: "Undo", keys: ["Ctrl", "Z"] },
              { label: "Redo", keys: ["Ctrl", "Shift", "Z"] },
            ].map((item, idx) => (
              <div
                key={`${item.label}-${item.keys.join("-")}-${idx}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                <div className="flex gap-1">
                  {item.keys.map((k) => (
                    <span key={k} className="kbd">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick Step Navigation */}
            {wizardStarted && selectedTemplate && (
              <>
                <div className="border-t my-2" />
                <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                  Go to Step
                </p>
                <div className="grid grid-cols-4 gap-1.5 px-1">
                  {STEP_NAV.map((s) => {
                    const isCurrent = currentStep === s.step;
                    const isLocked = !isCurrent && s.step > currentStep && !canGoToStep(s.step);
                    return (
                      <button
                        key={s.step}
                        onClick={() => !isLocked && handleGoToStep(s.step)}
                        disabled={isLocked}
                        className={cn(
                          "px-2 py-2.5 rounded-lg text-center transition-colors",
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : isLocked
                              ? "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="text-xs font-medium">
                          {s.name}
                        </div>
                        <div className="text-xs mt-0.5 opacity-60 leading-tight hidden sm:block">
                          {isLocked ? "Locked" : s.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Go Home Confirmation ---- */}
      <Dialog
        open={showGoHomeConfirm}
        onOpenChange={setShowGoHomeConfirm}
      >
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-0 overflow-hidden gap-0 border-border/40 shadow-xl">
          {/* Gradient accent bar at top */}
          <div
            className="h-1 w-full"
            style={{
              background: 'linear-gradient(90deg, oklch(0.50 0.22 264), oklch(0.60 0.18 305))',
            }}
          />
          <div className="px-6 pt-5 pb-2">
            <DialogHeader className="space-y-3 text-left">
              {/* Visual icon + title row */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold text-foreground leading-snug">
                    Return to Homepage?
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed pl-[52px]">
                Your progress is auto-saved. You can resume anytime by clicking{" "}
                <span className="font-medium text-foreground/70">Resume saved draft</span>{" "}
                on the homepage.
              </DialogDescription>
            </DialogHeader>
          </div>
          {/* Action buttons — full-width, stacked */}
          <div className="px-6 pb-6 pt-3 space-y-2.5">
            <Button
              size="lg"
              onClick={handleGoHome}
              className="w-full h-12 rounded-xl text-sm font-semibold gap-2.5 bg-primary text-primary-foreground border-0 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              Go to Homepage
              <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowGoHomeConfirm(false)}
              className="w-full h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all duration-200"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Reset Confirmation ---- */}
      <Dialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
      >
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-0 overflow-hidden gap-0 border-border/40">
          {/* Warning gradient accent bar */}
          <div
            className="h-1 w-full"
            style={{
              background: 'linear-gradient(90deg, oklch(0.577 0.245 27.325), oklch(0.65 0.20 42))',
            }}
          />
          <div className="px-6 pt-5 pb-2">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold text-foreground leading-snug">
                    Start New Thesis?
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed pl-[52px]">
                This will clear all your thesis data. Make sure you've exported your work first —{" "}
                <span className="font-medium text-destructive/80">this cannot be undone</span>.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6 pt-3 space-y-2.5">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleReset}
              className="w-full h-12 rounded-xl text-sm font-semibold gap-2.5 border-0 hover:shadow-lg active:scale-[0.98] transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Everything
              <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowResetConfirm(false)}
              className="w-full h-11 rounded-xl text-sm font-medium border-border/60 hover:border-border hover:bg-muted/50 active:scale-[0.98] transition-all duration-200"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Easter Egg ---- */}
      <Dialog open={showEasterEgg} onOpenChange={setShowEasterEgg}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>You found the secret!</DialogTitle>
            <DialogDescription className="sr-only">
              Easter egg dialog
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hey there! You discovered the hidden Konami Code easter egg.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">ThesisForge</strong> was
              crafted with obsessive attention to detail by{" "}
              <a
                href="https://abhishekshah.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Abhishek Shah
              </a>
              .
            </p>
            <div className="flex items-center justify-center gap-1 pt-1">
              {[
                "\u2191",
                "\u2191",
                "\u2193",
                "\u2193",
                "\u2190",
                "\u2192",
                "\u2190",
                "\u2192",
                "B",
                "A",
              ].map((key, i) => (
                <span
                  key={i}
                  className="w-6 h-6 rounded bg-muted text-xs font-mono font-semibold text-muted-foreground flex items-center justify-center"
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
