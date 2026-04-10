"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronDown,
  Code,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Trophy,
  FileDown,
  Upload,
  Share2,
  Home,
  BookOpen,
  Terminal,
  CloudUpload,
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileText,
  Type,
  Hash,
  FileCode,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// Enhanced LaTeX Syntax Highlighter
// ============================================================
function highlightLatex(code: string): string {
  let highlighted = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Comments first (so commands inside comments aren't highlighted)
  highlighted = highlighted.replace(
    /(%[^\n]*)/g,
    '<span class="latex-comment">$1</span>'
  );

  // Document structure commands (preamble level)
  highlighted = highlighted.replace(
    /(\\(?:documentclass|usepackage|begin|end|input|include|includegraphics|caption|label|ref|cite|bibliography|bibliographystyle|addbibresource|printbibliography|tableofcontents|listoffigures|listoftables|appendix|title|author|date|maketitle|titlepage|chapter|section|subsection|subsubsection|paragraph|subparagraph|textbf|textit|emph|underline|footnote|marginnote|newcommand|renewcommand|def|let|setlength|geometry|pagestyle|fancyhf|fancyhead|fancyfoot|headheight|headwidth|textheight|textwidth|linespread|baselinestretch|onehalfspacing|doublespacing|singlespacing|abstract|keywords|dedication|acknowledgments|tableofcontents|lstlisting|lstinline|verbatim|centering|raggedright|raggedleft|hfill|vspace|hspace|newpage|clearpage|pagebreak|linebreak|noindent|indent|parskip|parindent|item|itemize|enumerate|description|figure|table|tabular|align|equation|eqnarray|multline|gather|split|array|matrix|bmatrix|pmatrix|vmatrix|cases|frac|sqrt|sum|prod|int|lim|inf|sup|log|ln|exp|sin|cos|tan|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|infty|partial|nabla|cdot|cdots|ldots|vdots|ddots|quad|qquad|text|mathrm|mathbf|mathit|mathcal|mathbb|mathrm|boldsymbol|left|right|big|Big|bigg|Bigg|phantom|hphantom|vphantom|overline|underline|hat|bar|vec|tilde|dot|ddot|breve|acute|grave|check|tilde|widehat|widetilde|overrightarrow|overleftarrow|overbrace|underbrace|boxed|color|textcolor|colorbox|fcolorbox|pagecolor|definecolor|includepdf|includegraphics|scalebox|resizebox|rotatebox|subfloat|subfigure|minipage|parbox|tcbox|tcolorbox|newtcolorbox|newenvironment|newtheorem|theoremstyle|newtheorem|proof|qed)\b)/g,
    '<span class="latex-command">$1</span>'
  );

  // Braces
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

  // Options inside brackets [content]
  highlighted = highlighted.replace(
    /(\[[^\]]*\])/g,
    '<span class="latex-option">$1</span>'
  );

  return highlighted;
}

// ============================================================
// Circular Progress Indicator (SVG)
// ============================================================
function CircularProgress({
  percentage,
  size = 80,
  strokeWidth = 6,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage === 100) return "text-emerald-500";
    if (percentage >= 75) return "text-primary";
    if (percentage >= 50) return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-sm font-bold">{percentage}%</span>
    </div>
  );
}

// ============================================================
// Confetti Particle
// ============================================================
function ConfettiParticle({ delay, color, x }: { delay: number; color: string; x: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm pointer-events-none"
      style={{
        backgroundColor: color,
        left: `${x}%`,
        top: "50%",
      }}
      initial={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, -80 - Math.random() * 120, -180 - Math.random() * 100],
        x: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
        scale: [0, 1.2, 0.5],
        rotate: [0, Math.random() * 360, Math.random() * 720],
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// ============================================================
// Success Confetti Animation
// ============================================================
function SuccessAnimation({ show }: { show: boolean }) {
  const colors = [
    "oklch(0.65 0.19 305)",
    "oklch(0.70 0.16 264)",
    "oklch(0.70 0.18 155)",
    "oklch(0.65 0.22 42)",
    "oklch(0.60 0.20 25)",
    "oklch(0.72 0.19 55)",
  ];

  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        delay: Math.random() * 0.3,
        color: colors[i % colors.length],
        x: 30 + Math.random() * 40,
      })),
    []
  );

  if (!show) return null;

  return (
    <div className="relative w-full h-0 overflow-visible">
      {particles.map((p, i) => (
        <ConfettiParticle key={i} {...p} />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <Check className="w-6 h-6 text-white" strokeWidth={3} />
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Completion Criteria Item
// ============================================================
function CriteriaItem({
  label,
  met,
  icon: Icon,
}: {
  label: string;
  met: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      )}
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
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
  const [copiedSection, setCopiedSection] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateInfo = thesis
    ? THESIS_TEMPLATES.find((t) => t.type === thesis.type)
    : null;

  // ---- Completion Percentage from Store ----
  const completion = getCompletionPercentage();

  // Completion criteria derived for display
  const criteria = useMemo(() => {
    if (!thesis) return [];
    const m = thesis.metadata;
    return [
      { label: "Title", met: !!m.title.trim(), icon: Type },
      { label: "Author", met: !!m.author.trim(), icon: FileText },
      { label: "University", met: !!m.university.trim(), icon: GraduationCap },
      { label: "Supervisor", met: !!m.supervisor.trim(), icon: BookOpen },
      { label: "Abstract", met: !!thesis.abstract.trim(), icon: FileText },
      { label: "Keywords", met: thesis.keywords.length > 0, icon: Hash },
      {
        label: "Chapter content",
        met: thesis.chapters.some(
          (ch) => ch.content.trim() || ch.subSections.some((ss) => ss.content.trim())
        ),
        icon: FileCode,
      },
      { label: "References", met: thesis.references.length > 0, icon: BookOpen },
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
      toast.success("LaTeX generated successfully!", {
        description: "Your thesis code is ready to download.",
      });
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
      toast.error("Generation failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  }, [thesis, setGeneratedLatex, setGenerating]);

  // ---- Clipboard Helpers ----
  const copyToClipboard = useCallback(async () => {
    if (!generatedLatex) return;
    try {
      await navigator.clipboard.writeText(generatedLatex);
      setCopied(true);
      toast.success("Copied to clipboard!");
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

  const copySection = useCallback(async () => {
    if (!generatedLatex) return;
    try {
      await navigator.clipboard.writeText(generatedLatex);
      setCopiedSection(true);
      toast.success("Section copied!");
      setTimeout(() => setCopiedSection(false), 2000);
    } catch {
      setCopiedSection(true);
      setTimeout(() => setCopiedSection(false), 2000);
    }
  }, [generatedLatex]);

  // ---- File Download ----
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
    toast.success("Downloaded!", { description: "Your .tex file has been saved." });
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
        toast.success("BibTeX downloaded!", {
          description: "Your .bib file has been saved.",
        });
      }
    } catch {
      toast.error("Failed to generate BibTeX");
    }
  }, [thesis, downloadFile]);

  // ---- Export / Import Project ----
  const handleExportProject = useCallback(() => {
    try {
      const jsonStr = exportProject();
      const filename = thesis?.metadata.title
        ? `${thesis.metadata.title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}-project.json`
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
      toast.success("Project exported!", {
        description: "Save this JSON file to restore your project later.",
      });
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
          toast.success("Project imported!", {
            description: "Your thesis has been restored successfully.",
          });
        } else {
          setImportError("Invalid project file. Please check the file and try again.");
          toast.error("Import failed", {
            description: "The file does not appear to be a valid ThesisForge project.",
          });
        }
      };
      reader.readAsText(file);

      // Reset file input so same file can be re-selected
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

  // ---- Chapter Breakdown ----
  const chapterBreakdown = useMemo(() => {
    if (!thesis) return [];
    return thesis.chapters.map((ch) => {
      const cw = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
      const sw = ch.subSections.reduce(
        (subAcc, sub) =>
          subAcc + (sub.content ? sub.content.trim().split(/\s+/).filter(Boolean).length : 0),
        0
      );
      return {
        title: ch.title || `Chapter ${ch.number}`,
        words: cw + sw,
        number: ch.number,
      };
    });
  }, [thesis]);

  const maxChapterWords = useMemo(
    () => Math.max(...chapterBreakdown.map((c) => c.words), 1),
    [chapterBreakdown]
  );

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
          Generate &amp; Download
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Review your thesis summary and generate the LaTeX code. Download the
          file and compile it in any LaTeX editor.
        </p>
      </motion.div>

      {/* ============================================================
          Completion Visualization — Circular Progress + Criteria Checkmarks
          ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="surface-1">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Circular Progress */}
              <div className="shrink-0">
                <CircularProgress percentage={completion} size={88} strokeWidth={7} />
              </div>

              {/* Criteria Grid */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Completion Checklist</h3>
                  {completion === 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                    >
                      <Trophy className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        100% Complete
                      </span>
                    </motion.div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {criteria.map((c) => (
                    <CriteriaItem key={c.label} label={c.label} met={c.met} icon={c.icon} />
                  ))}
                </div>
                {completion < 50 && completion > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2.5 text-center sm:text-left">
                    💡 Tip: Fill in at least title, author, university, and supervisor for a valid title page.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================
          Thesis Summary Stats
          ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="surface-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Thesis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                  <div className="text-center p-3 rounded-lg bg-secondary/50 hidden sm:block">
                    <p className="text-xl font-bold">{stats.references}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">References</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50 hidden sm:block">
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

            {/* ============================================================
                Chapter Breakdown Stats — Collapsible Bar Chart
                ============================================================ */}
            {chapterBreakdown.length > 0 && (
              <>
                <Separator className="my-3" />
                <Collapsible open={chaptersOpen} onOpenChange={setChaptersOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium hover:text-foreground text-muted-foreground transition-colors">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Chapter Word Count Breakdown
                    </span>
                    <motion.div
                      animate={{ rotate: chaptersOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </motion.div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {chapterBreakdown.map((ch) => (
                      <div key={ch.number} className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground w-5 text-right shrink-0">
                          {ch.number}.
                        </span>
                        <span className="text-[11px] text-foreground truncate max-w-[140px] sm:max-w-[200px] shrink-0">
                          {ch.title}
                        </span>
                        <div className="flex-1 h-5 bg-secondary/60 rounded-full overflow-hidden relative">
                          <motion.div
                            className="h-full rounded-full bg-primary/70"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${maxChapterWords > 0 ? (ch.words / maxChapterWords) * 100 : 0}%`,
                            }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground w-14 text-right shrink-0">
                          {ch.words.toLocaleString()} w
                        </span>
                      </div>
                    ))}
                    {stats && (
                      <div className="flex items-center gap-3 pt-1 border-t">
                        <span className="w-5" />
                        <span className="text-[11px] font-semibold">Total</span>
                        <div className="flex-1" />
                        <span className="text-[10px] font-bold w-14 text-right">
                          {stats.totalWordsWithAbstract.toLocaleString()} w
                        </span>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================
          Generate Button + Success Animation
          ============================================================ */}
      <div className="flex flex-col items-center gap-3 relative">
        <AnimatePresence>
          {showSuccess && <SuccessAnimation show={showSuccess} />}
        </AnimatePresence>

        {!generatedLatex ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={generateThesis}
              disabled={isGenerating}
              className="gap-2 px-10 py-7 text-base font-semibold rounded-xl surface-2 hover:surface-3 transition-shadow"
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
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl space-y-3"
          >
            {/* Primary Action — Large Download */}
            <Button
              onClick={downloadLatex}
              className="w-full gap-2 py-5 text-base font-semibold rounded-xl"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Download .tex File
            </Button>

            {/* Secondary Actions Row */}
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
                {copied ? "Copied!" : "Copy All"}
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

            {/* Tertiary Actions Row */}
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
              <Button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: thesis?.metadata.title || "My Thesis",
                      text: "Check out my thesis generated with ThesisForge!",
                    }).catch(() => {});
                  } else {
                    copyToClipboard();
                    toast.info("Link copied to clipboard!");
                  }
                }}
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            </div>

            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportProject}
              className="hidden"
              aria-label="Import project file"
            />

            {importError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive text-center"
              >
                {importError}
              </motion.p>
            )}

            {/* Prominent File Info Bar */}
            {fileSizeBytes > 0 && (
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground px-4 py-2 rounded-lg bg-secondary/50">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <FileCode className="w-3 h-3" />
                  {lineCount} lines
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Download className="w-3 h-3" />
                  {formatFileSize(fileSizeBytes)}
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Code className="w-3 h-3" />
                  LaTeX
                </Badge>
              </div>
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

      {/* ============================================================
          Export / Import Buttons (when no LaTeX generated yet)
          ============================================================ */}
      {!generatedLatex && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
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
        </motion.div>
      )}

      {/* ============================================================
          Code Preview Tabs
          ============================================================ */}
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
                </TabsTrigger>
                <TabsTrigger value="instructions" className="gap-1.5 text-xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                  How to Compile
                </TabsTrigger>
              </TabsList>

              {/* ---- Code Tab with Line Numbers ---- */}
              <TabsContent value="code" className="mt-3">
                <Card className="overflow-hidden surface-1">
                  {/* Code Header with Copy Section */}
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-secondary/30">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <FileCode className="w-3 h-3" />
                        {lineCount} lines
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Download className="w-3 h-3" />
                        {formatFileSize(fileSizeBytes)}
                      </Badge>
                    </div>
                    <Button
                      onClick={copySection}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                    >
                      {copiedSection ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedSection ? "Copied!" : "Copy Section"}
                    </Button>
                  </div>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[500px]">
                      <div className="latex-code-block text-xs leading-relaxed overflow-x-auto flex">
                        {/* Line Numbers Column */}
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
                        {/* Code Column */}
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

              {/* ---- How to Compile Tab (Enhanced) ---- */}
              <TabsContent value="instructions" className="mt-3">
                <Card className="surface-1">
                  <CardContent className="p-5 space-y-5">
                    {/* Option 1: Overleaf */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CloudUpload className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Option 1: Using Overleaf (Recommended)</h3>
                      </div>
                      <ol className="space-y-3 text-xs text-muted-foreground">
                        <li className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                          <div>
                            <strong className="text-foreground">Download the .tex file</strong>
                            <p className="mt-0.5">
                              Click the &quot;Download .tex File&quot; button above. If you have references, also download the .bib file.
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                          <div>
                            <strong className="text-foreground">Go to Overleaf</strong>
                            <p className="mt-0.5">
                              Visit{" "}
                              <a
                                href="https://www.overleaf.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-2"
                              >
                                overleaf.com
                              </a>{" "}
                              and create a free account (or sign in).
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                          <div>
                            <strong className="text-foreground">Create a new project</strong>
                            <p className="mt-0.5">
                              Click &quot;New Project&quot; → &quot;Blank Project&quot; (or &quot;Upload Project&quot; if you want to upload a ZIP).
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                          <div>
                            <strong className="text-foreground">Upload your files</strong>
                            <p className="mt-0.5">
                              In the file tree (left sidebar), click the upload icon. Upload your{" "}
                              <code className="text-[11px] bg-secondary px-1 py-0.5 rounded">.tex</code> file.
                              If you have a{" "}
                              <code className="text-[11px] bg-secondary px-1 py-0.5 rounded">.bib</code> file, upload that too.
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">5</span>
                          <div>
                            <strong className="text-foreground">Set the main file</strong>
                            <p className="mt-0.5">
                              Click the menu (⋮) next to your .tex file and select &quot;Set as main document&quot;.
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">6</span>
                          <div>
                            <strong className="text-foreground">Compile &amp; download PDF</strong>
                            <p className="mt-0.5">
                              Click the green &quot;Recompile&quot; button. If using BibTeX, click the menu → Compiler → set to{" "}
                              <code className="text-[11px] bg-secondary px-1 py-0.5 rounded">pdfLaTeX</code> and compile twice.
                              Download your PDF from the PDF preview panel.
                            </p>
                          </div>
                        </li>
                      </ol>
                    </div>

                    <Separator />

                    {/* Option 2: Command Line */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Option 2: Command Line Compilation</h3>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p>
                          Make sure you have a TeX distribution installed (TeX Live, MiKTeX, or MacTeX).
                        </p>
                        <div className="bg-secondary/60 rounded-lg p-3 font-mono text-[11px] space-y-1.5 border">
                          <p className="text-muted-foreground/60"># Basic compilation (no references)</p>
                          <p>
                            <span className="text-primary">pdflatex</span> thesis.tex
                          </p>
                          <p className="text-muted-foreground/60 mt-2"># With BibTeX references</p>
                          <p>
                            <span className="text-primary">pdflatex</span> thesis.tex
                          </p>
                          <p>
                            <span className="text-primary">bibtex</span> thesis
                          </p>
                          <p>
                            <span className="text-primary">pdflatex</span> thesis.tex
                          </p>
                          <p>
                            <span className="text-primary">pdflatex</span> thesis.tex
                          </p>
                          <p className="text-muted-foreground/60 mt-2"># With XeLaTeX (Unicode / custom fonts)</p>
                          <p>
                            <span className="text-primary">xelatex</span> thesis.tex
                          </p>
                          <p className="text-muted-foreground/60 mt-2"># With LuaLaTeX</p>
                          <p>
                            <span className="text-primary">lualatex</span> thesis.tex
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Recommended Compilers */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold">
                        Recommended LaTeX Compilers
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="p-3 rounded-lg border text-center">
                          <p className="text-xs font-medium">pdfLaTeX</p>
                          <p className="text-[10px] text-muted-foreground">
                            Most common, great for English documents
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border text-center">
                          <p className="text-xs font-medium">XeLaTeX</p>
                          <p className="text-[10px] text-muted-foreground">
                            Full Unicode &amp; system font support
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border text-center">
                          <p className="text-xs font-medium">LuaLaTeX</p>
                          <p className="text-[10px] text-muted-foreground">
                            Advanced scripting &amp; Unicode
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Troubleshooting */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">Troubleshooting</h3>
                      </div>
                      <div className="space-y-2.5">
                        <div className="text-xs text-muted-foreground flex gap-2">
                          <span className="shrink-0 text-amber-500 font-bold">Q:</span>
                          <div>
                            <p className="text-foreground font-medium">&quot;Undefined control sequence&quot; error?</p>
                            <p>
                              Some LaTeX packages may not be available by default. Try using Overleaf (which has all packages) or install the missing package with{" "}
                              <code className="text-[10px] bg-secondary px-1 py-0.5 rounded">tlmgr install &lt;package&gt;</code>.
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          <span className="shrink-0 text-amber-500 font-bold">Q:</span>
                          <div>
                            <p className="text-foreground font-medium">References show as &quot;[?]&quot;?</p>
                            <p>
                              You need to compile with BibTeX. Run: <code className="text-[10px] bg-secondary px-1 py-0.5 rounded">pdflatex → bibtex → pdflatex → pdflatex</code>. In Overleaf, just recompile twice.
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          <span className="shrink-0 text-amber-500 font-bold">Q:</span>
                          <div>
                            <p className="text-foreground font-medium">Special characters (é, ñ, ü) don&apos;t render?</p>
                            <p>
                              Switch to XeLaTeX or LuaLaTeX compiler, or add{" "}
                              <code className="text-[10px] bg-secondary px-1 py-0.5 rounded">\usepackage[utf8]{inputenc}</code> to the preamble for pdfLaTeX.
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          <span className="shrink-0 text-amber-500 font-bold">Q:</span>
                          <div>
                            <p className="text-foreground font-medium">Images don&apos;t appear?</p>
                            <p>
                              Make sure image files are in the same directory (or an &quot;images/&quot; subfolder) and the filenames match. Use{" "}
                              <code className="text-[10px] bg-secondary px-1 py-0.5 rounded">\includegraphics[width=0.8\textwidth]{filename}</code>.
                            </p>
                          </div>
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

      {/* ============================================================
          Navigation Footer
          ============================================================ */}
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={goToHome}
            className="text-sm gap-1.5 text-muted-foreground"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              goToHome();
              toast.info("Returned to homepage. Your thesis data is preserved.");
            }}
            className="text-sm gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
}
