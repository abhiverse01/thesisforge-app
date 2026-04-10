"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronLeft,
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateLatex, generateBibtexFile } from "@/lib/latex-generator";
import { lintLatex, lintSummary, type LintResult } from "@/core/linter";
import { exportThesis, exportTexOnly, exportBibOnly } from "@/core/export";
import { validateAll, type ValidationResult } from "@/core/validators";

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
  const { thesis, selectedTemplate, prevStep, isGenerating, setGenerating } =
    useThesisStore();
  const [latex, setLatex] = useState("");
  const [bib, setBib] = useState("");
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState("tex");
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const confettiShown = useRef(false);

  // Auto-generate on mount
  useEffect(() => {
    if (!thesis || isGenerating) return;
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setGenerating(false);

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
      setGenerating(false);
    }
  }, [thesis, setGenerating]);

  const handleExportZip = useCallback(async () => {
    if (!thesis || !selectedTemplate) {
      toast.error("No thesis to export");
      return;
    }
    try {
      await exportThesis(thesis, selectedTemplate);
      toast.success("ZIP downloaded", {
        description: "Includes main.tex, references.bib, and README.md",
        duration: 3000,
      });
    } catch (err) {
      toast.error("Export failed", {
        description:
          err instanceof Error ? err.message : "Failed to create ZIP file.",
        duration: 4000,
      });
    }
  }, [thesis, selectedTemplate]);

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

  if (!thesis) return null;

  // Word count stats
  const totalWords = thesis.chapters
    .reduce(
      (sum, ch) =>
        sum +
        (ch.content?.trim().split(/\s+/).filter((w) => w).length || 0) +
        ch.subSections.reduce(
          (ss, s) =>
            ss +
            (s.content?.trim().split(/\s+/).filter((w) => w).length || 0),
          0
        ),
      0
    );
  const abstractWords = thesis.abstract
    .trim()
    .split(/\s+/)
    .filter((w) => w).length;

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
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">
            Generate & Export
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Your LaTeX code has been generated below. Review, lint, and download
          your thesis files.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-foreground">
              {thesis.chapters.length}
            </div>
            <p className="text-[10px] text-muted-foreground">Chapters</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-foreground">
              {totalWords.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground">Total Words</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-foreground">
              {abstractWords}
            </div>
            <p className="text-[10px] text-muted-foreground">Abstract Words</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-foreground">
              {thesis.references.length}
            </div>
            <p className="text-[10px] text-muted-foreground">References</p>
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
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              Lint Results
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {lintResult.all.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-2 text-xs"
                >
                  {issue.severity === "error" ? (
                    <AlertCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                  ) : issue.severity === "warning" ? (
                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <span className="text-muted-foreground">
                    {issue.message}
                    {issue.line && (
                      <span className="ml-1 font-mono text-[10px]">
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
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-1.5">
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
              <TabsTrigger value="tex" className="text-xs gap-1.5 px-3">
                <FileText className="w-3.5 h-3.5" />
                main.tex
              </TabsTrigger>
              <TabsTrigger value="bib" className="text-xs gap-1.5 px-3">
                <BookOpen className="w-3.5 h-3.5" />
                references.bib
              </TabsTrigger>
              <TabsTrigger
                value="lint"
                className="text-xs gap-1.5 px-3"
                disabled={!lintResult || lintResult.all.length === 0}
              >
                <Layers className="w-3.5 h-3.5" />
                Lint
                {lintResult && lintResult.all.length > 0 && (
                  <Badge
                    variant={
                      lintResult.hasErrors ? "destructive" : "secondary"
                    }
                    className="ml-1 h-4 px-1 text-[9px]"
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
            <div className="latex-code-block rounded-xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <span className="text-[10px] font-mono text-muted-foreground">
                  main.tex
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {latex.split("\n").length} lines
                </span>
              </div>
              <div className="max-h-[500px] overflow-auto p-4">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                  <code>{latex}</code>
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bib" className="mt-0">
            <div className="latex-code-block rounded-xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <span className="text-[10px] font-mono text-muted-foreground">
                  references.bib
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
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
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-medium">All clear!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No issues found in your LaTeX code.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lintResult.errors.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Errors ({lintResult.errors.length})
                          </h4>
                          <div className="space-y-1.5">
                            {lintResult.errors.map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20"
                              >
                                <code className="text-[10px] font-mono bg-destructive/10 text-destructive px-1 py-0.5 rounded shrink-0">
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
                          <h4 className="text-xs font-semibold text-amber-500 mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Warnings ({lintResult.warnings.length})
                          </h4>
                          <div className="space-y-1.5">
                            {lintResult.warnings.map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20"
                              >
                                <code className="text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded shrink-0">
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
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            Info ({lintResult.infos.length})
                          </h4>
                          <div className="space-y-1.5">
                            {lintResult.infos.map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                              >
                                <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded shrink-0">
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
            <FileDown className="w-4 h-4" />
            Download ZIP
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
        <p className="text-[10px] text-muted-foreground">
          ZIP includes: main.tex + references.bib + README.md with compilation
          instructions. Works on Overleaf, TeXStudio, or any LaTeX editor.
        </p>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={prevStep}
          className="gap-1.5 text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Format
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          className="gap-1.5 text-xs"
          disabled={isGenerating}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Regenerate
        </Button>
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
