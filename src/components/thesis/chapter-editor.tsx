"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import type { ThesisChapter, ThesisSubSection } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronLeft,
  GripVertical,
  BookOpen,
  Pencil,
  FolderPlus,
  X,
  ListOrdered,
  Minimize2,
  Maximize2,
  ChevronRight,
  Copy,
  FileText,
  GraduationCap,
  Undo2,
  Keyboard,
  AlertTriangle,
  BookMarked,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type WordTier = "empty" | "light" | "good" | "substantial";

interface WordInfo {
  label: string;
  tier: WordTier;
  borderClass: string;
  badgeClass: string;
  dotClass: string;
}

function getWordInfo(wordCount: number): WordInfo {
  if (wordCount === 0)
    return {
      label: "Empty",
      tier: "empty",
      borderClass: "border-l-muted-foreground/40",
      badgeClass:
        "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground",
      dotClass: "bg-muted-foreground/40",
    };
  if (wordCount < 500)
    return {
      label: "Light",
      tier: "light",
      borderClass: "border-l-blue-500",
      badgeClass:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
      dotClass: "bg-blue-500",
    };
  if (wordCount < 1500)
    return {
      label: "Good",
      tier: "good",
      borderClass: "border-l-green-500",
      badgeClass:
        "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400",
      dotClass: "bg-green-500",
    };
  return {
    label: "Substantial",
    tier: "substantial",
    borderClass: "border-l-emerald-500",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  };
}

function chapterTotalWords(ch: ThesisChapter): number {
  return (
    countWords(ch.content) +
    ch.subSections.reduce((s, sub) => s + countWords(sub.content), 0)
  );
}

function truncateContent(content: string, maxLen: number): string {
  if (!content || !content.trim()) return "";
  const text = content.trim().replace(/\n/g, " ");
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

// ---------------------------------------------------------------------------
// Animated Grip Dots Component
// ---------------------------------------------------------------------------

function GripDots({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-[2px] ${className ?? ""}`} aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-[2px]">
          {[0, 1].map((col) => (
            <motion.span
              key={col}
              className="block w-[3px] h-[3px] rounded-full bg-muted-foreground/40"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: (row * 2 + col) * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subsection Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function SubSectionDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  sectionTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  sectionTitle: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Delete Section
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>&quot;{sectionTitle}&quot;</strong>?
          Its content will be permanently removed.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete Section
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Thesis Word Count Progress Bar
// ---------------------------------------------------------------------------

const THESIS_RANGES = [
  { label: "Bachelor's", min: 8000, max: 15000, color: "bg-blue-500" },
  { label: "Master's", min: 15000, max: 40000, color: "bg-green-500" },
  { label: "PhD", min: 40000, max: 80000, color: "bg-emerald-600" },
] as const;

const MAX_SCALE = 80000;

function ThesisProgressBar({ totalWords }: { totalWords: number }) {
  const pct = Math.min((totalWords / MAX_SCALE) * 100, 100);

  // Determine which range we're in
  const activeRange =
    totalWords >= 80000
      ? THESIS_RANGES[2]
      : totalWords >= 40000
        ? THESIS_RANGES[2]
        : totalWords >= 15000
          ? THESIS_RANGES[1]
          : totalWords >= 8000
            ? THESIS_RANGES[0]
            : null;

  // Estimate pages (avg ~250 words/page with 1.5 spacing)
  const estPages = Math.round(totalWords / 250);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <BookMarked className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-foreground">
            {totalWords.toLocaleString()} words
          </span>
          <span className="text-muted-foreground">· ~{estPages} pages</span>
        </div>
        {activeRange && (
          <Badge variant="secondary" className="text-[10px] h-5">
            <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
            {activeRange.label} range
          </Badge>
        )}
      </div>

      {/* Bar */}
      <div className="relative">
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              activeRange ? activeRange.color : "bg-muted-foreground/40"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {/* Range markers */}
        {THESIS_RANGES.map((range) => {
          const leftPct = (range.min / MAX_SCALE) * 100;
          const widthPct = ((range.max - range.min) / MAX_SCALE) * 100;
          return (
            <TooltipProvider key={range.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-0 h-2.5 rounded-sm opacity-15 hover:opacity-30 transition-opacity cursor-default"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor:
                        range.color.replace("bg-", "").includes("blue")
                          ? "#3b82f6"
                          : range.color.replace("bg-", "").includes("green")
                            ? "#22c55e"
                            : "#059669",
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">
                  <p>
                    {range.label}: {(range.min / 1000).toFixed(0)}k–
                    {(range.max / 1000).toFixed(0)}k words
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Current position indicator */}
        {totalWords > 0 && (
          <motion.div
            className="absolute top-[-3px] w-1 h-[14px] bg-primary rounded-full shadow-sm"
            initial={{ left: 0 }}
            animate={{ left: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
        <span>0</span>
        <span>8k</span>
        <span>15k</span>
        <span>40k</span>
        <span>80k</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <motion.div
          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <BookOpen className="w-10 h-10 text-primary/60" />
        </motion.div>
        {/* Floating accent shapes */}
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-blue-400/20"
          animate={{ y: [0, -4, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
        />
        <motion.div
          className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-green-400/20"
          animate={{ y: [0, 3, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
        />
      </div>

      <h3 className="text-lg font-semibold mb-1">No chapters yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Start building your thesis by adding your first chapter. You can add an
        introduction, literature review, methodology, and more.
      </p>

      <Button
        type="button"
        onClick={onAdd}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Your First Chapter
      </Button>

      <div className="mt-6 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Keyboard className="w-3 h-3" />
        <span>Ctrl+Shift+N to add a new chapter</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Chapter Number Badge
// ---------------------------------------------------------------------------

function ChapterNumberBadge({ number }: { number: number }) {
  return (
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm">
      <span className="text-[11px] font-bold text-primary-foreground">
        {number}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubSection Card (with reorder support)
// ---------------------------------------------------------------------------

function SubSectionCard({
  sub,
  index,
  chapterId,
  chapterNumber,
  isEditing,
  onToggleEdit,
  onDelete,
  onTitleChange,
  onContentChange,
}: {
  sub: ThesisSubSection;
  index: number;
  chapterId: string;
  chapterNumber: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onTitleChange: (val: string) => void;
  onContentChange: (val: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const subWords = countWords(sub.content);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10, height: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-lg border bg-card p-3 space-y-2 group"
      >
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-grab shrink-0 sm:hidden opacity-0 group-hover:opacity-100 transition-opacity" />
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-grab shrink-0 hidden sm:block" />

          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            §{chapterNumber}.{index + 1}
          </span>

          {isEditing ? (
            <Input
              value={sub.title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-sm flex-1 h-7"
              placeholder="Section title"
              onKeyDown={(e) => {
                if (e.key === "Enter") onToggleEdit();
              }}
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium flex-1 truncate">
              {sub.title || "Untitled Section"}
            </span>
          )}

          {/* Inline word count */}
          {subWords > 0 && (
            <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-mono shrink-0">
              {subWords}w
            </span>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={onToggleEdit}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <Textarea
          value={sub.content}
          onChange={(e) => onContentChange(e.target.value)}
          className="text-sm min-h-[80px] resize-y leading-relaxed"
          placeholder="Write the content for this section..."
        />
      </motion.div>

      <SubSectionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={onDelete}
        sectionTitle={sub.title || "Untitled Section"}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ChapterEditor() {
  const {
    thesis,
    selectedTemplate,
    addChapter,
    removeChapter,
    updateChapter,
    reorderChapters,
    addSubSection,
    removeSubSection,
    updateSubSection,
    nextStep,
    prevStep,
    undoDeleteChapter,
  } = useThesisStore();

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editingSubSection, setEditingSubSection] = useState<{
    chapterId: string;
    subId: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // -----------------------------------------------------------------------
  // Keyboard shortcuts
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+N — add chapter
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        addChapter();
      }
      // Escape — collapse all
      if (e.key === "Escape") {
        setExpandedChapters(new Set());
        setEditingChapter(null);
        setEditingSubSection(null);
      }
      // Ctrl+Shift+/ — toggle shortcut hint
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "/") {
        e.preventDefault();
        setShowShortcuts((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addChapter]);

  // -----------------------------------------------------------------------
  // Derived data (pre-guard so hooks are always called in same order)
  // -----------------------------------------------------------------------
  const _thesis = thesis;
  const chapters = _thesis?.chapters ?? [];
  const totalWords = chapters.reduce(
    (acc, ch) => acc + chapterTotalWords(ch),
    0
  );
  const totalSubSections = chapters.reduce(
    (acc, ch) => acc + ch.subSections.length,
    0
  );
  const allExpanded =
    expandedChapters.size === chapters.length && chapters.length > 0;

  // -----------------------------------------------------------------------
  // Handlers (before conditional return to satisfy rules-of-hooks)
  // -----------------------------------------------------------------------
  const toggleChapter = useCallback((id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedChapters(new Set(chapters.map((c) => c.id)));
  }, [chapters]);

  const collapseAll = useCallback(() => {
    setExpandedChapters(new Set());
  }, []);

  // Guard: no thesis data
  if (!_thesis) return null;

  const handleChapterReorder = (reordered: ThesisChapter[]) => {
    reorderChapters(reordered);
  };

  const handleSubSectionReorder = (
    chapterId: string,
    reordered: ThesisSubSection[]
  ) => {
    updateChapter(chapterId, { subSections: reordered });
  };

  const handleDuplicateChapter = (ch: ThesisChapter) => {
    const newChapter: ThesisChapter = {
      id: `chapter-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      number: chapters.length + 1,
      title: `${ch.title} (Copy)`,
      content: ch.content,
      subSections: ch.subSections.map((ss) => ({
        id: `subsection-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: ss.title,
        content: ss.content,
      })),
    };
    // We use a special update approach — just addChapter then immediately update
    addChapter();
    // After adding, the last chapter gets the default title; we override it.
    // Since addChapter pushes synchronously via zustand, we need to do it in one go.
    // A simpler approach: manually construct the thesis chapters array.
    // However, we can use updateChapter after a micro-delay.
    // Actually the cleanest way: update the store directly.
    setTimeout(() => {
      // Find the last chapter (the one just added) and replace it
      const currentChapters = useThesisStore.getState().thesis?.chapters;
      if (currentChapters) {
        const lastIdx = currentChapters.length - 1;
        if (lastIdx >= 0 && currentChapters[lastIdx]) {
          const updated = [...currentChapters];
          updated[lastIdx] = { ...newChapter, number: lastIdx + 1 };
          reorderChapters(updated);
        }
      }
    }, 0);
  };

  const handleDeleteChapter = (chapter: ThesisChapter) => {
    removeChapter(chapter.id);
    setDeleteConfirm(null);

    // Show undo toast
    toast(`"${chapter.title}" deleted.`, {
      description: "The chapter and all its sections have been removed.",
      action: {
        label: "Undo",
        onClick: () => {
          undoDeleteChapter();
          toast.success("Chapter restored!");
        },
      },
      duration: 6000,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
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
          Step {WIZARD_STEPS[3].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Write Your Content
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Organize and write each chapter of your thesis. Drag to reorder, click
          to expand.
        </p>
      </motion.div>

      {/* Word Count Progress Bar */}
      <ThesisProgressBar totalWords={totalWords} />

      {/* Stats bar */}
      <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5" />
          <span>
            <strong className="text-foreground">{chapters.length}</strong>{" "}
            chapter{chapters.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <span>
          <strong className="text-foreground">{totalWords.toLocaleString()}</strong>{" "}
          words
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span>
          <strong className="text-foreground">{totalSubSections}</strong>{" "}
          section{totalSubSections !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Keyboard shortcuts hint */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                <kbd className="kbd text-[10px]">Ctrl+Shift+N</kbd> New chapter
              </span>
              <span>
                <kbd className="kbd text-[10px]">Esc</kbd> Collapse all
              </span>
              <span>
                <kbd className="kbd text-[10px]">Ctrl+Shift+/</kbd> Toggle
                shortcuts
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit}>
        {/* Expand/Collapse controls */}
        {chapters.length > 1 && (
          <div className="flex items-center justify-end mb-3 gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShortcuts((p) => !p)}
                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Shortcuts</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Show keyboard shortcuts</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={allExpanded ? collapseAll : expandAll}
                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                  >
                    {allExpanded ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        Expand All
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{allExpanded ? "Collapse all chapters" : "Expand all chapters"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Empty state */}
        {chapters.length === 0 ? (
          <EmptyState onAdd={addChapter} />
        ) : (
          /* Chapters list */
          <Reorder.Group
            axis="y"
            values={chapters}
            onReorder={handleChapterReorder}
            className="space-y-3"
          >
            {chapters.map((chapter) => {
              const isExpanded = expandedChapters.has(chapter.id);
              const isEditing = editingChapter === chapter.id;
              const cw = chapterTotalWords(chapter);
              const info = getWordInfo(cw);
              const previewText = truncateContent(chapter.content, 80);

              return (
                <Reorder.Item
                  key={chapter.id}
                  value={chapter}
                  className="list-none"
                  layout
                >
                  <Card
                    className={`overflow-hidden transition-all duration-200 border-l-4 ${info.borderClass}`}
                  >
                    {/* Chapter Header */}
                    <CardHeader
                      className="py-3 px-4 cursor-pointer hover:bg-secondary/30 transition-colors select-none"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Drag handle */}
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab hidden sm:block" />

                        {/* Chapter number badge */}
                        <ChapterNumberBadge number={chapter.number} />

                        {/* Title & metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate">
                              {chapter.title || `Chapter ${chapter.number}`}
                            </span>
                            {/* Word count badge */}
                            <Badge
                              variant="secondary"
                              className={`text-[9px] h-5 px-1.5 gap-1 ${info.badgeClass}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`}
                              />
                              {info.label}
                              {cw > 0 && (
                                <span className="font-mono">{cw}</span>
                              )}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-muted-foreground">
                              {chapter.subSections.length} section
                              {chapter.subSections.length !== 1 ? "s" : ""}
                            </p>
                            {/* Truncated content preview in collapsed state */}
                            {!isExpanded && previewText && (
                              <>
                                <Separator
                                  orientation="vertical"
                                  className="h-2.5"
                                />
                                <p className="text-[10px] text-muted-foreground/60 truncate max-w-[280px]">
                                  {previewText}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* Edit */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChapter(
                                editingChapter === chapter.id
                                  ? null
                                  : chapter.id
                              );
                              setExpandedChapters((prev) => {
                                const next = new Set(prev);
                                next.add(chapter.id);
                                return next;
                              });
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          {/* Duplicate */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateChapter(chapter);
                                  }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Duplicate chapter</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Delete */}
                          <Dialog
                            open={deleteConfirm === chapter.id}
                            onOpenChange={(open) =>
                              setDeleteConfirm(open ? chapter.id : null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                                disabled={chapters.length <= 1}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  Delete Chapter
                                </DialogTitle>
                              </DialogHeader>
                              <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete{" "}
                                <strong>&quot;{chapter.title}&quot;</strong>?
                                {chapter.subSections.length > 0 && (
                                  <span>
                                    {" "}
                                    This will also remove its{" "}
                                    {chapter.subSections.length} section
                                    {chapter.subSections.length !== 1
                                      ? "s"
                                      : ""}
                                    .
                                  </span>
                                )}
                              </p>
                              {cw > 0 && (
                                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                                  <FileText className="w-3 h-3 inline mr-1" />
                                  {cw.toLocaleString()} words will be permanently
                                  deleted.
                                </div>
                              )}
                              <div className="flex justify-end gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteChapter(chapter)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Delete Chapter
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Chevron */}
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <CardContent className="pt-0 px-4 pb-4 space-y-4">
                            {/* Chapter Title Edit */}
                            {isEditing && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="space-y-1.5"
                              >
                                <Label className="text-xs font-medium">
                                  Chapter Title
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    value={chapter.title}
                                    onChange={(e) =>
                                      updateChapter(chapter.id, {
                                        title: e.target.value,
                                      })
                                    }
                                    className="text-sm"
                                    placeholder={`Chapter ${chapter.number}`}
                                    autoFocus
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => setEditingChapter(null)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            )}

                            {/* Chapter Content */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium flex items-center gap-1.5">
                                <BookOpen className="w-3 h-3" />
                                Chapter Introduction
                                <span className="text-muted-foreground font-normal">
                                  (optional — introductory text for this chapter)
                                </span>
                              </Label>
                              <Textarea
                                value={chapter.content}
                                onChange={(e) =>
                                  updateChapter(chapter.id, {
                                    content: e.target.value,
                                  })
                                }
                                className="text-sm min-h-[100px] resize-y leading-relaxed"
                                placeholder="Write the introductory content for this chapter. This could provide context, outline the chapter structure, or present key concepts..."
                              />
                            </div>

                            <Separator />

                            {/* Subsections */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold flex items-center gap-1.5">
                                  Sections
                                  <span className="text-muted-foreground font-normal">
                                    ({chapter.subSections.length})
                                  </span>
                                  {/* Total subsection word count */}
                                  {chapter.subSections.length > 0 && (
                                    <span className="text-[9px] text-muted-foreground font-mono font-normal ml-1">
                                      —{" "}
                                      {chapter.subSections.reduce(
                                        (s, sub) => s + countWords(sub.content),
                                        0
                                      )}{" "}
                                      words total
                                    </span>
                                  )}
                                </Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => addSubSection(chapter.id)}
                                >
                                  <FolderPlus className="w-3 h-3" />
                                  Add Section
                                </Button>
                              </div>

                              {/* Reorderable subsections */}
                              {chapter.subSections.length > 0 && (
                                <Reorder.Group
                                  axis="y"
                                  values={chapter.subSections}
                                  onReorder={(reordered) =>
                                    handleSubSectionReorder(
                                      chapter.id,
                                      reordered
                                    )
                                  }
                                  className="space-y-2"
                                >
                                  {chapter.subSections.map((sub, subIdx) => (
                                    <Reorder.Item
                                      key={sub.id}
                                      value={sub}
                                      className="list-none"
                                    >
                                      <SubSectionCard
                                        sub={sub}
                                        index={subIdx}
                                        chapterId={chapter.id}
                                        chapterNumber={chapter.number}
                                        isEditing={
                                          editingSubSection?.chapterId ===
                                            chapter.id &&
                                          editingSubSection?.subId === sub.id
                                        }
                                        onToggleEdit={() =>
                                          setEditingSubSection(
                                            editingSubSection?.chapterId ===
                                                chapter.id &&
                                            editingSubSection?.subId === sub.id
                                              ? null
                                              : {
                                                  chapterId: chapter.id,
                                                  subId: sub.id,
                                                }
                                          )
                                        }
                                        onDelete={() =>
                                          removeSubSection(chapter.id, sub.id)
                                        }
                                        onTitleChange={(val) =>
                                          updateSubSection(chapter.id, sub.id, {
                                            title: val,
                                          })
                                        }
                                        onContentChange={(val) =>
                                          updateSubSection(chapter.id, sub.id, {
                                            content: val,
                                          })
                                        }
                                      />
                                    </Reorder.Item>
                                  ))}
                                </Reorder.Group>
                              )}

                              {chapter.subSections.length === 0 && (
                                <div className="text-center py-6 border border-dashed rounded-lg">
                                  <FolderPlus className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                                  <p className="text-xs text-muted-foreground">
                                    No sections yet. Click &quot;Add
                                    Section&quot; to create one.
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}

        {/* Add Chapter Button */}
        {chapters.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed h-12 text-sm gap-2"
              onClick={addChapter}
            >
              <Plus className="w-4 h-4" />
              Add New Chapter
              <kbd className="kbd text-[10px] ml-2">Ctrl+Shift+N</kbd>
            </Button>
          </motion.div>
        )}

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
          <Button type="submit" className="text-sm gap-1.5">
            Continue to References
            <ArrowRight className="w-4 h-4" />
            <span className="text-[10px] opacity-80">
              {totalWords.toLocaleString()}w
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
