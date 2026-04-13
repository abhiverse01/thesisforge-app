'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ImportFileResult } from '@/core/importer';

interface Props {
  open:    boolean;
  onClose: () => void;
  imported: ImportFileResult | null;
}

export function ImportReviewModal({ open, onClose, imported }: Props) {
  const [mappings, setMappings] = useState(imported?.mappings ?? []);

  if (!imported) return null;
  const { result } = imported;

  const toggle = (field: string) => {
    setMappings(prev =>
      prev.map(m => m.field === field ? { ...m, apply: !m.apply } : m)
    );
  };

  const handleApply = () => {
    // Dispatch custom event for the store to handle
    window.dispatchEvent(
      new CustomEvent('thesisforge:import-apply', {
        detail: { result, mappings: mappings.filter(m => m.apply) },
      })
    );
    onClose();
  };

  const confidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">High</Badge>;
    if (score >= 0.5) return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Medium</Badge>;
    return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Low</Badge>;
  };

  const confidenceColor = (score: number) =>
    score >= 0.8 ? 'text-green-600 dark:text-green-400'
    : score >= 0.5 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-500';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Import Review
          </DialogTitle>
          <DialogDescription>
            Extracted from <strong>{result.fileName}</strong>.
            Review what was found and choose what to import.
          </DialogDescription>
        </DialogHeader>

        {/* Overall confidence bar */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Overall confidence
          </span>
          <Progress value={result.confidence.overall * 100} className="flex-1 h-2" />
          <span className={`text-sm font-medium ${confidenceColor(result.confidence.overall)}`}>
            {Math.round(result.confidence.overall * 100)}%
          </span>
        </div>

        {/* Detected template badge */}
        {result.detectedTemplate && (
          <div className="flex items-center gap-2 text-sm px-1">
            <span className="text-muted-foreground">Detected template:</span>
            <Badge variant="outline" className="capitalize">
              {result.detectedTemplate}
            </Badge>
            <span className="text-muted-foreground text-xs">
              (you can change this on step 1)
            </span>
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{w}</p>
            ))}
          </div>
        )}

        <Tabs defaultValue="metadata" className="flex-1 min-h-0">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="metadata">
              Metadata
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {mappings.filter(m => m.field.startsWith('metadata')).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="chapters">
              Chapters
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {result.chapters.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="references">
              References
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {result.references.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Metadata tab */}
          <TabsContent value="metadata" className="mt-3">
            <ScrollArea className="h-72">
              <div className="space-y-2 pr-3">
                {mappings
                  .filter(m => m.field.startsWith('metadata') || m.field === 'keywords')
                  .map(mp => (
                    <motion.div
                      key={mp.field}
                      layout
                      className="flex items-start gap-3 rounded-lg border p-3 bg-card"
                    >
                      <Switch
                        checked={mp.apply}
                        onCheckedChange={() => toggle(mp.field)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {mp.field.startsWith('metadata.') ? mp.field.replace('metadata.', '') : mp.field}
                          </span>
                          {confidenceBadge(mp.confidence)}
                        </div>
                        <p className={`text-sm truncate ${!mp.apply ? 'opacity-40 line-through' : ''}`}>
                          {mp.value.length > 120 ? mp.value.slice(0, 120) + '...' : mp.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{mp.source}</p>
                      </div>
                    </motion.div>
                  ))}
                {mappings.filter(m => m.field.startsWith('metadata') || m.field === 'keywords').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No metadata fields detected in this file.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Chapters tab */}
          <TabsContent value="chapters" className="mt-3">
            <ScrollArea className="h-72">
              <div className="space-y-2 pr-3">
                {result.chapters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No chapters detected in this file.
                  </p>
                ) : result.chapters.map((ch, i) => (
                  <div key={i} className="rounded-lg border p-3 bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Chapter {i + 1}
                      </span>
                      {ch.subsections.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {ch.subsections.length} subsections
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{ch.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{ch.body.split(' ').length.toLocaleString()} words extracted
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* References tab */}
          <TabsContent value="references" className="mt-3">
            <ScrollArea className="h-72">
              <div className="space-y-2 pr-3">
                {result.references.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No references detected in this file.
                  </p>
                ) : result.references.slice(0, 30).map((ref, i) => (
                  <div key={i} className="rounded-lg border p-3 bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{ref.type}</Badge>
                      {ref.year && <span className="text-xs text-muted-foreground">{ref.year}</span>}
                    </div>
                    <p className="text-sm font-medium line-clamp-1">
                      {ref.title || ref.raw?.slice(0, 80) || 'Unknown title'}
                    </p>
                    {ref.author && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ref.author}</p>
                    )}
                  </div>
                ))}
                {result.references.length > 30 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{result.references.length - 30} more references will be imported
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground flex-1">
            {mappings.filter(m => m.apply).length} of {mappings.length} fields will be imported.
            Your existing draft will not be affected for fields you turn off.
          </p>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} className="min-w-[120px]">
            Apply import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
