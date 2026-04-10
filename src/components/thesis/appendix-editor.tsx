"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useThesisStore } from "@/lib/thesis-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Pencil,
  X,
  AlertTriangle,
  BookOpen,
  Settings,
  Info,
} from "lucide-react";

// ============================================================
// Appendix Editor — Manage thesis appendices
// Shown as a collapsible section inside the Chapters step
// ============================================================

export function AppendixEditor() {
  const {
    thesis,
    addAppendix,
    removeAppendix,
    updateAppendix,
    updateOptions,
  } = useThesisStore();

  const appendices = thesis?.appendices ?? [];
  const showAppendices = thesis?.options?.includeAppendices ?? false;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleToggleAppendix = useCallback((id: string) => {
    setEditingId((prev) => (prev === id ? null : id));
  }, []);

  if (!thesis) return null;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="switch-appendices"
            checked={showAppendices}
            onCheckedChange={(checked) => updateOptions({ includeAppendices: checked })}
          />
          <Label htmlFor="switch-appendices" className="text-xs font-medium text-muted-foreground cursor-pointer">
            Include Appendices
          </Label>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs leading-relaxed max-w-[260px]">
                Enables the appendix section after the bibliography. Useful for supplementary
                material like code listings, raw data, or extended proofs.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Appendices List */}
      <AnimatePresence>
        {showAppendices && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden space-y-3"
          >
            {/* Empty state */}
            {appendices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <BookOpen className="w-7 h-7 text-primary/60" />
                </div>
                <h3 className="text-sm font-semibold mb-1">No appendices yet</h3>
                <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
                  Add supplementary material like code listings or raw data.
                </p>
                <Button
                  type="button"
                  onClick={addAppendix}
                  size="sm"
                  className="gap-2 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Appendix
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {appendices.map((app, index) => {
                  const isEditing = editingId === app.id;
                  const letter = String.fromCharCode(65 + index);
                  const wordCount = app.content.trim()
                    ? app.content.trim().split(/\s+/).filter(Boolean).length
                    : 0;

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden border-border/60">
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-secondary-foreground">
                                {letter}
                              </span>
                            </div>

                            {isEditing ? (
                              <Input
                                value={app.title}
                                onChange={(e) =>
                                  updateAppendix(app.id, {
                                    title: e.target.value,
                                  })
                                }
                                className="text-sm flex-1 h-7"
                                placeholder="Appendix title"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") setEditingId(null);
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium flex-1 truncate">
                                {app.title || `Appendix ${letter}`}
                              </span>
                            )}

                            <div className="flex items-center gap-1 shrink-0">
                              {wordCount > 0 && (
                                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                                  {wordCount} words
                                </span>
                              )}

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
                                        handleToggleAppendix(app.id);
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Rename appendix</p>
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
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm(app.id);
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Delete appendix</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </CardHeader>

                        <AnimatePresence>
                          {(isEditing || !app.content.trim()) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <CardContent className="pt-0 px-4 pb-3">
                                <Textarea
                                  value={app.content}
                                  onChange={(e) =>
                                    updateAppendix(app.id, {
                                      content: e.target.value,
                                    })
                                  }
                                  className="text-sm min-h-[120px] resize-y leading-relaxed font-mono"
                                  placeholder="Write your appendix content here... Supports LaTeX commands."
                                />
                              </CardContent>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Delete confirmation */}
                        <Dialog
                          open={deleteConfirm === app.id}
                          onOpenChange={(open) =>
                            setDeleteConfirm(open ? app.id : null)
                          }
                        >
                          <DialogContent className="sm:max-w-[380px]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-base">
                                <AlertTriangle className="w-4 h-4 text-[var(--color-text-warning)]" />
                                Delete Appendix
                              </DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                              Are you sure you want to delete &quot;{app.title ||
                                `Appendix ${letter}`}&quot;?
                              Its content will be permanently removed.
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
                                  removeAppendix(app.id);
                                  setDeleteConfirm(null);
                                  setEditingId(null);
                                  toast.success("Appendix deleted", {
                                    duration: 2000,
                                  });
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </Card>
                    </motion.div>
                  );
                })}

                {/* Add Appendix Button */}
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAppendix}
                    className="gap-2 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Appendix
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
