"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS, THESIS_TEMPLATES } from "@/lib/thesis-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  RefreshCw,
  Loader2,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  FileDown,
  Upload,
  Home,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// LaTeX Syntax Highlighter
// ============================================================
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
    /(\\(?:documentclass|usepackage|begin|end|input|include|includegraphics|caption|label|ref|cite|bibliography|bibliographystyle|addbibresource|printbibliography|tableofcontents|listoffigures|listoftables|appendix|title|author|date|maketitle|titlepage|chapter|section|subsection|subsubsection|paragraph|subparagraph|textbf|textit|emph|underline|footnote|marginnote|newcommand|renewcommand|def|let|setlength|geometry|pagestyle|fancyhf|fancyhead|fancyfoot|headheight|headwidth|textheight|textwidth|linespread|baselinestretch|onehalfspacing|doublespacing|singlespacing|abstract|keywords|dedication|acknowledgments|tableofcontents|lstlisting|lstinline|verbatim|centering|raggedright|raggedleft|hfill|vspace|hspace|newpage|clearpage|pagebreak|linebreak|noindent|indent|parskip|parindent|item|itemize|enumerate|description|figure|table|tabular|align|equation|eqnarray|multline|gather|split|array|matrix|bmatrix|pmatrix|vmatrix|cases|frac|sqrt|sum|prod|int|lim|inf|sup|log|ln|exp|sin|cos|tan|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|infty|partial|nabla|cdot|cdots|ldots|vdots|ddots|quad|qquad|text|mathrm|mathbf|mathit|mathcal|mathbb|mathrm|boldsymbol|left|right|big|Big|bigg|Bigg|phantom|hphantom|vphantom|overline|underline|hat|bar|vec|tilde|dot|ddot|breve|acute|grave|check|tilde|widehat|widetilde|overrightarrow|overleftarrow|overbrace|underbrace|boxed|color|textcolor|colorbox|fcolorbox|pagecolor|definecolor|includepdf|includegraphics|scalebox|resizebox|rotatebox|subfloat|subfigure|minipage|parbox|tcbox|tcolorbox|newtcolorbox|newenvironment|newtheorem|theoremstyle|newtheorem|proof|qed)\b)/g,
    '<span class="latex-command">$1</span>'
  );

  highlighted = highlighted.replace(/(\{)/g, '<span class="latex-brace">$1</span>');
  highlighted = highlighted.replace(/(\})/g, '<span class="latex-brace">$1</span>');
  highlighted = highlighted.replace(/(\[)/g, '<span class="latex-bracket">$1</span>');
  highlighted = highlighted.replace(/(\])/g, '<span class="latex-bracket">$1</span>');
  highlighted = highlighted.replace(/(\[[^\]]*\])/g, '<span class="latex-option">$1</span>');

  return highlighted;
}

// ============================================================
// Main GeneratePreview Component
// ============================================================
export function GeneratePreview() {
  const {
    thesis,
    generatedLatex,
    isGenerating,
    setGeneratedLatex,
    setGenerating,
    prevStep,
    goToHome,
    exportProject,
    importProject,
    getCompletionPercentage,
  } = useThesisStore();

  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateInfo = thesis
    ? THESIS_TEMPLATES.find((t) => t.type === thesis.type)
    : null;

  const completion = getCompletionPercentage();

  const criteria = useMemo(() => {
    if (!thesis) return [];
    const m = thesis.metadata;
    return [
      { label: "Title", met: !!m.title.trim() },
      { label: "Author", met: !!m.author.trim() },
      { label: "University", met: !!m.university.trim() },
      { label: "Supervisor", met: !!m.supervisor.trim() },
      { label: "Abstract", met: !!thesis.abstract.trim() },
      { label: "Keywords", met: thesis.keywords.length > 0 },
      {
        label: "Chapter content",
        met: thesis.chapters.some(
          (ch) =>
            ch.content.trim() ||
            ch.subSections.some((ss) => ss.content.trim())
        ),
      },
      { label: "References", met: thesis.references.length > 0 },
    ];
  }, [thesis]);

  // ---- Generate LaTeX ----
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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("LaTeX generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [thesis, setGeneratedLatex, setGenerating]);

  // ---- Clipboard ----
  const copyToClipboard = useCallback(async () => {
    if (!generatedLatex) return;
    try {
      await navigator.clipboard.writeText(generatedLatex);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = generatedLatex;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [generatedLatex]);

  const copyCodeBlock = useCallback(async () => {
    if (!generatedLatex) return;
    try {
      await navigator.clipboard.writeText(generatedLatex);
    } catch {
      // fallback
    }
    setCopiedCode(true);
    toast.success("Code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  }, [generatedLatex]);

  // ---- File Download ----
  const downloadFile = useCallback(
    (content: string, extension: string, mimeType: string) => {
      if (!thesis) return;
      const filename = thesis.metadata.title
        ? `${thesis.metadata.title
            .replace(/[^a-zA-Z0-9]/g, "_")
            .toLowerCase()}.${extension}`
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
    toast.success("Downloaded!", {
      description: "Your .tex file has been saved.",
    });
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
        toast.success("BibTeX downloaded!");
      }
    } catch {
      toast.error("Failed to generate BibTeX");
    }
  }, [thesis, downloadFile]);

  // ---- Export / Import ----
  const handleExportProject = useCallback(() => {
    try {
      const jsonStr = exportProject();
      const filename = thesis?.metadata.title
        ? `${thesis.metadata.title
            .replace(/[^a-zA-Z0-9]/g, "_")
            .toLowerCase()}-project.json`
        : "thesis-project.json";
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Project exported!");
    } catch {
      toast.error("Export failed");
    }
  }, [exportProject, thesis]);

  const handleImportProject = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const jsonString = e.target?.result as string;
        const success = importProject(jsonString);
        if (success) {
          setImportError(null);
          toast.success("Project imported!");
        } else {
          setImportError(
            "Invalid project file. Please check the file and try again."
          );
          toast.error("Import failed", {
            description:
              "The file does not appear to be a valid ThesisForge project.",
          });
        }
      };
      reader.readAsText(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [importProject]
  );

  // ---- Stats ----
  const stats = useMemo(() => {
    if (!thesis) return null;
    const totalWords = thesis.chapters.reduce((acc, ch) => {
      const cw = ch.content
        ? ch.content.trim().split(/\s+/).filter(Boolean).length
        : 0;
      const sw = ch.subSections.reduce(
        (subAcc, sub) =>
          subAcc +
          (sub.content
            ? sub.content.trim().split(/\s+/).filter(Boolean).length
            : 0),
        0
      );
      return acc + cw + sw;
    }, 0);

    return {
      chapters: thesis.chapters.length,
      sections: thesis.chapters.reduce(
        (acc, ch) => acc + ch.subSections.length,
        0
      ),
      references: thesis.references.length,
      words: totalWords,
      readTime: Math.max(1, Math.ceil(totalWords / 200)),
    };
  }, [thesis]);

  // ---- Chapter Breakdown ----
  const chapterBreakdown = useMemo(() => {
    if (!thesis) return [];
    return thesis.chapters.map((ch) => {
      const cw = ch.content
        ? ch.content.trim().split(/\s+/).filter(Boolean).length
        : 0;
      const sw = ch.subSections.reduce(
        (subAcc, sub) =>
          subAcc +
          (sub.content
            ? sub.content.trim().split(/\s+/).filter(Boolean).length
            : 0),
        0
      );
      return {
        title: ch.title || `Chapter ${ch.number}`,
        words: cw + sw,
        number: ch.number,
      };
    });
  }, [thesis]);

  // ---- Code Display ----
  const highlightedCode = useMemo(
    () => (generatedLatex ? highlightLatex(generatedLatex) : ""),
    [generatedLatex]
  );

  const lineCount = generatedLatex ? generatedLatex.split("\n").length : 0;
  const codeLines = useMemo(
    () => (generatedLatex ? generatedLatex.split("\n") : []),
    [generatedLatex]
  );

  const fileSizeBytes = generatedLatex ? new Blob([generatedLatex]).size : 0;
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Step {WIZARD_STEPS[5].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Generate &amp; Download
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Review your thesis summary and generate compilable LaTeX code.
        </p>
      </div>

      {/* ---- Completion Indicator: Horizontal Bar + Inline Checkmarks ---- */}
      <Card className="surface-1">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Completion</h3>
            <span
              className={`text-xs font-semibold ${
                completion === 100
                  ? "text-emerald-600 dark:text-emerald-400"
                  : completion >= 75
                    ? "text-primary"
                    : completion >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
              }`}
            >
              {completion}% Complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completion === 100
                  ? "bg-emerald-500"
                  : completion >= 75
                    ? "bg-primary"
                    : completion >= 50
                      ? "bg-amber-500"
                      : "bg-muted-foreground/40"
              }`}
              style={{ width: `${completion}%` }}
            />
          </div>

          {/* Inline criteria checkmarks */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {criteria.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 text-xs">
                {c.met ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={
                    c.met ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---- Thesis Summary Stats ---- */}
      <Card className="surface-1">
        <CardContent className="p-4 space-y-3">
          {/* Stats grid: Chapters, Sections, Words, References, Est. Read Time */}
          {stats && (
            <div className="grid grid-cols-5 gap-2">
              {[
                {
                  value: stats.chapters,
                  label: "Chapters",
                  icon: BookOpen,
                },
                { value: stats.sections, label: "Sections", icon: FileText },
                {
                  value: stats.words.toLocaleString(),
                  label: "Words",
                  icon: FileText,
                },
                {
                  value: stats.references,
                  label: "References",
                  icon: GraduationCap,
                },
                {
                  value: `~${stats.readTime}m`,
                  label: "Est. Read Time",
                  icon: Clock,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center p-2.5 rounded-lg bg-secondary/50"
                >
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Metadata summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
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

          {/* Chapter breakdown: simple text list */}
          {chapterBreakdown.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Chapters
                </h4>
                <div className="space-y-1">
                  {chapterBreakdown.map((ch) => (
                    <div
                      key={ch.number}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className="text-muted-foreground truncate max-w-[70%]">
                        <span className="font-mono text-muted-foreground/50 mr-2">
                          {ch.number}.
                        </span>
                        {ch.title}
                      </span>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {ch.words.toLocaleString()} words
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---- Generate Button + Success Checkmark ---- */}
      <div className="flex flex-col items-center gap-3">
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                <Check
                  className="w-5 h-5 text-white"
                  strokeWidth={3}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!generatedLatex ? (
          <Button
            onClick={generateThesis}
            disabled={isGenerating}
            className="gap-2 px-10 py-7 text-base font-semibold rounded-xl"
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
          <div className="w-full max-w-2xl space-y-3">
            {/* Primary: Download .tex */}
            <Button
              onClick={downloadLatex}
              className="w-full gap-2 py-5 text-base font-semibold rounded-xl"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Download .tex File
            </Button>

            {/* Secondary: Copy Code + Download .bib + Regenerate */}
            <div className="flex flex-wrap items-center justify-center gap-2">
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
                onClick={downloadBibtex}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download .bib
              </Button>
              <Button
                onClick={generateThesis}
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate
              </Button>
            </div>

            {/* Ghost: Export + Import */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                onClick={handleExportProject}
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
              >
                <Upload className="w-3.5 h-3.5" />
                Export Project
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
              >
                <Download className="w-3.5 h-3.5" />
                Import Project
              </Button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportProject}
              className="hidden"
              aria-label="Import project file"
            />

            {importError && (
              <p className="text-xs text-destructive text-center">
                {importError}
              </p>
            )}
          </div>
        )}

        {generationError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs max-w-lg">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}
      </div>

      {/* ---- Export / Import (pre-generation) ---- */}
      {!generatedLatex && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={handleExportProject}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Export Project
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Import Project
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportProject}
            className="hidden"
            aria-label="Import project file"
          />
        </div>
      )}

      {/* ---- Code Preview Tabs ---- */}
      <AnimatePresence>
        {generatedLatex && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code" className="gap-1.5 text-xs">
                  <Code className="w-3.5 h-3.5" />
                  LaTeX Code
                </TabsTrigger>
                <TabsTrigger
                  value="instructions"
                  className="gap-1.5 text-xs"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  How to Compile
                </TabsTrigger>
              </TabsList>

              {/* Code Tab */}
              <TabsContent value="code" className="mt-3">
                <Card className="overflow-hidden surface-1">
                  {/* Simple header: line count + file size + copy */}
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-secondary/30">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{lineCount} lines</span>
                      <span className="w-px h-3 bg-border" />
                      <span>{formatFileSize(fileSizeBytes)}</span>
                      <span className="w-px h-3 bg-border" />
                      <span className="text-[10px] font-mono">.tex</span>
                    </div>
                    <Button
                      onClick={copyCodeBlock}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                    >
                      {copiedCode ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedCode ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[500px]">
                      <div className="latex-code-block text-xs leading-relaxed overflow-x-auto flex">
                        {/* Line Numbers */}
                        <div
                          className="shrink-0 py-4 pl-3 pr-2 text-right select-none border-r border-border/50 bg-secondary/20"
                          aria-hidden="true"
                        >
                          {codeLines.map((_, i) => (
                            <div
                              key={i}
                              className="text-[11px] leading-[1.7] text-muted-foreground/50 font-mono"
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                        {/* Code */}
                        <pre className="flex-1 py-4 px-4 overflow-x-auto">
                          <code
                            dangerouslySetInnerHTML={{
                              __html: highlightedCode,
                            }}
                          />
                        </pre>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* How to Compile Tab — Simplified */}
              <TabsContent value="instructions" className="mt-3">
                <Card className="surface-1">
                  <CardContent className="p-5 space-y-5">
                    {/* Overleaf Steps */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                          Using Overleaf (Recommended)
                        </h3>
                      </div>
                      <ol className="space-y-3 text-xs text-muted-foreground">
                        {[
                          {
                            title: "Download the files",
                            desc: 'Click "Download .tex File" above. If you have references, also download the .bib file.',
                          },
                          {
                            title: "Go to Overleaf",
                            desc: (
                              <>
                                Visit{" "}
                                <a
                                  href="https://www.overleaf.com"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline underline-offset-2"
                                >
                                  overleaf.com
                                </a>{" "}
                                and sign in (or create a free account).
                              </>
                            ),
                          },
                          {
                            title: "Create a new project",
                            desc: 'Click "New Project" then "Blank Project".',
                          },
                          {
                            title: "Upload your files",
                            desc: 'In the file tree sidebar, click the upload icon. Upload your .tex and .bib files.',
                          },
                          {
                            title: "Set main file & compile",
                            desc: 'Click the menu next to your .tex file and select "Set as main document". Then click "Recompile". Download your PDF.',
                          },
                        ].map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {i + 1}
                            </span>
                            <div>
                              <strong className="text-foreground">
                                {step.title}
                              </strong>
                              <p className="mt-0.5">{step.desc}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <Separator />

                    {/* Compiler Recommendations */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold">
                        Recommended Compilers
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          {
                            name: "pdfLaTeX",
                            desc: "Most common, great for English",
                          },
                          {
                            name: "XeLaTeX",
                            desc: "Full Unicode & system fonts",
                          },
                          {
                            name: "LuaLaTeX",
                            desc: "Advanced scripting & Unicode",
                          },
                        ].map((c) => (
                          <div
                            key={c.name}
                            className="p-3 rounded-lg border text-center"
                          >
                            <p className="text-xs font-medium">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {c.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Navigation ---- */}
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
          onClick={goToHome}
          className="text-sm gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Start New Thesis
        </Button>
      </div>
    </div>
  );
}

// Inline icon component for stats
function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
