"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import type { ThesisChapter, ThesisSubSection, ThesisData } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { countWords } from "@/utils/word-count";
import { cn } from "@/lib/utils";
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
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  BookOpen,
  Pencil,
  X,
  Copy,
  ChevronDown,
  AlertTriangle,
  Check,
  Bold,
  Italic,
  Quote,
  DollarSign,
} from "lucide-react";
import { runWritingCoach, type CoachSuggestion } from "@/intelligence/writingCoach";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end) || "text";
  const replacement = before + selected + after;

  // Use the native setter to trigger React's onChange
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(textarea, text.slice(0, start) + replacement + text.slice(end));
  }
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  // Restore selection around the inserted content
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selected.length
    );
  });
}

function chapterTotalWords(ch: ThesisChapter): number {
  return (
    countWords(ch.content) +
    ch.subSections.reduce((s, sub) => s + countWords(sub.content), 0)
  );
}

function readingTimeMins(wordCount: number): string {
  const mins = Math.max(1, Math.ceil(wordCount / 200));
  return `${mins} min`;
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
            <AlertTriangle className="w-4 h-4 text-[var(--color-text-warning)]" />
            Delete Section
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete &quot;{sectionTitle}&quot;? Its content
          will be permanently removed.
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
// SubSection Card (with reorder support)
// ---------------------------------------------------------------------------

function SubSectionCard({
  sub,
  index,
  chapterNumber,
  isEditing,
  onToggleEdit,
  onDelete,
  onTitleChange,
  onContentChange,
}: {
  sub: ThesisSubSection;
  index: number;
  chapterNumber: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onTitleChange: (val: string) => void;
  onContentChange: (val: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Reorder.Item
        value={sub}
        className="list-none"
      >
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
            <div className="cursor-grab active:cursor-grabbing shrink-0">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
            </div>

          <span className="text-xs font-mono text-muted-foreground shrink-0">
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

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px] min-w-[44px] p-1 shrink-0 sm:h-6 sm:w-6 sm:p-0"
            onClick={onToggleEdit}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px] min-w-[44px] p-1 text-destructive hover:text-destructive shrink-0 sm:h-6 sm:w-6 sm:p-0"
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
      </Reorder.Item>

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
  const thesis = useThesisStore(s => s.thesis);
  const addChapter = useThesisStore(s => s.addChapter);
  const removeChapter = useThesisStore(s => s.removeChapter);
  const updateChapter = useThesisStore(s => s.updateChapter);
  const reorderChapters = useThesisStore(s => s.reorderChapters);
  const addSubSection = useThesisStore(s => s.addSubSection);
  const removeSubSection = useThesisStore(s => s.removeSubSection);
  const updateSubSection = useThesisStore(s => s.updateSubSection);
  const undoDeleteChapter = useThesisStore(s => s.undoDeleteChapter);
  const cancelPendingChapterDelete = useThesisStore(s => s.cancelPendingChapterDelete);
  const pendingDeleteChapter = useThesisStore(s => s.pendingDeleteChapter);

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editingSubSection, setEditingSubSection] = useState<{
    chapterId: string;
    subId: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Keyboard shortcuts (kept, no UI panel)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        addChapter();
      }
      if (e.key === "Escape") {
        setExpandedChapters(new Set());
        setEditingChapter(null);
        setEditingSubSection(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addChapter]);

  // -----------------------------------------------------------------------
  // Derived data (pre-guard so hooks are always called in same order)
  // -----------------------------------------------------------------------
  const _thesis = thesis;

  // Writing coach findings per chapter (memoized)
  const coachFindingsPerChapter = useMemo(() => {
    if (!_thesis) return new Map<string, CoachSuggestion[]>();
    try {
      const result = runWritingCoach(_thesis as ThesisData);
      const map = new Map<string, CoachSuggestion[]>();
      for (const s of result.suggestions) {
        const existing = map.get(s.chapterId) || [];
        existing.push(s);
        map.set(s.chapterId, existing);
      }
      return map;
    } catch {
      return new Map<string, CoachSuggestion[]>();
    }
  }, [_thesis]);
  const chapters = _thesis?.chapters?.filter(
    // WHY: Filter out pending-deleted chapter from rendering during the 5-second grace period
    (ch) => ch.id !== pendingDeleteChapter?.item.id
  ) ?? [];
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

  // Derived: ensure selectedChapterId always points to a valid chapter
  const effectiveSelectedId = useMemo(() => {
    if (chapters.length === 0) return null;
    if (selectedChapterId && chapters.find(c => c.id === selectedChapterId)) return selectedChapterId;
    return chapters[0].id;
  }, [chapters, selectedChapterId]);

  // Guard: no thesis data
  if (!_thesis) return null;

  const handleChapterReorder = (reordered: ThesisChapter[]) => {
    // GODMODE 13: Reconcile with full chapter list (including pending-delete chapters).
    const fullChapters = _thesis.chapters || [];
    const reorderedIds = new Set(reordered.map(ch => ch.id));
    const filteredOut = fullChapters.filter(ch => !reorderedIds.has(ch.id));
    reorderChapters([...reordered, ...filteredOut]);
  };

  const handleSubSectionReorder = (
    chapterId: string,
    reordered: ThesisSubSection[]
  ) => {
    updateChapter(chapterId, { subSections: reordered });
  };

  const handleDuplicateChapter = (ch: ThesisChapter) => {
    const fullChapters = _thesis.chapters || [];
    const newChapter: ThesisChapter = {
      id: `chapter-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      number: fullChapters.length + 1,
      title: `${ch.title} (Copy)`,
      content: ch.content,
      subSections: ch.subSections.map((ss) => ({
        id: `subsection-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: ss.title,
        content: ss.content,
      })),
    };
    const updated = [...fullChapters, newChapter];
    reorderChapters(updated);
    toast.success('Chapter duplicated', {
      description: `"${ch.title || 'Untitled'} (Copy)" has been added.`,
      duration: 2000,
    });
  };

  const handleDeleteChapter = (chapter: ThesisChapter) => {
    removeChapter(chapter.id);
    setDeleteConfirm(null);
    toast.warning("Chapter deleted", {
      description: `"${chapter.title || 'Untitled'}" has been removed.`,
      action: {
        label: "Undo",
        onClick: () => { cancelPendingChapterDelete(); },
      },
      duration: 5000,
    });
  };

  // Resolve selected chapter
  const selectedChapter = chapters.find(c => c.id === effectiveSelectedId);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Step header — left-aligned */}
      <div className="mb-8">
        <p className="tf-micro-label mb-2">Step 3 of {WIZARD_STEPS.length}</p>
        <h1 className="tf-heading mb-3">Write Your Chapters</h1>
        <p className="text-sm text-muted-foreground">Write and organize each chapter of your thesis. Drag to reorder, click to expand and edit sections.</p>
      </div>

      {/* Stats line */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pb-2">
        <span>
          <strong className="text-foreground tabular-nums">{chapters.length}</strong>{" "}
          chapter{chapters.length !== 1 ? "s" : ""}
        </span>
        <span className="text-border">·</span>
        <span>
          <strong className="text-foreground tabular-nums">{totalSubSections}</strong>{" "}
          section{totalSubSections !== 1 ? "s" : ""}
        </span>
        <span className="text-border">·</span>
        <span>
          <strong className="text-foreground tabular-nums">
            {totalWords.toLocaleString()}
          </strong>{" "}
          words
        </span>
      </div>

      {/* Empty state */}
      {chapters.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-sm font-semibold mb-1">No chapters yet</h3>
          <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
            Your thesis structure lives here.
          </p>
          <Button type="button" onClick={addChapter} size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add first chapter
          </Button>
        </motion.div>
      ) : (
        /* Two-panel layout */
        <div className="flex flex-col md:flex-row gap-0 md:gap-0">

          {/* Mobile: horizontal scrolling tab strip */}
          <div className="flex md:hidden gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {chapters.map((chapter) => {
              const isSelected = effectiveSelectedId === chapter.id;
              const cw = chapterTotalWords(chapter);
              const findings = coachFindingsPerChapter.get(chapter.id);
              const criticalMajor = findings?.filter(f => f.severity === 'critical' || f.severity === 'major').length ?? 0;
              const dotColor = criticalMajor === 0 ? 'bg-emerald-500' : criticalMajor <= 2 ? 'bg-amber-500' : 'bg-red-500';

              return (
                <button
                  key={chapter.id}
                  onClick={() => {
                    setSelectedChapterId(chapter.id);
                    if (!expandedChapters.has(chapter.id)) {
                      setExpandedChapters(prev => new Set([...prev, chapter.id]));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 min-w-[140px] flex-shrink-0 border",
                    isSelected
                      ? "bg-primary/8 border-primary/20"
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                    {chapter.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{chapter.title || `Chapter ${chapter.number}`}</p>
                    {cw > 0 && (
                      <p className="text-[10px] text-muted-foreground tabular-nums">{cw.toLocaleString()} words</p>
                    )}
                  </div>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                </button>
              );
            })}
            <button
              type="button"
              onClick={addChapter}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[40px] flex-shrink-0 border border-dashed border-border"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Left sidebar (desktop) — chapter list */}
          <div className="hidden md:flex flex-col w-[250px] flex-shrink-0 border-r border-border pr-3">
            {/* Expand/Collapse controls */}
            {chapters.length > 1 && (
              <div className="flex justify-end mb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={allExpanded ? collapseAll : expandAll}
                  className="h-7 text-xs gap-1.5 text-muted-foreground"
                >
                  {allExpanded ? "Collapse" : "Expand"}
                </Button>
              </div>
            )}

            {/* Reorderable chapter list */}
            <Reorder.Group
              axis="y"
              values={chapters}
              onReorder={handleChapterReorder}
              className="flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-260px)]"
            >
              {chapters.map((chapter) => {
                const isSelected = effectiveSelectedId === chapter.id;
                const isExpanded = expandedChapters.has(chapter.id);
                const cw = chapterTotalWords(chapter);
                const findings = coachFindingsPerChapter.get(chapter.id);
                const criticalMajor = findings?.filter(f => f.severity === 'critical' || f.severity === 'major').length ?? 0;
                const dotColor = criticalMajor === 0 ? 'bg-emerald-500' : criticalMajor <= 2 ? 'bg-amber-500' : 'bg-red-500';

                return (
                  <Reorder.Item
                    key={chapter.id}
                    value={chapter}
                    className="list-none"
                    layout
                  >
                    <button
                      onClick={() => {
                        setSelectedChapterId(chapter.id);
                        if (!expandedChapters.has(chapter.id)) {
                          setExpandedChapters(prev => new Set([...prev, chapter.id]));
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group/ch-item border",
                        isSelected
                          ? "bg-primary/8 border-primary/15"
                          : "hover:bg-accent border-transparent"
                      )}
                    >
                      {/* Drag handle */}
                      <div className="cursor-grab active:cursor-grabbing shrink-0">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/ch-item:text-muted-foreground transition-colors" />
                      </div>

                      {/* Chapter number badge */}
                      <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                        {chapter.number}
                      </span>

                      {/* Health indicator dot */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 cursor-default", dotColor)} />
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {criticalMajor === 0 ? <p>No issues found</p>
                              : criticalMajor <= 2 ? <p>{criticalMajor} issue{criticalMajor !== 1 ? 's' : ''} found</p>
                              : <p>{criticalMajor} issues — review recommended</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Title + word count */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{chapter.title || `Chapter ${chapter.number}`}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {cw > 0 ? `${cw.toLocaleString()} words` : "Empty"}
                          {chapter.subSections.length > 0 && ` · ${chapter.subSections.length} sections`}
                        </p>
                      </div>

                      {/* Chevron for expanded state */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      </motion.div>
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>

            {/* Add Chapter button at bottom of sidebar */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChapter}
                className="w-full gap-2 text-xs border-dashed"
              >
                <Plus className="w-3 h-3" />
                Add Chapter
              </Button>
            </div>
          </div>

          {/* Right panel — selected chapter editor */}
          <div className="flex-1 md:pl-6 min-w-0">
            {selectedChapter ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedChapter.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Chapter title — editable inline */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                        {selectedChapter.number}
                      </span>
                      {editingChapter === selectedChapter.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={selectedChapter.title}
                            onChange={(e) =>
                              updateChapter(selectedChapter.id, {
                                title: e.target.value,
                              })
                            }
                            className="text-lg font-semibold"
                            placeholder={`Chapter ${selectedChapter.number}`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingChapter(null);
                            }}
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
                      ) : (
                        <button
                          onClick={() => setEditingChapter(selectedChapter.id)}
                          className="text-lg font-semibold text-left hover:text-primary/80 transition-colors flex items-center gap-2 group/title"
                        >
                          {selectedChapter.title || `Chapter ${selectedChapter.number}`}
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground/0 group-hover/title:text-muted-foreground transition-colors" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action row: duplicate, delete */}
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDuplicateChapter(selectedChapter)}
                          >
                            <Copy className="w-3 h-3" />
                            Duplicate
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicate chapter</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Dialog
                      open={deleteConfirm === selectedChapter.id}
                      onOpenChange={(open) =>
                        setDeleteConfirm(open ? selectedChapter.id : null)
                      }
                    >
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          disabled={chapters.length <= 1}
                          suppressHydrationWarning
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="w-4 h-4 text-[var(--color-text-warning)]" />
                            Delete Chapter
                          </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                          Are you sure you want to delete{" "}
                          <strong>&quot;{selectedChapter.title}&quot;</strong>?
                          {selectedChapter.subSections.length > 0 && (
                            <span>
                              {" "}
                              This will also remove its{" "}
                              {selectedChapter.subSections.length} section
                              {selectedChapter.subSections.length !== 1 ? "s" : ""}
                              .
                            </span>
                          )}
                        </p>
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
                            onClick={() => handleDeleteChapter(selectedChapter)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Chapter content textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="tf-field-label flex items-center gap-2">
                        <BookOpen className="w-3 h-3" />
                        Chapter Introduction
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      {/* Formatting toolbar */}
                      <div className="flex items-center gap-0.5">
                        {[
                          { icon: Bold, before: "\\textbf{", after: "}", label: "Bold" },
                          { icon: Italic, before: "\\textit{", after: "}", label: "Italic" },
                          { icon: Quote, before: "``", after: "''", label: "Quotes" },
                          { icon: DollarSign, before: "$", after: "$", label: "Math" },
                        ].map(({ icon: Icon, before, after, label }) => (
                          <Button
                            key={label}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0.5 text-muted-foreground hover:text-foreground"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const textarea = e.currentTarget.closest('.space-y-2')?.querySelector('textarea') as HTMLTextAreaElement | null;
                              if (textarea) wrapSelection(textarea, before, after);
                            }}
                          >
                            <Icon className="w-3 h-3" />
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      value={selectedChapter.content}
                      onChange={(e) =>
                        updateChapter(selectedChapter.id, {
                          content: e.target.value,
                        })
                      }
                      className="text-sm min-h-[320px] resize-y leading-relaxed bg-transparent border-transparent focus-visible:border-border"
                      placeholder="Write the introductory content for this chapter..."
                    />
                    {/* Persistent word count footer bar */}
                    {selectedChapter.content.trim() && (
                      <div className="flex items-center justify-between px-1 pt-1.5">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {chapterTotalWords(selectedChapter).toLocaleString()} words
                          <span className="text-muted-foreground/40 mx-1">·</span>
                          ~{readingTimeMins(chapterTotalWords(selectedChapter))} read
                        </span>
                        {selectedChapter.subSections.length > 0 && (
                          <span className="text-[11px] tabular-nums text-muted-foreground/60">
                            {selectedChapter.subSections.length} section{selectedChapter.subSections.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Word count milestone badge */}
                    {(() => {
                      const wordCount = selectedChapter.content.trim() ? selectedChapter.content.trim().split(/\s+/).filter(Boolean).length : 0;
                      const milestones = [500, 1000, 2000, 5000];
                      const currentMilestone = milestones.find(m => wordCount >= m && wordCount < m + 50);
                      return currentMilestone && wordCount >= currentMilestone && wordCount < currentMilestone + 50 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium mt-1 bg-[var(--color-fill-success)] text-[var(--color-text-success)]"
                        >
                          <Check className="w-3 h-3" />
                          {currentMilestone.toLocaleString()} words
                        </motion.div>
                      ) : null;
                    })()}
                    {/* Empty chapter content indicator */}
                    {!selectedChapter.content.trim() && selectedChapter.subSections.length === 0 && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-muted/40 border border-dashed border-border/60">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-muted-foreground">No content yet — start writing or add sections below.</span>
                      </div>
                    )}
                  </div>

                  {/* Subsections */}
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="tf-field-label">
                        Sections ({selectedChapter.subSections.length})
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() =>
                          addSubSection(selectedChapter.id)
                        }
                      >
                        <Plus className="w-3 h-3" />
                        Add Section
                      </Button>
                    </div>

                    {selectedChapter.subSections.length > 0 ? (
                      <Reorder.Group
                        axis="y"
                        values={selectedChapter.subSections}
                        onReorder={(reordered) =>
                          handleSubSectionReorder(
                            selectedChapter.id,
                            reordered
                          )
                        }
                        className="space-y-2"
                      >
                        {selectedChapter.subSections.map((sub, subIdx) => (
                          <SubSectionCard
                            key={sub.id}
                            sub={sub}
                            index={subIdx}
                            chapterNumber={selectedChapter.number}
                            isEditing={
                              editingSubSection?.chapterId ===
                                selectedChapter.id &&
                              editingSubSection?.subId === sub.id
                            }
                            onToggleEdit={() =>
                              setEditingSubSection(
                                editingSubSection?.chapterId ===
                                  selectedChapter.id &&
                                editingSubSection?.subId === sub.id
                                  ? null
                                  : {
                                      chapterId: selectedChapter.id,
                                      subId: sub.id,
                                    }
                              )
                            }
                            onDelete={() =>
                              removeSubSection(selectedChapter.id, sub.id)
                            }
                            onTitleChange={(val) =>
                              updateSubSection(
                                selectedChapter.id,
                                sub.id,
                                { title: val }
                              )
                            }
                            onContentChange={(val) =>
                              updateSubSection(
                                selectedChapter.id,
                                sub.id,
                                { content: val }
                              )
                            }
                          />
                        ))}
                      </Reorder.Group>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No sections yet. Add one to organize your content.
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <p className="text-sm text-muted-foreground">Select a chapter from the sidebar to start editing.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile: Add Chapter button below */}
      {chapters.length > 0 && (
        <div className="flex justify-center md:hidden mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addChapter}
            className="gap-2 text-xs border-dashed"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Chapter
          </Button>
        </div>
      )}
    </div>
  );
}
