"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import type { ThesisChapter } from "@/lib/thesis-types";

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
    nextStep,
    prevStep,
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

  if (!thesis) return null;

  const { chapters } = thesis;

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedChapters(new Set(chapters.map((c) => c.id)));
  };

  const collapseAll = () => {
    setExpandedChapters(new Set());
  };

  const allExpanded = expandedChapters.size === chapters.length && chapters.length > 0;

  const handleChapterReorder = (reordered: ThesisChapter[]) => {
    reorderChapters(reordered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  const totalWords = chapters.reduce((acc, ch) => {
    const contentWords = ch.content
      ? ch.content.trim().split(/\s+/).filter(Boolean).length
      : 0;
    const subWords = ch.subSections.reduce(
      (subAcc, sub) =>
        subAcc + (sub.content ? sub.content.trim().split(/\s+/).filter(Boolean).length : 0),
      0
    );
    return acc + contentWords + subWords;
  }, 0);

  const truncateContent = (content: string, maxLen: number) => {
    if (!content || !content.trim()) return "No content yet";
    const text = content.trim().replace(/\n/g, " ");
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
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
          Step {WIZARD_STEPS[3].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Write Your Content
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Organize and write each chapter of your thesis. Drag to reorder, click to expand.
        </p>
      </motion.div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5" />
          <span>
            <strong className="text-foreground">{chapters.length}</strong> chapters
          </span>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <span>
          <strong className="text-foreground">{totalWords.toLocaleString()}</strong> words
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span>
          <strong className="text-foreground">
            {chapters.reduce((acc, ch) => acc + ch.subSections.length, 0)}
          </strong>{" "}
          sections
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Expand/Collapse controls */}
        {chapters.length > 1 && (
          <div className="flex items-center justify-end mb-3">
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

        <Reorder.Group
          axis="y"
          values={chapters}
          onReorder={handleChapterReorder}
          className="space-y-3"
        >
          {chapters.map((chapter) => {
            const isExpanded = expandedChapters.has(chapter.id);
            const isEditing = editingChapter === chapter.id;
            const chapterWords = chapter.content
              ? chapter.content.trim().split(/\s+/).filter(Boolean).length
              : 0;
            const totalChapterWords = chapterWords + chapter.subSections.reduce(
              (acc, sub) =>
                acc + (sub.content ? sub.content.trim().split(/\s+/).filter(Boolean).length : 0),
              0
            );

            return (
              <Reorder.Item
                key={chapter.id}
                value={chapter}
                className="list-none"
              >
                <Card className="overflow-hidden transition-all duration-200">
                  {/* Chapter Header */}
                  <CardHeader
                    className="py-3 px-4 cursor-pointer hover:bg-secondary/30 transition-colors select-none"
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0 cursor-grab hidden sm:block" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                            CH {chapter.number}
                          </span>
                          <CardTitle className="text-sm font-semibold truncate">
                            {chapter.title || `Chapter ${chapter.number}`}
                          </CardTitle>
                          {totalChapterWords > 0 && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {totalChapterWords} words
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-muted-foreground">
                            {chapter.subSections.length} section
                            {chapter.subSections.length !== 1 ? "s" : ""}
                          </p>
                          {!isExpanded && totalChapterWords > 0 && (
                            <p className="text-[10px] text-muted-foreground/60 truncate max-w-[250px]">
                              — {truncateContent(chapter.content, 50)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChapter(
                              editingChapter === chapter.id ? null : chapter.id
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
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Chapter</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                              Are you sure you want to delete &quot;{chapter.title}&quot;?
                              This action cannot be undone.
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
                                onClick={() => {
                                  removeChapter(chapter.id);
                                  setDeleteConfirm(null);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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

                            <AnimatePresence>
                              {chapter.subSections.map((sub, subIdx) => {
                                const isSubEditing =
                                  editingSubSection?.chapterId ===
                                    chapter.id &&
                                  editingSubSection?.subId === sub.id;

                                return (
                                  <motion.div
                                    key={sub.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="rounded-lg border bg-card p-3 space-y-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        §{chapter.number}.{subIdx + 1}
                                      </span>
                                      {isSubEditing ? (
                                        <Input
                                          value={sub.title}
                                          onChange={(e) =>
                                            updateSubSection(
                                              chapter.id,
                                              sub.id,
                                              { title: e.target.value }
                                            )
                                          }
                                          className="text-sm flex-1 h-7"
                                          placeholder="Section title"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              setEditingSubSection(null);
                                            }
                                          }}
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="text-sm font-medium flex-1">
                                          {sub.title || "Untitled Section"}
                                        </span>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() =>
                                          setEditingSubSection(
                                            isSubEditing
                                              ? null
                                              : {
                                                  chapterId: chapter.id,
                                                  subId: sub.id,
                                                }
                                          )
                                        }
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        onClick={() =>
                                          removeSubSection(chapter.id, sub.id)
                                        }
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <Textarea
                                      value={sub.content}
                                      onChange={(e) =>
                                        updateSubSection(
                                          chapter.id,
                                          sub.id,
                                          { content: e.target.value }
                                        )
                                      }
                                      className="text-sm min-h-[80px] resize-y leading-relaxed"
                                      placeholder="Write the content for this section..."
                                    />
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>

                            {chapter.subSections.length === 0 && (
                              <div className="text-center py-6 border border-dashed rounded-lg">
                                <FolderPlus className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                                <p className="text-xs text-muted-foreground">
                                  No sections yet. Click &quot;Add Section&quot; to
                                  create one.
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

        {/* Add Chapter Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed h-12 text-sm gap-2"
          onClick={addChapter}
        >
          <Plus className="w-4 h-4" />
          Add New Chapter
        </Button>

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
          <Button type="submit" className="text-sm">
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}
