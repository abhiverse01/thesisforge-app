"use client";

import React from "react";
import Link from "next/link";
import type { WizardStep } from "@/lib/thesis-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/thesis/Logo";
import { SaveIndicator, SaveIndicatorMobile } from "@/components/thesis/save-indicator";
import { NavbarDate } from "./navbar-date";
import {
  Moon,
  Sun,
  RotateCcw,
  Home as HomeIcon,
  Keyboard,
  FileDown,
  Loader2,
  FileUp,
  Upload,
  Menu,
  BrainCircuit,
  ExternalLink,
  BookOpen,
} from "lucide-react";

export interface WizardHeaderProps {
  wizardStarted: boolean;
  currentStep: WizardStep;
  selectedTemplate: string | null;
  scrolled: boolean;
  isNarrow: boolean;
  showIntelligencePanel: boolean;
  mobileMenuOpen: boolean;
  theme: string | undefined;
  importing: boolean;
  // Handlers
  setStep: (step: WizardStep) => void;
  setShowIntelligencePanel: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileIntelligenceOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResetConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGoHomeConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  setTheme: (theme: string) => void;
  handleExport: () => void;
  handleImport: () => void;
  handleThesisImportClick: () => void;
}

export function WizardHeader({
  wizardStarted,
  currentStep,
  selectedTemplate,
  scrolled,
  isNarrow,
  showIntelligencePanel,
  mobileMenuOpen,
  theme,
  importing,
  setStep,
  setShowIntelligencePanel,
  setMobileIntelligenceOpen,
  setMobileMenuOpen,
  setShowResetConfirm,
  setShowGoHomeConfirm,
  setShowShortcuts,
  setTheme,
  handleExport,
  handleImport,
  handleThesisImportClick,
}: WizardHeaderProps) {

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
              "w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm transition-colors text-left",
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
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>New Thesis</span>
          </button>

          <div className="h-px bg-border my-1.5 mx-2" />

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span>Export Project (.json)</span>
          </button>

          <button
            onClick={handleImport}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
          >
            <FileUp className="w-4 h-4 shrink-0" />
            <span>Import Project (.json)</span>
          </button>

          <button
            onClick={() => {
              handleThesisImportClick();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>Import Thesis Files</span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">multi-file</span>
          </button>

          <div className="h-px bg-border my-1.5 mx-2" />

          <button
            onClick={() => {
              const next = !showIntelligencePanel;
              // Close hamburger first, then open intelligence Sheet on next frame
              // to prevent Sheet stacking issues on mobile.
              // FIX: Use setTimeout instead of requestAnimationFrame.
              // rAF fires too quickly — the hamburger Sheet close animation
              // hasn't started yet, causing Sheet stacking on mobile.
              // 150ms gives Radix time to begin the close transition.
              setMobileMenuOpen(false);
              setTimeout(() => {
                setShowIntelligencePanel(next);
                setMobileIntelligenceOpen(next);
              }, 150);
            }}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm transition-colors text-left"
          >
            <BrainCircuit className="w-4 h-4 shrink-0" />
            <span>Intelligence Panel</span>
            <span className={cn(
              "w-2 h-2 rounded-full ml-auto shrink-0 transition-colors",
              showIntelligencePanel ? "bg-[var(--c-brand-600,#534AB7)]" : "bg-muted-foreground/30"
            )} />
          </button>
        </>
      )}

      <Link
        href="/blog"
        onClick={() => setMobileMenuOpen(false)}
        className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
      >
        <BookOpen className="w-4 h-4 shrink-0" />
        <span>Blog</span>
        <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
      </Link>

      <button
        onClick={() => {
          setShowShortcuts(true);
          setMobileMenuOpen(false);
        }}
        className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
      >
        <Keyboard className="w-4 h-4 shrink-0" />
        <span>Keyboard Shortcuts</span>
        <span className="ml-auto text-xs text-muted-foreground/50 kbd">
          ?
        </span>
      </button>

      <button
        onClick={() => {
          setTheme(theme === "dark" ? "light" : "dark");
          setMobileMenuOpen(false);
        }}
        className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground hover:bg-muted text-left transition-colors"
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

  return (
    <header data-wizard-header className={cn(
      "sticky top-0 z-50 shrink-0 transition-[background,backdrop-filter,box-shadow,border-color] duration-200",
      // FIX: Mobile safe-area padding for notch devices (iPhone X+)
      "pt-[env(safe-area-inset-top,0px)]",
      scrolled ? "bg-background/95 backdrop-blur-md" : "bg-background",
      "border-b border-border",
    )}>
      <div className={cn(
        "px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2"
      )}>

        {/* ── Left: Logo with subtle visual depth ── */}
        <div className="flex items-center min-w-0">
          <Logo size="md" />
        </div>

        {/* ── Center: Date (homepage) or Save indicator (wizard) ── */}
        {/* FIX: On mobile, show compact save indicator when wizard is active;
         *      on desktop, show full save indicator or navbar date. */}
        <div className="flex-1 justify-center">
          {wizardStarted ? (
            <>
              {/* Desktop: full save indicator */}
              <span className="hidden sm:block">
                <SaveIndicator />
              </span>
              {/* Mobile: compact pulsing dot indicator */}
              <span className="sm:hidden flex items-center justify-center">
                <SaveIndicatorMobile />
              </span>
            </>
          ) : (
            <NavbarDate />
          )}
        </div>

        {/* ── Right: Action buttons (desktop only) + Hamburger (mobile) ── */}
        <div className="flex items-center gap-0.5 shrink-0">
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
                      "text-xs gap-1.5 h-8 hidden md:inline-flex",
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
                    className="text-xs gap-1.5 text-muted-foreground h-8 hidden md:inline-flex"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">New Thesis</span>
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
                    className="h-8 w-8 p-0 text-muted-foreground hidden xl:inline-flex"
                    aria-label="Export project"
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
                    className="h-8 w-8 p-0 text-muted-foreground hidden xl:inline-flex"
                    aria-label="Import project"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Import project (.json)</p>
                </TooltipContent>
              </Tooltip>

              {/* Smart thesis import */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleThesisImportClick}
                    disabled={importing}
                    className="h-8 w-8 p-0 text-muted-foreground hidden xl:inline-flex"
                    aria-label="Import thesis files"
                  >
                    {importing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Import thesis files (.pdf, .tex, .docx…)</p>
                </TooltipContent>
              </Tooltip>

              {/* Intelligence Panel */}
              {selectedTemplate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowIntelligencePanel(!showIntelligencePanel)}
                      aria-label={showIntelligencePanel ? "Close intelligence panel" : "Open intelligence panel"}
                      className={cn(
                        "h-8 w-8 p-0 transition-colors hidden lg:inline-flex",
                        showIntelligencePanel
                          ? "text-[var(--c-brand-600)] bg-[var(--color-fill-brand)]"
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
            </>
          )}

          {/* Blog link — homepage only */}
          {!wizardStarted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/blog">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hidden xl:inline-flex"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Blog</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Theme toggle — desktop only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setTheme(theme === "dark" ? "light" : "dark")
                }
                className="h-10 w-10 rounded-lg p-0 hidden lg:inline-flex"
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

          {/* Shortcuts — desktop only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcuts(true)}
                className="h-8 w-8 p-0 text-muted-foreground hidden lg:inline-flex"
                aria-label="Keyboard shortcuts"
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

          {/* Mobile: Hamburger — ALL actions moved here on mobile */}
          <div className="flex lg:hidden items-center shrink-0">
            <Sheet
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
            >
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] w-11 p-0 rounded-xl"
                  aria-label="Open menu"
                  suppressHydrationWarning
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] px-3 overflow-y-auto overscroll-y-contain pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] max-h-[calc(100dvh-2rem)] bg-background/95 backdrop-blur-2xl"
              >
                <SheetHeader className="px-2 pb-4 border-b border-border/40 shrink-0">
                  <SheetTitle className="flex items-center gap-2.5 text-sm font-semibold">
                    <Logo size="sm" showBrandText={false} />
                    {"Thesis"}<span style={{ color: 'var(--c-brand-600)' }}>{"Forge"}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 pb-6">{mobileMenuItems}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
