"use client";

import React from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StepIndicator } from "@/components/thesis/step-indicator";
import { ImportReviewModal } from "@/components/thesis/ImportReviewModal";
import { ChunkLoadRecovery } from "@/components/thesis/wizard/chunk-load-recovery";
import { WizardHeader } from "@/components/thesis/wizard/header";
import { WizardFooter } from "@/components/thesis/wizard/wizard-footer";

import { IntelligenceFloat } from "@/components/thesis/wizard/intelligence-float";
import { WizardDialogs } from "@/components/thesis/wizard/dialogs";
import { useWizardHooks } from "@/components/thesis/wizard/use-wizard-hooks";
import { NavigationRail } from "@/components/thesis/NavigationRail";
import { fadeVariants, fadeTransition } from "@/components/thesis/wizard/constants";
import { TemplateSelector } from "@/components/thesis/template-selector";

// FIX: Memoize IntelligencePanel to prevent unnecessary re-renders.
// Root cause: Home component re-renders on every thesis store change (every keystroke),
// which cascades into IntelligencePanel even though its props haven't changed.
// React.memo ensures IntelligencePanel only re-renders when its 3 props actually change.
const IntelligencePanelDynamic = dynamic(
  () => import("@/components/thesis/intelligence-panel").then((m) => ({ default: m.default })),
  { ssr: false }
);
const IntelligencePanel = React.memo(IntelligencePanelDynamic);

// Lightweight loading skeleton for lazy-loaded step components
function StepSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-32 w-full rounded-lg bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
    </div>
  );
}

// ROOT CAUSE FIX: TemplateSelector is now a DIRECT import instead of next/dynamic.
// Turbopack dev server frequently fails to serve dynamically imported chunks
// (ChunkLoadError: "Failed to load chunk ... from module template-selector.tsx").
// Since TemplateSelector is Step 1 — the very first component rendered when the
// wizard starts — lazy-loading it provides no benefit. The chunk error was caused
// by Turbopack's HMR serving stale chunk hashes for code-split modules. Direct
// import eliminates the chunk loading path entirely, fixing the error at its root.
const MetadataForm = dynamic(
  () => import("@/components/thesis/metadata-form").then((m) => ({ default: m.MetadataForm })),
  { loading: () => <StepSkeleton />, ssr: false }
);
const ChapterEditor = dynamic(
  () => import("@/components/thesis/chapter-editor").then((m) => ({ default: m.ChapterEditor })),
  { loading: () => <StepSkeleton />, ssr: false }
);
const ReferenceEditor = dynamic(
  () => import("@/components/thesis/reference-editor").then((m) => ({ default: m.ReferenceEditor })),
  { loading: () => <StepSkeleton />, ssr: false }
);
const FormatEditor = dynamic(
  () => import("@/components/thesis/format-editor").then((m) => ({ default: m.FormatEditor })),
  { loading: () => <StepSkeleton />, ssr: false }
);
const GeneratePreview = dynamic(
  () => import("@/components/thesis/generate-preview").then((m) => ({ default: m.GeneratePreview })),
  { loading: () => <StepSkeleton />, ssr: false }
);
const Homepage = dynamic(
  () => import("@/components/thesis/homepage").then((m) => ({ default: m.Homepage })),
  { loading: () => <StepSkeleton />, ssr: false }
);

// ============================================================
// Main Component
// ============================================================

export default function Home() {
  const {
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
  } = useWizardHooks();

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
  // Render
  // ================================================================
  return (
    <ChunkLoadRecovery>
    <TooltipProvider delayDuration={300}>
      {/* FIX: Root div is always fixed viewport with overflow-hidden.
           Main element is ALWAYS the scroll context (overflow-y-auto + min-h-0).
           This ensures mainRef.current.scrollTop works for header frosted-glass detection
           in BOTH homepage and wizard modes. Previously homepage used root div as scroll
           context, which broke scrolled state detection (root div scroll ≠ mainRef.scrollTop). */}
      <div className={cn("flex flex-col bg-pattern", "h-dvh [height:100dvh] h-screen overflow-hidden")}>
        {/* Navigation Rail — 52px left sidebar */}
        <NavigationRail />
        {/* Hidden file input for .json project import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Import ThesisForge project file"
        />

        {/* Hidden file input for PDF/tex thesis import */}
        <input
          ref={thesisImportInputRef}
          type="file"
          accept=".pdf,.tex,.docx,.doc,.md,.txt"
          multiple
          onChange={handleThesisFileSelect}
          className="hidden"
          aria-label="Import thesis files (PDF, LaTeX, Word, Markdown, Text)"
        />

        {/* Import Review Modal */}
        <ImportReviewModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          imported={importResult}
        />

        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <WizardHeader
          wizardStarted={wizardStarted}
          currentStep={currentStep}
          selectedTemplate={selectedTemplate}
          scrolled={scrolled}
          isNarrow={isNarrow}
          showIntelligencePanel={showIntelligencePanel}
          mobileMenuOpen={mobileMenuOpen}
          theme={theme}
          importing={importing}
          setStep={setStep}
          setShowIntelligencePanel={setShowIntelligencePanel}
          setMobileIntelligenceOpen={setMobileIntelligenceOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          setShowResetConfirm={setShowResetConfirm}
          setShowGoHomeConfirm={setShowGoHomeConfirm}
          setShowShortcuts={setShowShortcuts}
          setTheme={setTheme}
          handleExport={handleExport}
          handleImport={handleImport}
          handleThesisImportClick={handleThesisImportClick}
        />

        {/* ============================================================ */}
        {/* MAIN CONTENT */}
        {/* ============================================================ */}
        {/* FLUIDITY: scroll-smooth class + overscroll-contain prevents scroll chaining */}
        {/* FIX: overscroll-contain prevents scroll chaining on mobile.
             touch-manipulation disables double-tap zoom for smoother mobile interaction.
             -webkit-overflow-scrolling enables momentum scrolling on iOS < 16.
             GODMODE: main is ALWAYS the scroll context (both homepage and wizard).
             This fixes scroll detection — mainRef.current.scrollTop > 0 now works
             in homepage mode, enabling the header's frosted-glass backdrop effect. */}
        <main ref={mainRef} className={cn(
          "flex-1 tf-content-area min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-manipulation"
        )}>
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
                  // GODMODE FIX: Bottom padding clears the wizard footer.
                  // Footer is max-h-[88px] + pb-[max(0.75rem, safe-area)] = ~122px on iPhone.
                  // 7.5rem (120px) + safe-area matches the footer height for consistent spacing.
                  "px-4 sm:px-6 py-6 space-y-6 pb-[max(1.5rem,calc(7.5rem+env(safe-area-inset-bottom,0px)))]"
                )}
              >
                {/* Step Indicator */}
                {/* FLUIDITY: step indicator with will-change-transform for GPU acceleration */}
                <AnimatePresence mode="wait">
                  {selectedTemplate && (
                    <motion.div
                      key="step-indicator"
                      variants={fadeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={fadeTransition}
                      className="will-change-transform"
                    >
                      <StepIndicator />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content + Intelligence Panel Grid */}
                {/* GODMODE FIX: grid-cols-1 on mobile (no inline sidebar), md:grid-cols on desktop.
                     On mobile, the intelligence panel renders as a Sheet overlay (below),
                     so the grid should NOT include the sidebar column on mobile.
                     Previously the grid was applied even when showPanelInline was false,
                     which could cause layout flicker when toggling the panel. */}
                {/* S1 FIX: CSS Grid transition replaces AnimatePresence width animation.
                     Root cause: AnimatePresence animated width 0→320 INDEPENDENTLY of the
                     CSS grid, causing a snap/jump when the grid column changed. Now the grid
                     itself handles the smooth layout via grid-template-columns transition.
                     The sidebar content uses a simple opacity fade (no width animation).
                     Key: both open (1fr 320px) and closed (1fr 0px) states use the same
                     value format, enabling browser-native interpolation. */}
                <div
                  className={cn(
                    "grid gap-5 grid-cols-1",
                    selectedTemplate && "md:grid-cols-[1fr_320px]",
                    // Transition only applied when selectedTemplate exists on desktop
                    selectedTemplate && !isNarrow && "transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  )}
                  style={
                    // Override grid-template-columns when panel is closed on desktop.
                    // Inline style beats Tailwind class specificity, ensuring 1fr 0px
                    // takes effect. When panel opens, inline style is removed and the
                    // class (1fr 320px) takes over, creating a smooth transition.
                    selectedTemplate && !isNarrow && !showPanelInline
                      ? { gridTemplateColumns: '1fr 0px' }
                      : undefined
                  }
                >
                  {/* Step Content */}
                  <div className={cn(showPanelInline && "min-w-0", "min-h-[400px]")}>
                    {/* GODMODE FIX: layout prop removed on mobile to prevent GPU repaints.
                         Framer Motion layout animations recalculate positions on every render,
                         which causes jank on mobile GPUs. The fade+slide variants already
                         provide smooth step transitions without the layout cost. */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStep}
                        layout={!isNarrow}
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

                  {/* Intelligence Panel — Inline Sidebar.
                       Always rendered on desktop when selectedTemplate exists so the grid
                       column is always present (needed for CSS grid transition to work).
                       Content visibility is controlled by opacity + pointer-events. */}
                  {selectedTemplate && !isNarrow && (
                    <div
                      className="hidden md:block overflow-hidden transition-opacity duration-200"
                      style={{
                        opacity: showPanelInline ? 1 : 0,
                        pointerEvents: showPanelInline ? 'auto' : 'none',
                      }}
                    >
                      <div className="sticky top-[calc(3.5rem+1.5rem+env(safe-area-inset-top,0px))] max-h-[calc(100dvh-5.5rem-env(safe-area-inset-top,0px))] overflow-y-auto rounded-xl border border-border/60 bg-card/50 shadow-lg w-[320px]">
                        <IntelligencePanel
                          isOpen={true}
                          onClose={handleCloseIntelligencePanel}
                          currentStep={currentStep}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Intelligence Panel — Mobile Sheet + Floating Trigger */}
        <IntelligenceFloat
          wizardStarted={wizardStarted}
          isNarrow={isNarrow}
          selectedTemplate={selectedTemplate}
          currentStep={currentStep}
          showIntelligencePanel={showIntelligencePanel}
          mobileIntelligenceOpen={mobileIntelligenceOpen}
          completenessScore={completenessScore}
          setShowIntelligencePanel={setShowIntelligencePanel}
          setMobileIntelligenceOpen={setMobileIntelligenceOpen}
          handleCloseIntelligencePanel={handleCloseIntelligencePanel}
        />

        {/* Wizard Footer */}
        {wizardStarted && (
            <WizardFooter
              currentStep={currentStep}
              canGoNext={canGoNext}
              prevStep={prevStep}
              nextStep={nextStep}
              handleExportZip={handleExportZip}
              isGenerating={isGenerating}
              isNarrow={isNarrow}
              setShowGoHomeConfirm={setShowGoHomeConfirm}
              goToHome={goToHome}
            />
        )}

        {/* Homepage Footer is now rendered inside the Homepage component (Section 7) */}

        {/* Dialogs */}
        <WizardDialogs
          showShortcuts={showShortcuts}
          showEasterEgg={showEasterEgg}
          showResetConfirm={showResetConfirm}
          showGoHomeConfirm={showGoHomeConfirm}
          wizardStarted={wizardStarted}
          currentStep={currentStep}
          selectedTemplate={selectedTemplate}
          setShowShortcuts={setShowShortcuts}
          setShowEasterEgg={setShowEasterEgg}
          setShowResetConfirm={setShowResetConfirm}
          setShowGoHomeConfirm={setShowGoHomeConfirm}
          handleGoHome={handleGoHome}
          handleReset={handleReset}
          handleGoToStep={handleGoToStep}
          canGoToStep={canGoToStep}
        />
      </div>
    </TooltipProvider>
    </ChunkLoadRecovery>
  );
}
