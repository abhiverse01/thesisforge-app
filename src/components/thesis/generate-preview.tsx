"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  FileText,
  FileDown,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Layers,
  List,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateLatex, generateBibtexFile } from "@/lib/latex-generator";
import { lintLatex, lintSummary, type LintResult } from "@/core/linter";
import { exportThesis, exportTexOnly, exportBibOnly } from "@/core/export";
import { validateAll, type ValidationResult } from "@/core/validators";
import { countWords } from "@/utils/word-count";
import { WIZARD_STEPS } from "@/lib/thesis-types";

const fadeVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeTransition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function GeneratePreview() {
  const { thesis, selectedTemplate, isGenerating, setGenerating } =
    useThesisStore();
  const [latex, setLatex] = useState("");
  const [bib, setBib] = useState("");
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState("tex");
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [chapterNavOpen, setChapterNavOpen] = useState(true);
  const confettiShown = useRef(false);
  const texPreviewRef = useRef<HTMLDivElement>(null);

  // Auto-generate on mount and when thesis changes
  const initialGenerated = useRef(false);
  useEffect(() => {
    if (!thesis || isGenerating || initialGenerated.current) return;
    initialGenerated.current = true;
    setGenerating(true);
    // Small delay for UX feedback
    const timer = setTimeout(() => {
      try {
        const tex = generateLatex(thesis);
        const bibContent = generateBibtexFile(thesis);
        const lint = lintLatex(tex);
        const validation = validateAll(thesis);
        setLatex(tex);
        setBib(bibContent);
        setLintResult(lint);
        setValidationResult(validation);
        setHasGenerated(true);
        if (!confettiShown.current) {
          confettiShown.current = true;
          triggerConfetti();
        }
        const summary = lintSummary(lint);
        if (lint.hasErrors) {
          toast.warning("Generated with issues", { description: summary, duration: 4000 });
        } else if (lint.warnings.length > 0) {
          toast.success("LaTeX generated", { description: summary, duration: 3000 });
        } else {
          toast.success("LaTeX generated successfully", { description: "No issues found. Ready to download!", duration: 3000 });
        }
      } catch (err) {
        toast.error("Generation failed", { description: err instanceof Error ? err.message : "An unknown error occurred.", duration: 4000 });
      } finally {
        setGenerating(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [thesis, isGenerating, setGenerating]);

  const handleGenerate = useCallback(async () => {
    if (!thesis) return;
    setGenerating(true);

    try {
      // Small delay for UX feedback
      await new Promise((r) => setTimeout(r, 400));

      const tex = generateLatex(thesis);
      const bibContent = generateBibtexFile(thesis);
      const lint = lintLatex(tex);
      const validation = validateAll(thesis);

      setLatex(tex);
      setBib(bibContent);
      setLintResult(lint);
      setValidationResult(validation);
      setHasGenerated(true);

      // Show confetti on first generation
      if (!confettiShown.current) {
        confettiShown.current = true;
        triggerConfetti();
      }

      const summary = lintSummary(lint);
      if (lint.hasErrors) {
        toast.warning("Generated with issues", {
          description: summary,
          duration: 4000,
        });
      } else if (lint.warnings.length > 0) {
        toast.success("LaTeX generated", {
          description: summary,
          duration: 3000,
        });
      } else {
        toast.success("LaTeX generated successfully", {
          description: "No issues found. Ready to download!",
          duration: 3000,
        });
      }
    } catch (err) {
      toast.error("Generation failed", {
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        duration: 4000,
      });
    } finally {
      // FIX(ZONE-4B): ALWAYS runs — spinner always clears
      setGenerating(false);
    }
  }, [thesis, setGenerating]);

  // FIX(ZONE-4B): finally block ensures export state is always reset
  const handleExportZip = useCallback(async () => {
    if (!thesis || !selectedTemplate) {
      toast.error("No thesis to export");
      return;
    }
    setGenerating(true);
    try {
      const result = await exportThesis(thesis, selectedTemplate);
      if (result.errors && result.errors.length > 0) {
        // FIX(ZONE-3A): Surface LaTeX contract errors to user
        toast.error("Export blocked — LaTeX errors detected", {
          description: result.errors.map(e => e.message).slice(0, 3).join("\n"),
          duration: 5000,
        });
        return;
      }
      toast.success("Your thesis is ready", {
        description: "Compile it in Overleaf to get your PDF.",
        duration: 5000,
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      toast.error("Export failed", {
        description:
          err instanceof Error ? err.message : "Failed to create ZIP file.",
        duration: 4000,
      });
    } finally {
      setGenerating(false);
    }
  }, [thesis, selectedTemplate, setGenerating]);

  const handleExportTex = useCallback(async () => {
    if (!thesis) return;
    try {
      await exportTexOnly(thesis);
      toast.success("TEX downloaded", { duration: 2000 });
    } catch {
      toast.error("Export failed", { duration: 3000 });
    }
  }, [thesis]);

  const handleExportBib = useCallback(async () => {
    if (!thesis) return;
    try {
      await exportBibOnly(thesis);
      toast.success("BIB downloaded", { duration: 2000 });
    } catch {
      toast.error("Export failed", { duration: 3000 });
    }
  }, [thesis]);

  const handleCopy = useCallback(async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(`${type} copied`, { duration: 1500 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed", { duration: 2000 });
    }
  }, []);

  const scrollToChapter = useCallback((chapterIndex: number) => {
    if (!texPreviewRef.current || !latex) return;
    // Find the line with \chapter{...} for this chapter
    const lines = latex.split("\n");
    let targetLineNum = 0;
    let chapterCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/\\chapter\{/.test(lines[i])) {
        if (chapterCount === chapterIndex) {
          targetLineNum = i;
          break;
        }
        chapterCount++;
      }
    }
    // Scroll the pre element by estimating line height
    const pre = texPreviewRef.current.querySelector("pre");
    if (pre) {
      const lineHeight = 18; // approximate
      pre.scrollTop = targetLineNum * lineHeight;
    }
  }, [latex]);

  // Extract chapter titles from latex for navigation
  const chapterTitles = useMemo(() => {
    if (!latex) return [];
    const matches = latex.match(/\\chapter\{([^}]*)\}/g);
    return (matches || []).map((m) => {
      const titleMatch = m.match(/\\chapter\{(.+)\}/);
      return titleMatch ? titleMatch[1] : m;
    });
  }, [latex]);

  if (!thesis) return null;

  // Word count stats (CJK-aware)
  const totalWords = thesis.chapters.reduce(
    (sum, ch) =>
      sum + countWords(ch.content || '') +
      ch.subSections.reduce(
        (ss, s) => ss + countWords(s.content || ''),
        0
      ),
      0
  );
  const abstractWords = countWords(thesis.abstract || '');

  return (
    <motion.div
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={fadeTransition}
      className="space-y-5"
    >
      {/* Header */}
      <div className="space-y-3">
        <div className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Step {WIZARD_STEPS[5].id} of {WIZARD_STEPS.length}
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Preview and Export
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
              Your LaTeX code has been generated below. Review, lint, and download
              your thesis files as a ZIP archive.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-semibold text-foreground">
              {thesis.chapters.length}
            </div>
            <p className="text-xs text-muted-foreground">Chapters</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-semibold text-foreground">
              {totalWords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Words</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-semibold text-foreground">
              {abstractWords}
            </div>
            <p className="text-xs text-muted-foreground">Abstract Words</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-semibold text-foreground">
              {thesis.references.length}
            </div>
            <p className="text-xs text-muted-foreground">References</p>
          </CardContent>
        </Card>
      </div>

      {/* Lint Results */}
      {lintResult && lintResult.all.length > 0 && (
        <Card
          className={cn(
            "border-border/50",
            lintResult.hasErrors
              ? "border-destructive/50 bg-destructive/5"
              : "bg-card/50"
          )}
        >
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              {lintResult.hasErrors ? (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              ) : lintResult.warnings.length > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-text-warning)]" />
              ) : (
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              Lint Results
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lintResult.all.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-2 text-xs"
                >
                  {issue.severity === "error" ? (
                    <AlertCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                  ) : issue.severity === "warning" ? (
                    <AlertTriangle className="w-3 h-3 text-[var(--color-text-warning)] mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <span className="text-muted-foreground">
                    {issue.message}
                    {issue.line && (
                      <span className="ml-1 font-mono text-xs">
                        (line {issue.line})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Warnings */}
      {validationResult &&
        validationResult.warnings &&
        Object.keys(validationResult.warnings).length > 0 && (
          <Card className="border-amber-500/30 bg-[var(--color-fill-warning)]">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-text-warning)]" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {Object.values(validationResult.warnings).map((msg, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {msg}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Code Preview Tabs */}
      {hasGenerated && (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-3">
            <TabsList className="h-9">
              <TabsTrigger value="tex" className="text-xs gap-2 px-3">
                <FileText className="w-3.5 h-3.5" />
                main.tex
              </TabsTrigger>
              <TabsTrigger value="bib" className="text-xs gap-2 px-3">
                <BookOpen className="w-3.5 h-3.5" />
                references.bib
              </TabsTrigger>
              <TabsTrigger
                value="lint"
                className="text-xs gap-2 px-3"
                disabled={!lintResult || lintResult.all.length === 0}
              >
                <Layers className="w-3.5 h-3.5" />
                Lint
                {lintResult && lintResult.all.length > 0 && (
                  <Badge
                    variant={
                      lintResult.hasErrors ? "destructive" : "secondary"
                    }
                    className="ml-1 h-4 px-1 text-xs"
                  >
                    {lintResult.all.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() =>
                      handleCopy(
                        activeTab === "tex" ? latex : bib,
                        activeTab === "tex" ? "LaTeX" : "BibTeX"
                      )
                    }
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to clipboard</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <TabsContent value="tex" className="mt-0">
            <div className="flex gap-3">
              {/* Chapter sidebar */}
              {chapterTitles.length > 0 && (
                <div className="w-48 shrink-0 hidden lg:block">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 w-full text-left"
                    onClick={() => setChapterNavOpen(!chapterNavOpen)}
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${chapterNavOpen ? '' : '-rotate-90'}`} />
                    <List className="w-3 h-3" />
                    Chapters ({chapterTitles.length})
                  </button>
                  {chapterNavOpen && (
                    <div className="space-y-0.5">
                      {chapterTitles.map((title, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors truncate"
                          onClick={() => scrollToChapter(idx)}
                        >
                          <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LaTeX code preview */}
              <div className="latex-code-block rounded-xl border border-border/50 overflow-hidden flex-1 min-w-0" ref={texPreviewRef}>
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                  <span className="text-xs font-mono text-muted-foreground">
                    main.tex
                  </span>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {latex.split("\n").length} lines
                  </span>
                </div>
                <div className="max-h-[500px] overflow-auto p-4">
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                    <code>{latex}</code>
                  </pre>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bib" className="mt-0">
            <div className="latex-code-block rounded-xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <span className="text-xs font-mono text-muted-foreground">
                  references.bib
                </span>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {bib.split("\n").length} lines
                </span>
              </div>
              <div className="max-h-[500px] overflow-auto p-4">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                  <code>{bib}</code>
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lint" className="mt-0">
            {lintResult && (
              <Card className="border-border/50">
                <CardContent className="p-4">
                  {lintResult.all.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 text-[var(--color-text-success)] mx-auto mb-2" />
                      <p className="text-sm font-medium">All clear!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No issues found in your LaTeX code.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lintResult.errors.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Errors ({lintResult.errors.length})
                          </h4>
                          <div className="space-y-2">
                            {lintResult.errors.map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20"
                              >
                                <code className="text-xs font-mono bg-destructive/10 text-destructive px-1 py-0.5 rounded shrink-0">
                                  {issue.id}
                                </code>
                                <span className="text-xs">
                                  {issue.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {lintResult.warnings.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--color-text-warning)] mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Warnings ({lintResult.warnings.length})
                          </h4>
                          <div className="space-y-2">
                            {lintResult.warnings.map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-start gap-2 p-2 rounded-lg bg-[var(--color-fill-warning)] border border-amber-500/20"
                              >
                                <code className="text-xs font-mono bg-[var(--color-fill-warning)] text-[var(--color-text-warning)] px-1 py-0.5 rounded shrink-0">
                                  {issue.id}
                                </code>
                                <span className="text-xs">
                                  {issue.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {lintResult.infos.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" />
                            Info ({lintResult.infos.length})
                          </h4>
                          <div className="space-y-2">
                            {lintResult.infos.map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                              >
                                <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded shrink-0">
                                  {issue.id}
                                </code>
                                <span className="text-xs text-muted-foreground">
                                  {issue.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {isGenerating && (
        <Card className="border-border/50">
          <CardContent className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm font-medium">Generating LaTeX...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Building AST, running linter, validating output
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Export Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          Download
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            onClick={handleExportZip}
            className="gap-2 text-xs font-semibold"
            size="lg"
            disabled={isGenerating}
          >
            {exportSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Downloaded!
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Export ZIP
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportTex}
            className="gap-2 text-xs"
            disabled={isGenerating}
          >
            <FileText className="w-4 h-4" />
            main.tex only
          </Button>
          <Button
            variant="outline"
            onClick={handleExportBib}
            className="gap-2 text-xs"
            disabled={isGenerating || thesis.references.length === 0}
          >
            <BookOpen className="w-4 h-4" />
            references.bib only
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ZIP includes: main.tex + references.bib + README.md with compilation
          instructions. Works on Overleaf, TeXStudio, or any LaTeX editor.
        </p>
      </div>

    </motion.div>
  );
}

// Simple confetti effect (client-side only)
function triggerConfetti() {
  if (typeof window === "undefined") return;
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(container);

  for (let i = 0; i < 60; i++) {
    const particle = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 500;
    const duration = 1500 + Math.random() * 2000;
    const size = 4 + Math.random() * 6;

    particle.style.cssText = `
      position:absolute;
      left:${left}%;
      top:-10px;
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      opacity:0.9;
      animation:confetti-fall ${duration}ms ease-in ${delay}ms forwards;
    `;
    container.appendChild(particle);
  }

  // Add keyframes
  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
        100% { transform: translateY(100vh) rotate(${360 + Math.random() * 360}deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    container.remove();
  }, 4000);
}
