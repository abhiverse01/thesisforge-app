"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useThesisStore, type WizardStep } from "@/lib/thesis-store";
import { historyStack } from "@/core/history";
import { intelligenceScheduler } from "@/intelligence/scheduler";
import { saveDraft, loadDraft, clearDraft, createSnapshot, onSaveStatus } from "@/core/persistence";
import { importFile, type ImportFileResult } from "@/core/importer";
import { exportThesis } from "@/core/export";
import { captureState, restoreState, getStepLabel, KONAMI_CODE } from "./constants";

export function useWizardHooks() {
  // "use no memo" — React Compiler exclusion: canGoToStep selector causes ReferenceError with compiler optimization
  const currentStep = useThesisStore(s => s.currentStep);
  const selectedTemplate = useThesisStore(s => s.selectedTemplate);
  const thesis = useThesisStore(s => s.thesis);
  const wizardStarted = useThesisStore(s => s.wizardStarted);
  const setStep = useThesisStore(s => s.setStep);
  const nextStep = useThesisStore(s => s.nextStep);
  const prevStep = useThesisStore(s => s.prevStep);
  const canGoNext = useThesisStore(s => s.canGoNext);
  const canGoToStep = useThesisStore(s => s.canGoToStep);
  const lastDeletedChapter = useThesisStore(s => s.lastDeletedChapter);
  const lastDeletedReference = useThesisStore(s => s.lastDeletedReference);
  const undoDeleteChapter = useThesisStore(s => s.undoDeleteChapter);
  const undoDeleteReference = useThesisStore(s => s.undoDeleteReference);
  const exportProject = useThesisStore(s => s.exportProject);
  const importProject = useThesisStore(s => s.importProject);
  const reset = useThesisStore(s => s.reset);
  const goToHome = useThesisStore(s => s.goToHome);
  const isGenerating = useThesisStore(s => s.isGenerating);
  const setGenerating = useThesisStore(s => s.setGenerating);
  const setSaveStatus = useThesisStore(s => s.setSaveStatus);
  const { theme, setTheme } = useTheme();

  // FIX: isNarrow tracks < 768px (md breakpoint) for the intelligence panel Sheet.
  // useIsMobile() uses 640px (sm breakpoint), but the floating trigger button
  // uses md:hidden (768px), creating a 640-768px dead zone where the button
  // is visible but the Sheet never renders. isNarrow closes this gap.
  // FIX: Initialize to false to match SSR output and prevent hydration mismatch.
  // The useEffect fires immediately on mount and corrects the value.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768);
    check();
    const mql = window.matchMedia('(max-width: 767px)');
    mql.addEventListener('change', check);
    return () => mql.removeEventListener('change', check);
  }, []);

  // ---- Dialog states ----
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showGoHomeConfirm, setShowGoHomeConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIntelligencePanel, setShowIntelligencePanel] = useState(false);
  // FIX: Mobile panel open state — used by the floating trigger button on mobile.
  // Separate from showIntelligencePanel because the floating button needs
  // to control a Sheet overlay, not the inline sidebar.
  const [mobileIntelligenceOpen, setMobileIntelligenceOpen] = useState(false);
  const [showShortcutHint, setShowShortcutHint] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // FIX(Production): Track completeness score for the floating trigger badge.
  // Subscribes to the intelligence scheduler's internal results state.
  // GODMODE 8: Changed from useRef to useState — refs don't trigger re-renders,
  // so the badge was permanently stuck at 0. useState ensures the badge
  // updates when the score changes (React 18+ batching skips re-renders if value unchanged).
  const [completenessScore, setCompletenessScore] = useState(0);

  // ---- Smart Import System state ----
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportFileResult | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // ---- Refs ----
  const konamiBuffer = useRef<string[]>([]);
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedChapterShownRef = useRef(false);
  const deletedRefShownRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const historyInitRef = useRef(false);
  // GODMODE 13: JSON export double-fire guard — prevents duplicate downloads
  // when user double-clicks Export Project (.json) on slow connections.
  const exportJsonInProgressRef = useRef(false);
  // GODMODE 13: Ref for showShortcutHint — used inside async snapshot callback
  // to avoid stale closure capturing the boolean at call time.
  const showShortcutHintRef = useRef(false);
  const autoSaveToastShownRef = useRef(false);
  const saveStatusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // GODMODE 12: Debounce guard for Ctrl+S snapshot — prevents toast spam
  // and IndexedDB quota waste from rapid Ctrl+S mashing (common habit).
  const snapshotCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // GODMODE 12: Export double-fire guard — prevents duplicate ZIP generation
  // when user double-clicks the Export button on slow connections.
  const exportInProgressRef = useRef(false);
  const thesisImportInputRef = useRef<HTMLInputElement>(null);

  // ================================================================
  // Scroll detection for frosted header
  // ================================================================
  useEffect(() => {
    const handleScroll = () => {
      const mainEl = mainRef.current;
      if (mainEl) {
        setScrolled(mainEl.scrollTop > 0);
      } else {
        setScrolled(window.scrollY > 0);
      }
    };
    const mainEl = mainRef.current;
    const target = mainEl || window;
    target.addEventListener('scroll', handleScroll, true);
    handleScroll();
    return () => target.removeEventListener('scroll', handleScroll, true);
  }, []);

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
            currentStep: Math.min(draft.step, 6) as WizardStep,
            wizardStarted: true,
            _hydrated: true,
          });
          setTimeout(() => {
            toast.info("Restored from draft", {
              description: "Your progress has been loaded from IndexedDB.",
              duration: 2500,
            });
          }, 100);
        }
      }).catch(() => {
        // GODMODE 9 FIX: Previously unhandled — IndexedDB failures (quota, corrupt DB,
        // private browsing) caused silent unhandled promise rejection.
        // Now we silently fail but mark hydrated so the app doesn't hang.
      });
      // FIX(Production): Always mark store as hydrated after load attempt completes,
      // even if no draft was found. This prevents the editor page from hanging
      // while waiting for hydration that already finished.
      useThesisStore.getState().setHydrated();
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
  // Subscribe to save status events from persistence layer
  // ================================================================
  useEffect(() => {
    if (!wizardStarted) return;

    const unsubscribe = onSaveStatus((status) => {
      if (status === 'saving') {
        setSaveStatus('saving');
      } else if (status === 'saved') {
        setSaveStatus('saved');

        // Bug 8: One-time "Auto-save is on" toast on first successful save
        if (!autoSaveToastShownRef.current) {
          autoSaveToastShownRef.current = true;
          toast.success("Auto-save is on", {
            description: "Your progress is saved automatically to this browser.",
            duration: 4000,
          });
        }

        // Reset to idle after 2 seconds
        if (saveStatusResetRef.current) clearTimeout(saveStatusResetRef.current);
        saveStatusResetRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else if (status === 'error' || status === 'quota-exceeded' || status === 'conflict') {
        setSaveStatus('error');
      }
    });

    return () => {
      unsubscribe();
      if (saveStatusResetRef.current) clearTimeout(saveStatusResetRef.current);
    };
  }, [wizardStarted, setSaveStatus]);

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

  // FIX: Reset scroll position when wizardStarted changes.
  // Runs in BOTH directions (homepage→wizard AND wizard→homepage)
  // to ensure no leftover scroll state from the previous view.
  // FIX: Use behavior:'instant' to bypass the html scroll-behavior:smooth rule.
  useEffect(() => {
    const mainEl = mainRef.current;
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }, [wizardStarted]);

  // FIX: Scroll + layout reset on navigation back from blog/vs pages.
  // Uses PopState event because Next.js App Router doesn't always re-mount.
  // NOTE: Removed visibilitychange listener — it was calling window.scrollTo(0,0)
  // on every tab switch, which froze the perceived scroll position on the homepage.
  useEffect(() => {
    const handleRestore = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (useThesisStore.getState().wizardStarted) {
        const mainEl = mainRef.current;
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
      }
    };
    window.addEventListener('popstate', handleRestore);
    return () => {
      window.removeEventListener('popstate', handleRestore);
    };
  }, []);

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

    // GODMODE 12: Increased debounce from 500ms to 2000ms.
    // Every keystroke triggers this effect (thesis dependency), and at 500ms
    // the undo history fills with trivial intermediate states (partial words).
    // 2000ms captures meaningful edits (sentence-level changes) while
    // keeping the undo stack manageable. Users still get accurate undo
    // because captureState() reads the CURRENT store state at debounce time.
    const timeout = setTimeout(() => {
      historyStack.push(captureState(), `Step ${currentStep}: ${getStepLabel(currentStep)}`);
    }, 2000);

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
            if (canGoNext()) nextStep();
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
            // GODMODE 12: Add debounce guard — rapid Ctrl+S fires toast spam
            // and wastes IndexedDB quota. 2s cooldown prevents double-fire.
            if (thesis && selectedTemplate) {
              // GODMODE 12: 2-second cooldown prevents rapid Ctrl+S toast spam
              if (snapshotCooldownRef.current) {
                toast.info("Snapshot cooldown", { description: "Wait a moment before saving again.", duration: 1500 });
                break;
              }
              snapshotCooldownRef.current = setTimeout(() => { snapshotCooldownRef.current = null; }, 2000);
              // GODMODE 13: Use ref for showShortcutHint check — the .then() callback
              // captures `showShortcutHint` at call time, but the value may change
              // before IndexedDB resolves (user presses ? during the save). The ref
              // always reads the latest value, preventing a stale first-save toast.
              createSnapshot(thesis, "Manual save").then((id) => {
                if (!showShortcutHintRef.current) {
                  showShortcutHintRef.current = true;
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
  }, [selectedTemplate, nextStep, prevStep, wizardStarted, currentStep, canGoNext, thesis, showShortcutHint]);

  // ================================================================
  // CustomEvent listener for NavigationRail shortcuts button.
  // GODMODE FIX: Synthetic KeyboardEvent from NavigationRail wasn't being
  // caught by React's event delegation. CustomEvent guarantees delivery.
  // ================================================================
  useEffect(() => {
    const handleToggleShortcuts = () => setShowShortcuts(true);
    document.addEventListener("tf:toggle-shortcuts", handleToggleShortcuts);
    return () => document.removeEventListener("tf:toggle-shortcuts", handleToggleShortcuts);
  }, []);

  // ================================================================
  // Intelligence Panel — Feed data to scheduler on step/data change
  // FIX: Coarse outer debounce prevents every keystroke from triggering
  // a full algorithm pipeline run (which was freezing the UI).
  // FIX: Only feed data when the intelligence panel is actually visible,
  // so hidden-panel users don't pay the CPU cost of 10+ algorithms.
  // ================================================================
  const intelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Gate: only run intelligence when panel is visible and we have data
    if (thesis && selectedTemplate && showIntelligencePanel) {
      intelligenceScheduler.updateData(thesis, selectedTemplate);
      if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current);
      intelDebounceRef.current = setTimeout(() => {
        intelligenceScheduler.scheduleRun(currentStep);
      }, 1500); // Coarse gate — don't spam on every keystroke (increased from 800ms)
    }
    return () => { if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current); };
  }, [thesis, selectedTemplate, currentStep, showIntelligencePanel]);

  // ================================================================
  // Track completeness score for floating trigger badge.
  // FIX: Use the scheduler's public getResults() API instead of accessing
  // private _state field (which doesn't exist). The old code accessed
  // (intelligenceScheduler as any)._state which always threw, making
  // completenessRef stale at 0 forever.
  // ================================================================
  useEffect(() => {
    if (!showIntelligencePanel) return;
    // Poll every 2s while panel is open to capture latest results
    const id = setInterval(() => {
      try {
        const results = intelligenceScheduler.getResults();
        if (results?.completeness?.score != null) {
          setCompletenessScore(results.completeness.score);
        }
      } catch { /* scheduler may be disposed */ }
    }, 2000);
    return () => clearInterval(id);
  }, [showIntelligencePanel]);

  // ================================================================
  // Smart Import System — listen for apply events from modal
  // ================================================================
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        try {
          useThesisStore.getState().applyImportData(detail);
          const fieldsCount = detail.mappings?.length || 0;
          toast.success(`Imported ${detail.result?.fileName}`, {
            description: `${fieldsCount} fields, ${detail.result?.chapters?.length || 0} chapters, ${detail.result?.references?.length || 0} references${detail.result?.newcommands?.length ? `, ${detail.result.newcommands.length} custom commands` : ''} applied.`,
            duration: 5000,
          });
        } catch (err: any) {
          toast.error('Failed to apply import', {
            description: err.message || 'An unexpected error occurred.',
            duration: 4000,
          });
        }
      }
    };
    window.addEventListener('thesisforge:import-apply', handler);
    return () => window.removeEventListener('thesisforge:import-apply', handler);
  }, []);

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

  // FIX: Stable callback refs for IntelligencePanel so React.memo works correctly
  const handleCloseIntelligencePanel = useCallback(() => {
    setShowIntelligencePanel(false);
    setMobileIntelligenceOpen(false);
  }, []);

  // FIX: Sync mobile sheet with intelligence panel state for hamburger menu path
  // Uses isNarrow (< 768px) to match the Sheet rendering condition
  useEffect(() => {
    if (showIntelligencePanel && isNarrow) {
      setMobileIntelligenceOpen(true);
    }
  }, [showIntelligencePanel, isNarrow]);

  // ---- Smart Import: PDF/tex file import ----
  const handleThesisImportClick = useCallback(() => {
    thesisImportInputRef.current?.click();
  }, []);

  const handleThesisFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    setImporting(true);
    try {
      // Multiple files — merge all results into one combined import
      let bestResult: ImportFileResult | null = null;
      const allChapters: any[] = [];
      const allReferences: any[] = [];
      const allWarnings: string[] = [];

      for (const file of files) {
        try {
          const result = await importFile(file);
          if (!bestResult) bestResult = result;
          if (result.result.chapters) allChapters.push(...result.result.chapters);
          if (result.result.references) allReferences.push(...result.result.references);
          if (result.result.warnings) allWarnings.push(...result.result.warnings);
        } catch (err: any) {
          toast.error(`Skipped "${file.name}": ${err.message || 'Import failed'}`, { duration: 3000 });
        }
      }

      if (bestResult) {
        const mergedResult = {
          ...bestResult,
          result: {
            ...bestResult.result,
            chapters: allChapters,
            references: allReferences,
            warnings: [`Merged ${files.length} files`, ...allWarnings],
          },
        };
        setImportResult(mergedResult);
        setImportModalOpen(true);
      } else {
        toast.error('All files failed to import. Check the files and try again.', { duration: 4000 });
      }
    } finally {
      setImporting(false);
    }
  }, []);

  // GODMODE 13: handleExport with double-fire guard + delayed URL revocation.
  // Without double-fire guard, users on slow connections who double-click Export
  // trigger two parallel Blob downloads — the second may overwrite the first.
  // Without delayed revocation, some browsers abort the download before it starts
  // because revokeObjectURL is called before the browser has initiated the fetch.
  const handleExport = useCallback(() => {
    if (exportJsonInProgressRef.current) return;
    exportJsonInProgressRef.current = true;
    try {
      const json = exportProject();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Include thesis title in filename for easy identification
      const titleSlug = thesis?.metadata?.title
        ? thesis.metadata.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(0, 40)
        : 'thesis';
      a.download = `thesisforge-${new Date().toISOString().slice(0, 10)}-${titleSlug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // GODMODE 13: Delay revocation by 60s — gives the browser time to initiate
      // the download. Some browsers (Chrome) need a brief window between the
      // click and the revoke. Without this, revocation happens before the
      // navigation starts, producing a network error instead of a download.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("Project exported", { duration: 2000 });
    } catch {
      toast.error("Export failed", { duration: 3000 });
    } finally {
      exportJsonInProgressRef.current = false;
    }
    setMobileMenuOpen(false);
  }, [exportProject, thesis]);

  // GODMODE 13: Removed duplicate handleImport (was defined again at line 923).
  // The function was declared twice — the second silently shadowed the first.
  // Dead code eliminated. The canonical definition is below handleExportZip.

  // GODMODE 12: handleExportZip with double-fire guard.
  // Without this, users on slow connections who double-click Export
  // trigger two parallel ZIP generations — the second overwrites the
  // first, wasting CPU and potentially producing a corrupted ZIP if the
  // first write is interrupted mid-stream.
  const handleExportZip = useCallback(async () => {
    if (exportInProgressRef.current) return;
    if (!thesis || !selectedTemplate) {
      toast.error("No thesis to export");
      return;
    }
    exportInProgressRef.current = true;
    setGenerating(true);
    try {
      const result = await exportThesis(thesis, selectedTemplate);
      if (result.errors && result.errors.length > 0) {
        // Download succeeded but with warnings — inform user
        toast.warning("Exported with warnings", {
          description: `Downloaded, but ${result.errors.length} issue(s) found. Review before compiling.`,
          duration: 5000,
        });
      } else {
        toast.success("Your thesis is ready", {
          description: "Compile it in Overleaf to get your PDF.",
          duration: 5000,
        });
      }
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : "Failed to create ZIP file.",
        duration: 4000,
      });
    } finally {
      setGenerating(false);
      exportInProgressRef.current = false;
    }
  }, [thesis, selectedTemplate, setGenerating]);

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
      // GODMODE 13: Add FileReader error handler — previously if readAsText failed
      // (permission denied, corrupted file), no error was shown to the user.
      reader.onerror = () => {
        toast.error("Failed to read file", {
          description: "The file could not be read. Please try again.",
          duration: 3000,
        });
      };
      reader.readAsText(file);
      e.target.value = "";
      setMobileMenuOpen(false);
    },
    [importProject]
  );

  const handleGoToStep = useCallback(
    (step: WizardStep) => {
      // GODMODE 13: Validate step access BEFORE calling setStep.
      // Store's setStep() silently blocks (returns without setting state) when
      // validation fails, but the user gets zero feedback — the button just
      // doesn't respond, which feels broken. Show a toast explaining why.
      const state = useThesisStore.getState();
      if (step > state.currentStep && step <= 6) {
        const canGo = state.canGoToStep(step);
        if (!canGo) {
          toast.info(`Step ${step} locked`, {
            description: `Complete the current step first to unlock ${getStepLabel(step)}.`,
            duration: 2500,
          });
          return;
        }
      }
      setStep(step);
      setShowShortcuts(false);
      setMobileMenuOpen(false);
      // FLUIDITY: instant scroll to top when changing steps.
      // FIXTEN: Use behavior:'instant' to prevent race with AnimatePresence fade animation.
      // Smooth scroll creates a visible jump when the step content fades in at y:12.
      const mainEl = mainRef.current;
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'instant' });
      }
    },
    [setStep]
  );

  return {
    // Store values
    currentStep,
    selectedTemplate,
    thesis,
    wizardStarted,
    setStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoToStep,
    isGenerating,
    goToHome,

    // Theme
    theme,
    setTheme,

    // Local state
    isNarrow,
    scrolled,
    showShortcuts,
    setShowShortcuts,
    showEasterEgg,
    setShowEasterEgg,
    showResetConfirm,
    setShowResetConfirm,
    showGoHomeConfirm,
    setShowGoHomeConfirm,
    mobileMenuOpen,
    setMobileMenuOpen,
    showIntelligencePanel,
    setShowIntelligencePanel,
    mobileIntelligenceOpen,
    setMobileIntelligenceOpen,
    completenessScore,
    importing,
    importResult,
    setImportResult,
    importModalOpen,
    setImportModalOpen,

    // Refs
    mainRef,
    fileInputRef,
    thesisImportInputRef,

    // Handlers
    handleReset,
    handleGoHome,
    handleCloseIntelligencePanel,
    handleThesisImportClick,
    handleThesisFileSelect,
    handleExport,
    handleExportZip,
    handleImport,
    handleFileChange,
    handleGoToStep,
  };
}
