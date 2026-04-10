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
import { countWords } from "@/utils/word-count";
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
  ChevronDown,
  GripVertical,
  BookOpen,
  Pencil,
  X,
  Copy,
  Minimize2,
  Maximize2,
  AlertTriangle,
  Check,
  Bold,
  Italic,
  Quote,
  DollarSign,
} from "lucide-react";

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
  const {
    thesis,
    addChapter,
    removeChapter,
    updateChapter,
    reorderChapters,
    addSubSection,
    removeSubSection,
    updateSubSection,
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
    // Directly append the duplicated chapter via reorder — no race condition
    const updated = [...chapters, newChapter];
    reorderChapters(updated);
  };

  const handleDeleteChapter = (chapter: ThesisChapter) => {
    removeChapter(chapter.id);
    setDeleteConfirm(null);
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
          <BookOpen className="w-3.5 h-3.5" />
          Step {WIZARD_STEPS[2].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Write Your Chapters
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
          Write and organize each chapter of your thesis. Drag to reorder,
          click to expand and edit sections.
        </p>
      </motion.div>

      {/* Simple stats line */}
      <div className="text-center text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground tabular-nums">{chapters.length}</strong>{" "}
          chapter{chapters.length !== 1 ? "s" : ""}
        </span>
        <span className="mx-2">·</span>
        <span>
          <strong className="text-foreground tabular-nums">{totalSubSections}</strong>{" "}
          section{totalSubSections !== 1 ? "s" : ""}
        </span>
        <span className="mx-2">·</span>
        <span>
          <strong className="text-foreground tabular-nums">
            {totalWords.toLocaleString()}
          </strong>{" "}
          words
        </span>
      </div>

      <div>
        {/* Expand/Collapse controls */}
        {chapters.length > 1 && (
          <div className="flex items-center justify-end mb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={allExpanded ? collapseAll : expandAll}
              className="h-7 text-xs gap-2 text-muted-foreground"
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
          </div>
        )}

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
          /* Chapters list */
          <Reorder.Group
            axis="y"
            values={chapters}
            onReorder={handleChapterReorder}
            className="space-y-2"
          >
            {chapters.map((chapter) => {
              const isExpanded = expandedChapters.has(chapter.id);
              const isEditing = editingChapter === chapter.id;
              const cw = chapterTotalWords(chapter);

              return (
                <Reorder.Item
                  key={chapter.id}
                  value={chapter}
                  className="list-none"
                  layout
                >
                  <Card className="overflow-hidden border-border focus-within:border-primary/30 focus-within:shadow-sm group">
                    {/* Chapter Header */}
                    <CardHeader
                      className="py-3 px-4 cursor-pointer hover:bg-secondary/30 transition-colors select-none"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <div className="flex items-center gap-2">
                        {/* Drag handle */}
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 cursor-grab transition-colors" />

                        {/* Chapter number badge */}
                        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary-foreground">
                            {chapter.number}
                          </span>
                        </div>

                        {/* Title */}
                        <span className="text-sm font-medium flex-1 truncate">
                          {chapter.title || `Chapter ${chapter.number}`}
                        </span>

                        {/* Word count (simple muted badge) */}
                        {cw > 0 && (
                          <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                            {cw.toLocaleString()} words
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* Edit */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
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
                            <Pencil className="w-3 h-3" />
                          </Button>

                          {/* Duplicate (small, less prominent) */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateChapter(chapter);
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
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
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                                disabled={chapters.length <= 1}
                              >
                                <Trash2 className="w-3 h-3" />
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
                                <strong>&quot;{chapter.title}&quot;</strong>?
                                {chapter.subSections.length > 0 && (
                                  <span>
                                    {" "}
                                    This will also remove its{" "}
                                    {chapter.subSections.length} section
                                    {chapter.subSections.length !== 1 ? "s" : ""}
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
                                  onClick={() => handleDeleteChapter(chapter)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Delete
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
                                className="space-y-2"
                              >
                                <Label className="text-xs font-medium text-muted-foreground">
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
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <BookOpen className="w-3 h-3" />
                                Chapter Introduction
                                <span className="text-muted-foreground font-normal">
                                  (optional)
                                </span>
                              </Label>
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
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
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
                              <Textarea
                                value={chapter.content}
                                onChange={(e) =>
                                  updateChapter(chapter.id, {
                                    content: e.target.value,
                                  })
                                }
                                className="text-sm min-h-[100px] resize-y leading-relaxed"
                                placeholder="Write the introductory content for this chapter..."
                              />
                              {/* Word count milestone badge */}
                              {(() => {
                                const wordCount = chapter.content.trim() ? chapter.content.trim().split(/\s+/).filter(Boolean).length : 0;
                                const milestones = [500, 1000, 2000];
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
                            </div>

                            <Separator />

                            {/* Subsections */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Sections ({chapter.subSections.length})
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() =>
                                    addSubSection(chapter.id)
                                  }
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Section
                                </Button>
                              </div>

                              {chapter.subSections.length > 0 ? (
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
                                    <SubSectionCard
                                      key={sub.id}
                                      sub={sub}
                                      index={subIdx}
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
                                        updateSubSection(
                                          chapter.id,
                                          sub.id,
                                          { title: val }
                                        )
                                      }
                                      onContentChange={(val) =>
                                        updateSubSection(
                                          chapter.id,
                                          sub.id,
                                          { content: val }
                                        )
                                      }
                                    />
                                  ))}
                                </Reorder.Group>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  No sections yet. Add one to organize your
                                  content.
                                </p>
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

        {/* Add Chapter Button — visible after list */}
        <div className="mt-4 flex justify-center">
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
      </div>
    </div>
  );
}
