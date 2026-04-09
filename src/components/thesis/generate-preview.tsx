"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS, THESIS_TEMPLATES } from "@/lib/thesis-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronLeft,
  Code,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Trophy,
  FileDown,
} from "lucide-react";

// Simple LaTeX syntax highlighter
function highlightLatex(code: string): string {
  let highlighted = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  highlighted = highlighted.replace(
    /(%[^\n]*)/g,
    '<span class="latex-comment">$1</span>'
  );
  highlighted = highlighted.replace(
    /(\\[a-zA-Z]+)/g,
    '<span class="latex-command">$1</span>'
  );
  highlighted = highlighted.replace(
    /(\{)/g,
    '<span class="latex-brace">$1</span>'
  );
  highlighted = highlighted.replace(
    /(\})/g,
    '<span class="latex-brace">$1</span>'
  );
  highlighted = highlighted.replace(
    /(\[)/g,
    '<span class="latex-bracket">$1</span>'
  );
  highlighted = highlighted.replace(
    /(\])/g,
    '<span class="latex-bracket">$1</span>'
  );

  return highlighted;
}

export function GeneratePreview() {
  const {
    thesis,
    generatedLatex,
    isGenerating,
    setGeneratedLatex,
    setGenerating,
    prevStep,
    reset,
  } = useThesisStore();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [generationError, setGenerationError] = useState<string | null>(null);

  const templateInfo = thesis
    ? THESIS_TEMPLATES.find((t) => t.type === thesis.type)
    : null;

  const generateThesis = useCallback(async () => {
    if (!thesis) return;
    setGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch("/api/generate-latex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesis }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedLatex(data.latex);
      setActiveTab("code");
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }, [thesis, setGeneratedLatex, setGenerating]);

  const copyToClipboard = useCallback(async () => {
    if (!generatedLatex) return;
    try {
      await navigator.clipboard.writeText(generatedLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = generatedLatex;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedLatex]);

  const downloadFile = useCallback(
    (content: string, extension: string, mimeType: string) => {
      if (!thesis) return;
      const filename = thesis.metadata.title
        ? `${thesis.metadata.title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}.${extension}`
        : `thesis.${extension}`;

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [thesis]
  );

  const downloadLatex = useCallback(() => {
    if (!generatedLatex) return;
    downloadFile(generatedLatex, "tex", "text/x-tex");
  }, [generatedLatex, downloadFile]);

  const downloadBibtex = useCallback(async () => {
    if (!thesis) return;
    try {
      const response = await fetch("/api/generate-latex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesis, format: "bib" }),
      });
      const data = await response.json();
      if (data.success) {
        downloadFile(data.latex, "bib", "text/plain");
      }
    } catch {
      // Silently fail if no references
    }
  }, [thesis, downloadFile]);

  // Thesis summary stats
  const stats = useMemo(() => {
    if (!thesis) return null;
    const totalWords = thesis.chapters.reduce((acc, ch) => {
      const cw = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
      const sw = ch.subSections.reduce(
        (subAcc, sub) =>
          subAcc + (sub.content ? sub.content.trim().split(/\s+/).filter(Boolean).length : 0),
        0
      );
      return acc + cw + sw;
    }, 0);

    const abstractWords = thesis.abstract
      ? thesis.abstract.trim().split(/\s+/).filter(Boolean).length
      : 0;

    return {
      chapters: thesis.chapters.length,
      sections: thesis.chapters.reduce((acc, ch) => acc + ch.subSections.length, 0),
      references: thesis.references.length,
      words: totalWords,
      abstractWords,
      keywords: thesis.keywords.length,
      appendices: thesis.appendices.length,
      readTime: Math.max(1, Math.ceil(totalWords / 200)),
      totalWordsWithAbstract: totalWords + abstractWords,
    };
  }, [thesis]);

  const highlightedCode = useMemo(
    () => (generatedLatex ? highlightLatex(generatedLatex) : ""),
    [generatedLatex]
  );

  const lineCount = generatedLatex ? generatedLatex.split("\n").length : 0;

  const fileSizeBytes = generatedLatex ? new Blob([generatedLatex]).size : 0;
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Completion percentage
  const completion = useMemo(() => {
    if (!thesis || !stats) return 0;
    let score = 0;
    const total = 8;
    if (thesis.metadata.title) score++;
    if (thesis.metadata.author) score++;
    if (thesis.metadata.university) score++;
    if (thesis.metadata.supervisor) score++;
    if (thesis.abstract && thesis.abstract.trim().length > 50) score++;
    if (stats.words > 0) score++;
    if (thesis.references.length > 0) score++;
    if (stats.keywords > 0) score++;
    return Math.round((score / total) * 100);
  }, [thesis, stats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Step {WIZARD_STEPS[5].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Generate & Download
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Review your thesis summary and generate the LaTeX code. Download the
          file and compile it in any LaTeX editor.
        </p>
      </motion.div>

      {/* Completion Badge */}
      {completion === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <Trophy className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              100% Complete — Ready to generate!
            </span>
          </div>
        </motion.div>
      )}
      {completion < 100 && completion > 0 && (
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-semibold">{completion}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {completion < 50 && (
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Tip: Fill in at least title, author, university, and supervisor for a valid title page.
            </p>
          )}
        </div>
      )}

      {/* Thesis Summary */}
      <Card className="surface-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Thesis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats && (
              <>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-xl font-bold">{stats.chapters}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Chapters</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-xl font-bold">{stats.sections}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Sections</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-xl font-bold">{stats.words.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Words</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-xl font-bold">{stats.references}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">References</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-xl font-bold">~{stats.readTime}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Min read</p>
                </div>
              </>
            )}
          </div>

          <Separator className="my-3" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Template</span>
              <span className="font-medium">
                {templateInfo?.icon} {templateInfo?.name}
              </span>
            </div>
            {thesis?.metadata.title && (
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium truncate max-w-[200px] ml-4 text-right">
                  {thesis.metadata.title}
                </span>
              </div>
            )}
            {thesis?.metadata.author && (
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Author</span>
                <span className="font-medium">{thesis.metadata.author}</span>
              </div>
            )}
            {thesis?.metadata.university && (
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">University</span>
                <span className="font-medium truncate max-w-[200px] ml-4 text-right">
                  {thesis.metadata.university}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex flex-col items-center gap-3">
        {!generatedLatex ? (
          <Button
            onClick={generateThesis}
            disabled={isGenerating}
            className="gap-2 px-8 py-6 text-base font-semibold rounded-xl surface-2 hover:surface-3 transition-shadow"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating LaTeX...
              </>
            ) : (
              <>
                <Code className="w-5 h-5" />
                Generate LaTeX Code
              </>
            )}
          </Button>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                onClick={generateThesis}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied!" : "Copy Code"}
              </Button>
              <Button
                onClick={downloadLatex}
                size="sm"
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download .tex
              </Button>
              {stats && stats.references > 0 && (
                <Button
                  onClick={downloadBibtex}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download .bib
                </Button>
              )}
            </div>
            {fileSizeBytes > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {lineCount} lines · {formatFileSize(fileSizeBytes)}
              </span>
            )}
          </motion.div>
        )}

        {generationError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs max-w-lg"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{generationError}</span>
          </motion.div>
        )}
      </div>

      {/* Code Preview */}
      <AnimatePresence>
        {generatedLatex && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code" className="gap-1.5 text-xs">
                  <Code className="w-3.5 h-3.5" />
                  LaTeX Code
                  <Badge variant="secondary" className="text-[9px] ml-1">
                    {lineCount} lines
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="instructions" className="gap-1.5 text-xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                  How to Compile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="mt-3">
                <Card className="overflow-hidden surface-1">
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[500px]">
                      <pre className="latex-code-block p-4 text-xs leading-relaxed overflow-x-auto">
                        <code
                          dangerouslySetInnerHTML={{
                            __html: highlightedCode,
                          }}
                        />
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructions" className="mt-3">
                <Card className="surface-1">
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">
                        How to Use Your Generated LaTeX Code
                      </h3>
                      <ol className="space-y-3 text-xs text-muted-foreground list-decimal list-inside">
                        <li>
                          <strong className="text-foreground">Download the .tex file</strong> — Click the &quot;Download .tex&quot; button above to save the file.
                        </li>
                        <li>
                          <strong className="text-foreground">Choose a LaTeX Editor</strong> — Upload to{" "}
                          <a
                            href="https://www.overleaf.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            Overleaf
                          </a>{" "}
                          or use TeXStudio, TeXShop, or VS Code with the LaTeX Workshop extension.
                        </li>
                        <li>
                          <strong className="text-foreground">Compile the document</strong> — If you have references, compile twice (first pass resolves citations, second pass updates references).
                        </li>
                        <li>
                          <strong className="text-foreground">Customize further</strong> — Add figures, tables, equations, or any LaTeX commands you need.
                        </li>
                        <li>
                          <strong className="text-foreground">Add images</strong> — Place images in an &quot;images/&quot; folder and reference with{" "}
                          <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                            \includegraphics
                          </code>
                          .
                        </li>
                      </ol>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold">
                        Recommended LaTeX Compilers
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="p-3 rounded-lg border text-center">
                          <p className="text-xs font-medium">pdfLaTeX</p>
                          <p className="text-[10px] text-muted-foreground">
                            Most common, no Unicode support needed
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border text-center">
                          <p className="text-xs font-medium">XeLaTeX</p>
                          <p className="text-[10px] text-muted-foreground">
                            Full Unicode & system font support
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border text-center">
                          <p className="text-xs font-medium">LuaLaTeX</p>
                          <p className="text-[10px] text-muted-foreground">
                            Advanced scripting & Unicode
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="text-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={reset}
          className="text-sm gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Start Over
        </Button>
      </div>
    </div>
  );
}
