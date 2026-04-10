"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { historyStack } from "@/core/history";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useThesisStore, type WizardStep } from "@/lib/thesis-store";
import { StepIndicator } from "@/components/thesis/step-indicator";
import { TemplateSelector } from "@/components/thesis/template-selector";
import { MetadataForm } from "@/components/thesis/metadata-form";
import { ChapterEditor } from "@/components/thesis/chapter-editor";
import { ReferenceEditor } from "@/components/thesis/reference-editor";
import { FormatEditor } from "@/components/thesis/format-editor";
import { GeneratePreview } from "@/components/thesis/generate-preview";
import { Homepage } from "@/components/thesis/homepage";
import IntelligencePanel from "@/components/thesis/intelligence-panel";
import { SaveIndicator } from "@/components/thesis/save-indicator";
import { intelligenceScheduler } from "@/intelligence/scheduler";
import { saveDraft, loadDraft, clearDraft, createSnapshot } from "@/core/persistence";
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
  Loader2,
  FileUp,
  Menu,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Download,
  Undo2,
  Redo2,
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
// Animation Variants — Simple fade + slight slide
// ============================================================

const fadeVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeTransition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as const,
};

// ============================================================
// Step Navigation Data
// ============================================================

const STEP_NAV: {
  step: WizardStep;
  name: string;
  description: string;
}[] = [
  { step: 1, name: "Template", description: "Choose thesis type" },
  { step: 2, name: "Metadata", description: "Title, abstract & info" },
  { step: 3, name: "Chapters", description: "Write content" },
  { step: 4, name: "References", description: "Manage citations" },
  { step: 5, name: "Format", description: "Configure output" },
  { step: 6, name: "Generate", description: "Preview & download" },
];

// Helper to get step label
function getStepLabel(step: WizardStep): string {
  return STEP_NAV.find((s) => s.step === step)?.name ?? `Step ${step}`;
}

// ============================================================
// Konami Code
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
// History helpers — serialize / restore thesis state
// ============================================================

function captureState(): string {
  const s = useThesisStore.getState();
  return JSON.stringify({
    thesis: s.thesis,
    selectedTemplate: s.selectedTemplate,
    currentStep: s.currentStep,
    wizardStarted: s.wizardStarted,
  });
}

function restoreState(entry: { state: string; description: string }, isUndo: boolean): void {
  try {
    const parsed = JSON.parse(entry.state);
    useThesisStore.setState({
      thesis: parsed.thesis,
      selectedTemplate: parsed.selectedTemplate,
      currentStep: parsed.currentStep,
      wizardStarted: parsed.wizardStarted,
      lastErrors: {},
      lastDeletedChapter: null,
      lastDeletedReference: null,
    });
    toast.success(isUndo ? "Undone" : "Redone", {
      description: entry.description,
      duration: 2000,
    });
  } catch {
    toast.error("History restore failed", { duration: 2000 });
  }
}

// ============================================================
// Main Component
// ============================================================

export default function Home() {
  const { currentStep, selectedTemplate, thesis, saveStatus, lastErrors, wizardStarted,
          setStep, nextStep, prevStep, canGoNext,
          lastDeletedChapter, lastDeletedReference,
          undoDeleteChapter, undoDeleteReference,
          exportProject, importProject,
          reset, goToHome, setSaveStatus } = useThesisStore();
  const { theme, setTheme } = useTheme();

  // ---- Dialog states ----
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showGoHomeConfirm, setShowGoHomeConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIntelligencePanel, setShowIntelligencePanel] = useState(false);
  const [showShortcutHint, setShowShortcutHint] = useState(false);
  const [showOverleafModal, setShowOverleafModal] = useState(false);
  const [overleafDownloading, setOverleafDownloading] = useState(false);
  const historyInitialized = useRef(false);
  const lastPushedState = useRef<string>("");

  // ---- Refs ----
  const konamiBuffer = useRef<string[]>([]);
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedChapterShownRef = useRef(false);
  const deletedRefShownRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyInitRef = useRef(false);

  // ================================================================
  // IndexedDB Persistence (first render only)
  // ================================================================
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      loadDraft().then((draft) => {
        if (draft?.thesis && draft?.templateId) {
          useThesisStore.setState({
            thesis: draft.thesis,
            selectedTemplate: draft.templateId,
            currentStep: Math.min(draft.step, 7) as WizardStep,
            wizardStarted: true,
          });
          setTimeout(() => {
            toast.info("Restored from draft", {
              description: "Your progress has been loaded from IndexedDB.",
              duration: 2500,
            });
          }, 100);
        }
      });
    }
  }, []);

  // ================================================================
  // Auto-save to IndexedDB — silent, no toast
  // ================================================================
  useEffect(() => {
    if (!wizardStarted || !thesis || !selectedTemplate) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(thesis, selectedTemplate, currentStep).catch(() => {
        // Silent fail for auto-save
      });
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [thesis, currentStep, wizardStarted, selectedTemplate]);

  // ================================================================
  // beforeunload — warn about unsaved changes
  // ================================================================
  useEffect(() => {
    if (!wizardStarted || !thesis) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [wizardStarted, thesis]);

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
  // Push to history on meaningful state changes (debounced)
  // ================================================================
  useEffect(() => {
    if (!wizardStarted || !thesis || !selectedTemplate) return;

    // Don't record on initial load
    if (!historyInitRef.current) {
      historyInitRef.current = true;
      historyStack.push(captureState(), "Initial state");
      return;
    }

    // Debounce to avoid recording every keystroke
    const timeout = setTimeout(() => {
      historyStack.push(captureState(), `Step ${currentStep}: ${getStepLabel(currentStep)}`);
    }, 500);

    return () => clearTimeout(timeout);
  }, [thesis, currentStep, selectedTemplate, wizardStarted]);

  // ================================================================
  // Keyboard Shortcuts + Konami Code + Undo/Redo
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

      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (!wizardStarted) return;

      const meta = e.ctrlKey || e.metaKey;

      if (meta) {
        // Undo: Ctrl+Z (without Shift)
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          const entry = historyStack.undo();
          if (entry) {
            restoreState(entry, true);
          }
          return;
        }

        // Redo: Ctrl+Shift+Z or Ctrl+Y
        if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          const entry = historyStack.redo();
          if (entry) {
            restoreState(entry, false);
          }
          return;
        }

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
          case "s":
          case "S":
            e.preventDefault();
            // Manual save snapshot via Ctrl+S
            if (thesis && selectedTemplate) {
              createSnapshot(thesis, "Manual save").then((id) => {
                if (!showShortcutHint) {
                  setShowShortcutHint(true);
                  toast.success("Snapshot saved", {
                    description: "Press ? to see all shortcuts",
                    duration: 3000,
                  });
                } else {
                  toast.success("Snapshot saved", {
                    description: `Snapshot #${id.slice(-6)} created.`,
                    duration: 2000,
                  });
                }
              }).catch(() => {
                toast.error("Snapshot failed", { duration: 2000 });
              });
            }
            break;
        }

        // Ctrl+Enter = NEXT step
        if (meta && e.key === "Enter") {
          e.preventDefault();
          if (canGoNext()) {
            nextStep();
          }
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
  }, [selectedTemplate, nextStep, prevStep, wizardStarted, currentStep, canGoNext, thesis]);

  // ================================================================
  // Intelligence Panel — Feed data to scheduler on step/data change
  // ================================================================
  useEffect(() => {
    if (thesis && selectedTemplate) {
      intelligenceScheduler.updateData(thesis, selectedTemplate);
      intelligenceScheduler.scheduleRun(currentStep);
    }
  }, [thesis, selectedTemplate, currentStep]);

  // ================================================================
  // Handlers
  // ================================================================
  const handleReset = useCallback(() => {
    clearDraft().catch(() => {
      // Silent fail
    });
    reset();
    historyStack.clear();
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
        return <ChapterEditor />;
      case 4:
        return <ReferenceEditor />;
      case 5:
        return <FormatEditor />;
      case 6:
        return <GeneratePreview />;
      default:
        return <TemplateSelector />;
    }
  };

  // ================================================================
  // Whether to show the intelligence panel inline
  // ================================================================
  const showPanelInline = wizardStarted && selectedTemplate && showIntelligencePanel;

  // ================================================================
  // Mobile menu items
  // ================================================================
  const mobileMenuItems = (
    <nav className="space-y-0.5">
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
              {currentStep === 1
                ? "Back to Homepage"
                : "Return to Templates"}
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
            {/* Left: Logo */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                ThesisForge
              </span>
            </div>

            {/* Save Indicator — center area */}
            <SaveIndicator />

            {/* Right: Desktop actions */}
            <div className="items-center gap-1 hidden sm:flex shrink-0">
              {wizardStarted && (
                <>
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
                        <span className="hidden lg:inline">Home</span>
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

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResetConfirm(true)}
                        className="text-xs gap-1.5 text-muted-foreground h-8"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">
                          New Thesis
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Start a new thesis</p>
                    </TooltipContent>
                  </Tooltip>

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
                      <p>Export project</p>
                    </TooltipContent>
                  </Tooltip>

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
                      <p>Import project</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              {wizardStarted && selectedTemplate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowIntelligencePanel(!showIntelligencePanel)}
                      className={cn(
                        "h-8 w-8 p-0 transition-colors",
                        showIntelligencePanel
                          ? "text-purple-500 bg-purple-500/10"
                          : "text-muted-foreground"
                      )}
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Intelligence Panel</p>
                  </TooltipContent>
                </Tooltip>
              )}

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
                  <p>
                    Shortcuts{" "}
                    <span className="kbd ml-1">?</span>
                  </p>
                </TooltipContent>
              </Tooltip>

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
                  <p>
                    Toggle {theme === "dark" ? "light" : "dark"} mode
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Mobile: Hamburger only */}
            <div className="flex sm:hidden items-center shrink-0">
              <Sheet
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[280px] pt-6 px-3"
                >
                  <SheetHeader className="px-2 pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                      <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                        <FileText className="w-3 h-3 text-primary-foreground" />
                      </div>
                      ThesisForge
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
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={fadeTransition}
              >
                <Homepage />
              </motion.div>
            ) : (
              <motion.div
                key="wizard"
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={fadeTransition}
                className={cn(
                  "px-4 sm:px-6 py-6 space-y-6",
                  showPanelInline
                    ? "max-w-[calc(1280px-1rem)] mx-auto"
                    : "max-w-4xl mx-auto"
                )}
              >
                {/* Step Indicator */}
                <AnimatePresence mode="wait">
                  {selectedTemplate && (
                    <motion.div
                      key="step-indicator"
                      variants={fadeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={fadeTransition}
                    >
                      <StepIndicator />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content + Intelligence Panel Grid */}
                <div className={cn(
                  showPanelInline && "grid gap-5",
                  showPanelInline
                    ? "grid-cols-1 lg:grid-cols-[1fr_320px]"
                    : ""
                )}>
                  {/* Step Content */}
                  <div className={cn(showPanelInline && "min-w-0")}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStep}
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={fadeTransition}
                      >
                        {renderStep()}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Intelligence Panel — Inline Sidebar */}
                  <AnimatePresence>
                    {showPanelInline && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 320 }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="hidden lg:block overflow-hidden"
                      >
                        <div className="sticky top-[calc(3.5rem+1.5rem)] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border/60 bg-card/50 shadow-lg">
                          <IntelligencePanel
                            isOpen={true}
                            onClose={() => setShowIntelligencePanel(false)}
                            currentStep={currentStep}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ============================================================ */}
        {/* GLOBAL WIZARD FOOTER — Back / Step Label / Next or Export */}
        {/* ============================================================ */}
        <AnimatePresence>
          {wizardStarted && (
            <motion.footer
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="sticky bottom-0 z-40 border-t bg-background/80 backdrop-blur-xl"
            >
              <div className={cn(
                "px-4 sm:px-6 h-14 flex items-center justify-between gap-3",
                showPanelInline
                  ? "max-w-[calc(1280px-1rem)] mx-auto"
                  : "max-w-4xl mx-auto"
              )}>
                {/* LEFT: BACK */}
                <div className="flex items-center gap-2 min-w-0">
                  {currentStep === 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGoHomeConfirm(true)}
                      className="text-xs gap-1.5 text-muted-foreground"
                    >
                      <HomeIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Return to Homepage</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevStep}
                      className="text-xs gap-1.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Back
                    </Button>
                  )}
                </div>

                {/* CENTER: Step label */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span className="font-medium text-foreground/80">
                    Step {currentStep}
                  </span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{getStepLabel(currentStep)}</span>
                </div>

                {/* RIGHT: NEXT or EXPORT */}
                <div className="flex items-center gap-2 min-w-0 justify-end">
                  {currentStep < 6 ? (
                    <Button
                      size="sm"
                      onClick={() => nextStep()}
                      disabled={!canGoNext()}
                      className="text-xs gap-1.5"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleExport}
                      className="text-xs gap-1.5 font-semibold"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.footer>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* FOOTER — Compact: tagline + developer credit (when not in wizard) */}
        {/* ============================================================ */}
        {!wizardStarted && (
          <footer className="border-t mt-auto bg-background/60 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5">
                {/* Tagline */}
                <p className="text-[10px] text-muted-foreground/50 text-center sm:text-left">
                  Paste content &rarr;{" "}
                  <code className="text-[9px] bg-secondary/50 px-1 py-0.5 rounded font-mono">
                    .tex
                  </code>{" "}
                  &rarr; Compile &rarr; PDF
                </p>

                {/* Developer credit */}
                <div className="flex items-center gap-2">
                  <a
                    href="https://abhishekshah.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 group"
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-[7px] font-bold text-primary">
                        AS
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      Abhishek Shah
                    </span>
                  </a>
                  <div className="w-px h-3 bg-border/40" />
                  <a
                    href="mailto:abhishek.aimarine@gmail.com"
                    className="text-muted-foreground/40 hover:text-primary transition-colors inline-flex items-center"
                    title="abhishek.aimarine@gmail.com"
                  >
                    <Mail className="w-3 h-3" />
                  </a>
                  <a
                    href="https://abhishekshah.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground/40 hover:text-primary transition-colors inline-flex items-center"
                    title="Portfolio"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Brand line */}
              <div className="mt-1.5 pt-1.5 border-t border-border/30 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground/25">
                  <span className="font-semibold">ThesisForge</span> by{" "}
                  <a
                    href="https://abhishekshah.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors underline underline-offset-1 decoration-muted-foreground/10 hover:decoration-primary"
                  >
                    Abhishek Shah
                  </a>{" "}
                  &middot; &copy; {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </footer>
        )}

        {/* ============================================================ */}
        {/* DIALOGS — Clean, no icons in headers */}
        {/* ============================================================ */}

        {/* ---- Keyboard Shortcuts ---- */}
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="sm:max-w-md rounded-xl">
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
              <DialogDescription className="sr-only">
                List of available keyboard shortcuts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
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
                  <p className="text-[11px] font-medium text-muted-foreground px-3 mb-2">
                    Go to Step
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 px-1">
                    {STEP_NAV.map((s) => (
                      <button
                        key={s.step}
                        onClick={() => handleGoToStep(s.step)}
                        className={cn(
                          "px-2 py-2.5 rounded-lg text-center transition-colors",
                          currentStep === s.step
                            ? "bg-primary text-primary-foreground"
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
            </div>
          </DialogContent>
        </Dialog>

        {/* ---- Go Home Confirmation ---- */}
        <Dialog
          open={showGoHomeConfirm}
          onOpenChange={setShowGoHomeConfirm}
        >
          <DialogContent className="sm:max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>Return to Homepage?</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Your progress is auto-saved. You can pick up where you left off by clicking "Resume saved draft" on the homepage.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
                Go to Homepage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Reset Confirmation ---- */}
        <Dialog
          open={showResetConfirm}
          onOpenChange={setShowResetConfirm}
        >
          <DialogContent className="sm:max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>Start New Thesis?</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                This will clear all your thesis data. Make sure you've exported your work first — this can't be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
                Reset Everything
              </Button>
            </DialogFooter>
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
                    className="w-6 h-6 rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground flex items-center justify-center"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
