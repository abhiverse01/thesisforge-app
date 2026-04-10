"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useThesisStore, type WizardStep } from "@/lib/thesis-store";
import { StepIndicator } from "@/components/thesis/step-indicator";
import { TemplateSelector } from "@/components/thesis/template-selector";
import { MetadataForm } from "@/components/thesis/metadata-form";
import { AbstractEditor } from "@/components/thesis/abstract-editor";
import { ChapterEditor } from "@/components/thesis/chapter-editor";
import { ReferenceEditor } from "@/components/thesis/reference-editor";
import { GeneratePreview } from "@/components/thesis/generate-preview";
import { Homepage } from "@/components/thesis/homepage";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Moon,
  Sun,
  RotateCcw,
  Home as HomeIcon,
  Mail,
  ExternalLink,
  Keyboard,
  Sparkles,
  FileDown,
  FileUp,
  Menu,
  ArrowUp,
  Check,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ============================================================
// Animation Variants
// ============================================================

// Page-level transition between homepage and wizard
const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.995 },
};

const pageTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
};

// Step transitions with directional sliding
const getStepVariants = (direction: "forward" | "backward") => ({
  enter: {
    x: direction === "forward" ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  },
  center: { x: 0, opacity: 1, scale: 1 },
  exit: {
    x: direction === "forward" ? -40 : 40,
    opacity: 0,
    scale: 0.98,
  },
});

const stepTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
};

// Step indicator entrance animation
const stepIndicatorVariants = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

// ============================================================
// Step Navigation Data
// ============================================================

const STEP_NAV: { step: WizardStep; name: string; description: string }[] = [
  { step: 1, name: "Template", description: "Choose thesis type" },
  { step: 2, name: "Metadata", description: "Title, author, info" },
  { step: 3, name: "Abstract", description: "Write your abstract" },
  { step: 4, name: "Chapters", description: "Add chapter content" },
  { step: 5, name: "References", description: "Manage citations" },
  { step: 6, name: "Generate", description: "Export LaTeX files" },
];

// ============================================================
// Konami Code: ↑↑↓↓←→←→BA
// ============================================================

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];

// ============================================================
// Save Status Indicator (extracted component)
// ============================================================

function SaveStatusDot({
  saveState,
}: {
  saveState: "idle" | "saving" | "saved";
}) {
  return (
    <div
      className={cn(
        "rounded-full transition-colors duration-300 shrink-0 w-2 h-2",
        saveState === "saving"
          ? "bg-amber-500 animate-pulse"
          : saveState === "saved"
            ? "bg-emerald-500"
            : "bg-muted-foreground/30"
      )}
    />
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Home() {
  const {
    wizardStarted,
    currentStep,
    selectedTemplate,
    thesis,
    lastDeletedChapter,
    lastDeletedReference,
    reset,
    goToHome,
    nextStep,
    prevStep,
    setStep,
    undoDeleteChapter,
    undoDeleteReference,
    exportProject,
    importProject,
  } = useThesisStore();
  const { theme, setTheme } = useTheme();

  // ---- Dialog states ----
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showGoHomeConfirm, setShowGoHomeConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ---- UI states ----
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [trackedStep, setTrackedStep] = useState(currentStep);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Derive step direction from currentStep vs trackedStep (setState-during-render
  // is a supported React pattern for deriving state from props).
  const stepDirection: "forward" | "backward" =
    currentStep !== trackedStep
      ? currentStep > trackedStep
        ? "forward"
        : "backward"
      : "forward";
  if (currentStep !== trackedStep) {
    setTrackedStep(currentStep);
  }

  // ---- Refs ----
  const konamiBuffer = useRef<string[]>([]);
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveCompleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveToastRef = useRef(0);
  const deletedChapterShownRef = useRef(false);
  const deletedRefShownRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================================================================
  // Local Storage Persistence (first render only)
  // ================================================================
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const saved = localStorage.getItem("thesisforge_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.thesis && parsed.selectedTemplate) {
            useThesisStore.setState({
              thesis: parsed.thesis,
              selectedTemplate: parsed.selectedTemplate,
              currentStep: parsed.currentStep,
              wizardStarted: parsed.wizardStarted ?? true,
            });
            setTimeout(() => {
              toast.info("Restored from draft", {
                description: "Your progress has been loaded.",
                duration: 2500,
              });
            }, 100);
          }
        } catch {
          // Invalid saved state, ignore
        }
      }
    }
  }, []);

  // ================================================================
  // Auto-save with debounce, save indicator, and toast
  // ================================================================
  useEffect(() => {
    if (!wizardStarted || !thesis) return;

    // Defer the "saving" indicator to next frame to avoid synchronous
    // setState in effect body (lint rule react-hooks/set-state-in-effect)
    const showSavingFrame = requestAnimationFrame(() => {
      setSaveState("saving");
    });

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (saveCompleteRef.current) clearTimeout(saveCompleteRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const state = useThesisStore.getState();
      if (state.thesis) {
        localStorage.setItem(
          "thesisforge_state",
          JSON.stringify({
            thesis: state.thesis,
            selectedTemplate: state.selectedTemplate,
            currentStep: state.currentStep,
            wizardStarted: state.wizardStarted,
          })
        );
        setSaveState("saved");

        // Debounced toast — don't spam (min 4s between toasts)
        const now = Date.now();
        if (now - lastSaveToastRef.current > 4000) {
          toast.success("Progress saved", {
            duration: 1500,
            description: "Auto-saved to browser",
          });
          lastSaveToastRef.current = now;
        }

        saveCompleteRef.current = setTimeout(() => {
          setSaveState("idle");
        }, 2500);
      }
    }, 800);

    return () => {
      cancelAnimationFrame(showSavingFrame);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (saveCompleteRef.current) clearTimeout(saveCompleteRef.current);
    };
  }, [thesis, currentStep, wizardStarted]);

  // ================================================================
  // Undo chapter delete — toast with undo action
  // ================================================================
  useEffect(() => {
    if (lastDeletedChapter && !deletedChapterShownRef.current) {
      deletedChapterShownRef.current = true;
      const title =
        lastDeletedChapter.title || `Chapter ${lastDeletedChapter.number}`;
      toast.warning(`${title} deleted`, {
        description: "The chapter has been removed.",
        action: {
          label: "Undo",
          onClick: () => undoDeleteChapter(),
        },
        duration: 6000,
      });
    }
    if (!lastDeletedChapter) {
      deletedChapterShownRef.current = false;
    }
  }, [lastDeletedChapter, undoDeleteChapter]);

  // ================================================================
  // Undo reference delete — toast with undo action
  // ================================================================
  useEffect(() => {
    if (lastDeletedReference && !deletedRefShownRef.current) {
      deletedRefShownRef.current = true;
      const title = lastDeletedReference.title || "Reference";
      toast.warning(`${title} deleted`, {
        description: "The reference has been removed.",
        action: {
          label: "Undo",
          onClick: () => undoDeleteReference(),
        },
        duration: 6000,
      });
    }
    if (!lastDeletedReference) {
      deletedRefShownRef.current = false;
    }
  }, [lastDeletedReference, undoDeleteReference]);

  // ================================================================
  // Listen for code copy events from generate step
  // ================================================================
  useEffect(() => {
    const handleCopy = () => {
      toast.success("Copied to clipboard", { duration: 2000 });
    };
    window.addEventListener("thesisforge:code-copied", handleCopy);
    return () => window.removeEventListener("thesisforge:code-copied", handleCopy);
  }, []);

  // ================================================================
  // Scroll handler for "Back to Top" button (threshold: 300px)
  // ================================================================
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ================================================================
  // Keyboard Shortcuts + Konami Code
  // ================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Konami code detection
      konamiBuffer.current.push(e.code);
      if (konamiBuffer.current.length > KONAMI_CODE.length) {
        konamiBuffer.current.shift();
      }
      if (
        konamiBuffer.current.length === KONAMI_CODE.length &&
        konamiBuffer.current.every((k, i) => k === KONAMI_CODE[i])
      ) {
        setShowEasterEgg(true);
        konamiBuffer.current = [];
      }

      // Don't trigger shortcuts when typing in inputs/textareas
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (!wizardStarted) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "ArrowRight":
          case "ArrowDown":
            e.preventDefault();
            if (selectedTemplate) nextStep();
            break;
          case "ArrowLeft":
          case "ArrowUp":
            e.preventDefault();
            if (currentStep > 1) prevStep();
            else if (currentStep === 1) {
              setShowGoHomeConfirm(true);
            }
            break;
          case "/":
            e.preventDefault();
            setShowShortcuts(true);
            break;
        }
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts(true);
      }

      if (e.key === "Escape" && currentStep === 1) {
        setShowGoHomeConfirm(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTemplate, nextStep, prevStep, wizardStarted, currentStep]);

  // ================================================================
  // Handlers
  // ================================================================
  const handleReset = useCallback(() => {
    localStorage.removeItem("thesisforge_state");
    reset();
    setShowResetConfirm(false);
    setMobileMenuOpen(false);
  }, [reset]);

  const handleGoHome = useCallback(() => {
    goToHome();
    setShowGoHomeConfirm(false);
    setMobileMenuOpen(false);
  }, [goToHome]);

  const handleExport = useCallback(() => {
    try {
      const json = exportProject();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thesisforge-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Project exported", { duration: 2000 });
    } catch {
      toast.error("Export failed", { duration: 3000 });
    }
    setMobileMenuOpen(false);
  }, [exportProject]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const success = importProject(text);
        if (success) {
          toast.success("Project imported", { duration: 2000 });
        } else {
          toast.error("Import failed", {
            description: "Invalid project file format.",
            duration: 3000,
          });
        }
      };
      reader.readAsText(file);
      e.target.value = "";
      setMobileMenuOpen(false);
    },
    [importProject]
  );

  const handleGoToStep = useCallback(
    (step: WizardStep) => {
      setStep(step);
      setShowShortcuts(false);
      setMobileMenuOpen(false);
    },
    [setStep]
  );

  // ================================================================
  // Render step content
  // ================================================================
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <TemplateSelector />;
      case 2:
        return <MetadataForm />;
      case 3:
        return <AbstractEditor />;
      case 4:
        return <ChapterEditor />;
      case 5:
        return <ReferenceEditor />;
      case 6:
        return <GeneratePreview />;
      default:
        return <TemplateSelector />;
    }
  };

  const stepVariants = getStepVariants(stepDirection);

  // ================================================================
  // Mobile menu items (shared between Sheet and header)
  // ================================================================
  const mobileMenuItems = (
    <nav className="space-y-0.5">
      {/* Save indicator (mobile) */}
      {wizardStarted && thesis && (
        <div className="flex items-center gap-1.5 px-3 py-2">
          <SaveStatusDot saveState={saveState} />
          <span
            className={cn(
              "text-xs transition-all duration-300 whitespace-nowrap",
              saveState === "saving"
                ? "text-amber-600 dark:text-amber-400 font-medium"
                : saveState === "saved"
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : "text-muted-foreground/60"
            )}
          >
            {saveState === "saving"
              ? "Saving\u2026"
              : saveState === "saved"
                ? "All changes saved"
                : "Auto-save on"}
          </span>
        </div>
      )}
      {wizardStarted && thesis && (
        <div className="h-px bg-border/60 mx-2 mb-2" />
      )}

      {wizardStarted && (
        <>
          <button
            onClick={() => {
              if (currentStep === 1) {
                setShowGoHomeConfirm(true);
              } else {
                setStep(1);
              }
              setMobileMenuOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
              currentStep === 1
                ? "text-muted-foreground hover:bg-muted"
                : "text-primary hover:bg-primary/5"
            )}
          >
            <HomeIcon className="w-4 h-4 shrink-0" />
            <span>
              {currentStep === 1 ? "Back to Homepage" : "Return to Templates"}
            </span>
          </button>

          <button
            onClick={() => {
              setShowResetConfirm(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>New Thesis</span>
          </button>

          <div className="h-px bg-border my-1.5 mx-2" />

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span>Export Project (.json)</span>
          </button>

          <button
            onClick={handleImport}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
          >
            <FileUp className="w-4 h-4 shrink-0" />
            <span>Import Project (.json)</span>
          </button>

          <div className="h-px bg-border my-1.5 mx-2" />
        </>
      )}

      <button
        onClick={() => {
          setShowShortcuts(true);
          setMobileMenuOpen(false);
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
      >
        <Keyboard className="w-4 h-4 shrink-0" />
        <span>Keyboard Shortcuts</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50 kbd">
          ?
        </span>
      </button>

      <button
        onClick={() => {
          setTheme(theme === "dark" ? "light" : "dark");
          setMobileMenuOpen(false);
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4 shrink-0" />
        ) : (
          <Moon className="w-4 h-4 shrink-0" />
        )}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </button>
    </nav>
  );

  // ================================================================
  // Render
  // ================================================================
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex flex-col bg-pattern">
        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl surface-1">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            {/* Left: Logo + brand */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight leading-none">
                  ThesisForge
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 hidden sm:block truncate">
                  {wizardStarted
                    ? "Instant LaTeX Thesis Creator"
                    : "Create LaTeX theses effortlessly"}
                </span>
              </div>
            </div>

            {/* Right: Desktop action buttons (hidden on mobile) */}
            <div className="items-center gap-1 hidden sm:flex shrink-0">
              {/* Save state indicator in header */}
              {wizardStarted && thesis && (
                <div className="flex items-center mr-1.5">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                      saveState === "saving"
                        ? "bg-amber-500 animate-pulse"
                        : saveState === "saved"
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/30"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] ml-1 transition-all duration-300 whitespace-nowrap",
                      saveState === "saving"
                        ? "text-amber-600 dark:text-amber-400 font-medium"
                        : saveState === "saved"
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-transparent"
                    )}
                  >
                    {saveState === "saving"
                      ? "Saving\u2026"
                      : saveState === "saved"
                        ? "Saved"
                        : "\u200B"}
                  </span>
                </div>
              )}

              {wizardStarted && (
                <>
                  {/* Templates / Home button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (currentStep === 1) {
                            setShowGoHomeConfirm(true);
                          } else {
                            setStep(1);
                          }
                        }}
                        className={cn(
                          "text-xs gap-1.5 h-8",
                          currentStep === 1
                            ? "text-muted-foreground"
                            : "text-primary"
                        )}
                      >
                        <HomeIcon className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Templates</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>
                        {currentStep === 1
                          ? "Back to homepage"
                          : "Return to template selection"}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* New Thesis / Reset button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResetConfirm(true)}
                        className="text-xs gap-1.5 text-muted-foreground h-8"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">New Thesis</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Start over from the beginning</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Clears all current data
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Export button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExport}
                        className="h-8 w-8 p-0 text-muted-foreground"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Export project as JSON</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Import button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleImport}
                        className="h-8 w-8 p-0 text-muted-foreground"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Import project from JSON</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              {/* Keyboard shortcuts */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShortcuts(true)}
                    className="h-8 w-8 p-0 text-muted-foreground"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Keyboard shortcuts</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Press <span className="kbd">?</span>
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Theme toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="h-8 w-8 p-0"
                    aria-label="Toggle theme"
                  >
                    <Sun className="w-4 h-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Toggle {theme === "dark" ? "light" : "dark"} mode</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Mobile: Save dot + Hamburger (visible on mobile only) */}
            <div className="flex sm:hidden items-center gap-2 shrink-0">
              {/* Mini save indicator dot */}
              {wizardStarted && thesis && (
                <SaveStatusDot saveState={saveState} />
              )}
              {/* Hamburger menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Menu className="w-4.5 h-4.5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] pt-6 px-3">
                  <SheetHeader className="px-2 pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                      <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                        <FileText className="w-3 h-3 text-primary-foreground" />
                      </div>
                      ThesisForge Menu
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">{mobileMenuItems}</div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* MAIN CONTENT */}
        {/* ============================================================ */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {!wizardStarted ? (
              <motion.div
                key="homepage"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Homepage />
              </motion.div>
            ) : (
              <motion.div
                key="wizard"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6"
              >
                {/* Step Indicator */}
                <AnimatePresence mode="wait">
                  {selectedTemplate && (
                    <motion.div
                      variants={stepIndicatorVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <StepIndicator />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step Content with directional transitions */}
                <AnimatePresence mode="wait" custom={stepDirection}>
                  <motion.div
                    key={currentStep}
                    custom={stepDirection}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={stepTransition}
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ============================================================ */}
        {/* FOOTER — Polished, compact, with auto-save status */}
        {/* ============================================================ */}
        <footer className="border-t mt-auto bg-background/60 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
            {/* Main row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              {/* Left: workflow hint + save status */}
              <div className="flex items-center gap-3 text-center sm:text-left">
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Paste content &rarr;{" "}
                  <code className="text-[9px] bg-secondary/50 px-1 py-0.5 rounded font-mono">
                    .tex
                  </code>{" "}
                  &rarr; Compile &rarr; PDF
                </p>
                {/* Auto-save status in footer (desktop only) */}
                {wizardStarted && thesis && (
                  <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-border/50">
                    {saveState === "saving" ? (
                      <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                    ) : saveState === "saved" ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : null}
                    <span
                      className={cn(
                        "text-[10px] transition-all duration-300 whitespace-nowrap",
                        saveState === "saving"
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : saveState === "saved"
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground/40"
                      )}
                    >
                      {saveState === "saving"
                        ? "Saving\u2026"
                        : saveState === "saved"
                          ? "All changes saved"
                          : "Auto-save on"}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Developer credit — social card style */}
              <div className="flex items-center gap-2">
                <a
                  href="https://abhishekshah.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 group"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-[8px] font-bold text-primary">
                      AS
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    Abhishek Shah
                  </span>
                </a>
                <div className="w-px h-3.5 bg-border/60" />
                <a
                  href="mailto:abhishek.aimarine@gmail.com"
                  className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors inline-flex items-center"
                  title="abhishek.aimarine@gmail.com"
                >
                  <Mail className="w-3 h-3" />
                </a>
                <a
                  href="https://abhishekshah.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors inline-flex items-center"
                  title="Portfolio"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Brand line */}
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground/30">
                <span className="font-semibold">ThesisForge</span>
                {" "}by{" "}
                <a
                  href="https://abhishekshah.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline underline-offset-1 decoration-muted-foreground/10 hover:decoration-primary"
                >
                  Abhishek Shah
                </a>
                {" "}&middot; &copy; {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </footer>

        {/* ============================================================ */}
        {/* BACK TO TOP floating button */}
        {/* ============================================================ */}
        <AnimatePresence>
          {showBackToTop && wizardStarted && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
              className="fixed bottom-20 right-4 sm:right-6 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
              aria-label="Back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* DIALOGS */}
        {/* ============================================================ */}

        {/* ---- Keyboard Shortcuts Dialog ---- */}
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-border/60 shadow-xl">
            <div className="p-5 pb-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-base">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Keyboard className="w-4 h-4 text-primary" />
                  </div>
                  Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription className="sr-only">
                  List of all available keyboard shortcuts for navigating
                  the thesis wizard
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-1">
              {/* Shortcut rows */}
              {[
                { label: "Go to next step", keys: ["Ctrl", "\u2192"] },
                { label: "Go to previous step", keys: ["Ctrl", "\u2190"] },
                { label: "Return to templates", keys: ["Esc"] },
                { label: "Show shortcuts", keys: ["Ctrl", "/"] },
                { label: "Show shortcuts", keys: ["?"] },
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
                  <p className="text-[11px] font-medium text-muted-foreground px-3 mb-2">
                    Go to Step
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 px-1">
                    {STEP_NAV.map((s) => (
                      <button
                        key={s.step}
                        onClick={() => handleGoToStep(s.step)}
                        className={cn(
                          "px-2 py-2.5 rounded-lg text-center transition-all duration-150",
                          currentStep === s.step
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="text-[11px] font-medium">
                          {s.name}
                        </div>
                        <div className="text-[9px] mt-0.5 opacity-60 leading-tight hidden sm:block">
                          {s.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Footer hint */}
              <div className="border-t pt-2.5 mt-2">
                <p className="text-[10px] text-muted-foreground/50 italic px-3">
                  Your progress is auto-saved to local storage. Come back
                  anytime.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---- Go Home Confirmation Dialog ---- */}
        <Dialog
          open={showGoHomeConfirm}
          onOpenChange={setShowGoHomeConfirm}
        >
          <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden border-border/60 shadow-xl">
            <div className="p-5 pb-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-base">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <HomeIcon className="w-4 h-4 text-primary" />
                  </div>
                  Return to Homepage?
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
                  You&apos;ll be taken back to the homepage. Your thesis data
                  will be preserved and can be resumed anytime via the
                  &quot;Resume saved draft&quot; button.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-5 pb-5 pt-4">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGoHomeConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleGoHome}
                  className="gap-1.5"
                >
                  <HomeIcon className="w-3.5 h-3.5" />
                  Go to Homepage
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---- Reset Confirmation Dialog ---- */}
        <Dialog
          open={showResetConfirm}
          onOpenChange={setShowResetConfirm}
        >
          <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden border-border/60 shadow-xl">
            <div className="p-5 pb-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-base">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-4 h-4 text-destructive" />
                  </div>
                  Start New Thesis?
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
                  This will permanently clear all your current thesis data and
                  saved drafts. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-5 pb-5 pt-4">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Everything
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---- Easter Egg Dialog ---- */}
        <Dialog open={showEasterEgg} onOpenChange={setShowEasterEgg}>
          <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden border-border/60 shadow-xl">
            <div className="p-5 pb-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-base">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  You found the secret!
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Easter egg — secret dialog for discovering the Konami code
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-3">
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
                . Every pixel, every transition, every line of code was
                designed to make creating LaTeX theses effortless.
              </p>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[11px] text-primary font-medium leading-relaxed">
                  Fun fact: This app generates clean, compilable LaTeX that
                  works perfectly in Overleaf, TeXStudio, and any other LaTeX
                  editor.
                </p>
              </div>
              {/* Konami sequence display */}
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
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="w-6 h-6 rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground flex items-center justify-center"
                  >
                    {key}
                  </motion.span>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
