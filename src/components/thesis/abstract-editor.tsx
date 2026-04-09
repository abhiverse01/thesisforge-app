"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Tag,
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  AlignLeft,
} from "lucide-react";

export function AbstractEditor() {
  const { thesis, setAbstract, addKeyword, removeKeyword, nextStep, prevStep } =
    useThesisStore();
  const [keywordInput, setKeywordInput] = useState("");

  const abstract = thesis?.abstract ?? "";
  const keywords = thesis?.keywords ?? [];

  const handleAddKeyword = useCallback(() => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      addKeyword(kw);
      setKeywordInput("");
    }
  }, [keywordInput, keywords, addKeyword]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddKeyword();
      }
    },
    [handleAddKeyword]
  );

  const wordCount = useMemo(
    () =>
      abstract
        ? abstract.trim().split(/\s+/).filter(Boolean).length
        : 0,
    [abstract]
  );

  if (!thesis) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
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
          Step {WIZARD_STEPS[2].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Abstract & Keywords
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Write a concise summary of your research. A strong abstract typically
          covers the problem, methodology, key findings, and implications.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Abstract */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                Abstract
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {wordCount} words
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Write your abstract here. A typical abstract ranges from 150 to 500 words, summarizing the purpose, methodology, key results, and conclusions of your research..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="text-sm min-h-[200px] resize-y leading-relaxed"
            />

            {/* Word count indicator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((wordCount / 500) * 100, 100)}%`,
                    backgroundColor:
                      wordCount < 100
                        ? "oklch(0.7 0.15 60)"
                        : wordCount <= 500
                          ? "oklch(0.55 0.18 265)"
                          : "oklch(0.577 0.245 27.325)",
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {wordCount < 100
                  ? "Too short"
                  : wordCount <= 500
                    ? "Good length"
                    : "Consider shortening"}
              </span>
            </div>

            {wordCount < 100 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs"
              >
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Aim for at least 150 words. A comprehensive abstract helps readers
                  quickly understand your research scope and contributions.
                </span>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a keyword and press Enter"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim()}
                className="text-xs"
              >
                Add
              </Button>
            </div>

            {/* Keyword chips */}
            <AnimatePresence mode="popLayout">
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <motion.div
                      key={kw}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Badge
                        variant="secondary"
                        className="text-xs px-2.5 py-0.5 gap-1 cursor-pointer hover:bg-destructive/10 group"
                        onClick={() => removeKeyword(kw)}
                      >
                        {kw}
                        <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No keywords added yet. Add 3–6 keywords that represent your research.
                </p>
              )}
            </AnimatePresence>

            <p className="text-[11px] text-muted-foreground">
              Keywords help index your thesis in academic databases. Aim for 3–6
              relevant terms separated by your institution&apos;s style guide.
            </p>
          </CardContent>
        </Card>

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
