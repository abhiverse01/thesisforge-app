'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  listSnapshots,
  restoreSnapshot,
  type SnapshotSummary,
} from '@/core/persistence';
import { useThesisStore } from '@/lib/thesis-store';
import type { ThesisData } from '@/lib/thesis-types';

// ============================================================
// Types
// ============================================================

interface ThesisDiffProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DiffDimension {
  label: string;
  type: 'word-count' | 'references' | 'completeness' | 'metadata' | 'chapters' | 'options';
  valueA: string | number;
  valueB: string | number;
  change: 'added' | 'removed' | 'changed' | 'unchanged';
}

interface SnapshotDiffData {
  snapshotA: { id: string; label: string; createdAt: number; data: ThesisData };
  snapshotB: { id: string; label: string; createdAt: number; data: ThesisData };
  dimensions: DiffDimension[];
}

interface ChapterDiffEntry {
  chapterNumber: number;
  titleA: string;
  titleB: string;
  wordsA: number;
  wordsB: number;
  delta: number;
  sectionsA: number;
  sectionsB: number;
  titleChanged: boolean;
}

interface ReferenceChange {
  id: string;
  title: string;
  authors: string;
  year: string;
  action: 'added' | 'removed';
}

// ============================================================
// Helpers
// ============================================================

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================
// Diff Computation
// ============================================================

function computeDetailedDiff(dataA: ThesisData, dataB: ThesisData): DiffDimension[] {
  const dimensions: DiffDimension[] = [];

  // 1. Total word count comparison
  const allTextA =
    dataA.abstract +
    ' ' +
    dataA.chapters.map((c) => c.content + ' ' + c.subSections.map((s) => s.content).join(' ')).join(' ') +
    ' ' +
    dataA.appendices.map((a) => a.content).join(' ');
  const allTextB =
    dataB.abstract +
    ' ' +
    dataB.chapters.map((c) => c.content + ' ' + c.subSections.map((s) => s.content).join(' ')).join(' ') +
    ' ' +
    dataB.appendices.map((a) => a.content).join(' ');

  const totalWordsA = countWords(allTextA);
  const totalWordsB = countWords(allTextB);
  const wordDelta = totalWordsB - totalWordsA;

  dimensions.push({
    label: 'Total Word Count',
    type: 'word-count',
    valueA: totalWordsA,
    valueB: totalWordsB,
    change:
      wordDelta > 0 ? 'added' : wordDelta < 0 ? 'removed' : 'unchanged',
  });

  // 2. Abstract word count
  const absWordsA = countWords(dataA.abstract);
  const absWordsB = countWords(dataB.abstract);
  dimensions.push({
    label: 'Abstract Words',
    type: 'word-count',
    valueA: absWordsA,
    valueB: absWordsB,
    change:
      absWordsB > absWordsA ? 'added' : absWordsB < absWordsA ? 'removed' : 'unchanged',
  });

  // 3. Chapter count
  const chapCountA = dataA.chapters.length;
  const chapCountB = dataB.chapters.length;
  dimensions.push({
    label: 'Chapters',
    type: 'chapters',
    valueA: chapCountA,
    valueB: chapCountB,
    change:
      chapCountB > chapCountA ? 'added' : chapCountB < chapCountA ? 'removed' : 'unchanged',
  });

  // 4. Reference count
  const refCountA = dataA.references.length;
  const refCountB = dataB.references.length;
  dimensions.push({
    label: 'References',
    type: 'references',
    valueA: refCountA,
    valueB: refCountB,
    change:
      refCountB > refCountA ? 'added' : refCountB < refCountA ? 'removed' : 'unchanged',
  });

  // 5. Appendix count
  const appCountA = dataA.appendices.length;
  const appCountB = dataB.appendices.length;
  dimensions.push({
    label: 'Appendices',
    type: 'chapters',
    valueA: appCountA,
    valueB: appCountB,
    change:
      appCountB > appCountA ? 'added' : appCountB < appCountA ? 'removed' : 'unchanged',
  });

  // 6. Keywords count
  const kwCountA = dataA.keywords.length;
  const kwCountB = dataB.keywords.length;
  dimensions.push({
    label: 'Keywords',
    type: 'metadata',
    valueA: kwCountA,
    valueB: kwCountB,
    change:
      kwCountB > kwCountA ? 'added' : kwCountB < kwCountA ? 'removed' : 'unchanged',
  });

  // 7. Metadata field changes
  const metaFields: Array<{ key: keyof ThesisData['metadata']; label: string }> = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'university', label: 'University' },
    { key: 'department', label: 'Department' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'supervisor', label: 'Supervisor' },
    { key: 'submissionDate', label: 'Submission Date' },
  ];

  for (const field of metaFields) {
    const valA = dataA.metadata[field.key] || '';
    const valB = dataB.metadata[field.key] || '';
    const changed = valA !== valB && (valA || valB);
    dimensions.push({
      label: field.label,
      type: 'metadata',
      valueA: valA || '(empty)',
      valueB: valB || '(empty)',
      change: changed ? 'changed' : 'unchanged',
    });
  }

  // 8. Options changes
  const optFields: Array<{ key: keyof ThesisData['options']; label: string }> = [
    { key: 'fontSize', label: 'Font Size' },
    { key: 'paperSize', label: 'Paper Size' },
    { key: 'lineSpacing', label: 'Line Spacing' },
    { key: 'marginSize', label: 'Margin Size' },
    { key: 'citationStyle', label: 'Citation Style' },
    { key: 'figureNumbering', label: 'Figure Numbering' },
    { key: 'tableNumbering', label: 'Table Numbering' },
    { key: 'tocDepth', label: 'TOC Depth' },
    { key: 'includeDedication', label: 'Dedication' },
    { key: 'includeAcknowledgment', label: 'Acknowledgment' },
    { key: 'includeAppendices', label: 'Appendices Toggle' },
    { key: 'includeListings', label: 'Listings' },
    { key: 'includeGlossary', label: 'Glossary' },
  ];

  for (const field of optFields) {
    const valA = String(dataA.options[field.key]);
    const valB = String(dataB.options[field.key]);
    const changed = valA !== valB;
    dimensions.push({
      label: field.label,
      type: 'options',
      valueA: valA,
      valueB: valB,
      change: changed ? 'changed' : 'unchanged',
    });
  }

  return dimensions;
}

function computeChapterDiffs(dataA: ThesisData, dataB: ThesisData): ChapterDiffEntry[] {
  const entries: ChapterDiffEntry[] = [];
  const maxChapters = Math.max(dataA.chapters.length, dataB.chapters.length);

  for (let i = 0; i < maxChapters; i++) {
    const chapA = dataA.chapters[i];
    const chapB = dataB.chapters[i];

    const titleA = chapA?.title || '(removed)';
    const titleB = chapB?.title || '(removed)';

    const allContentA = chapA
      ? chapA.content + ' ' + chapA.subSections.map((s) => s.content).join(' ')
      : '';
    const allContentB = chapB
      ? chapB.content + ' ' + chapB.subSections.map((s) => s.content).join(' ')
      : '';

    const wordsA = countWords(allContentA);
    const wordsB = countWords(allContentB);

    entries.push({
      chapterNumber: i + 1,
      titleA,
      titleB,
      wordsA,
      wordsB,
      delta: wordsB - wordsA,
      sectionsA: chapA?.subSections.length || 0,
      sectionsB: chapB?.subSections.length || 0,
      titleChanged: titleA !== titleB,
    });
  }

  return entries;
}

function computeReferenceChanges(
  dataA: ThesisData,
  dataB: ThesisData
): ReferenceChange[] {
  const changes: ReferenceChange[] = [];

  const idsA = new Set(dataA.references.map((r) => r.id));
  const idsB = new Set(dataB.references.map((r) => r.id));

  // Added references (in B but not A)
  for (const ref of dataB.references) {
    if (!idsA.has(ref.id)) {
      changes.push({
        id: ref.id,
        title: ref.title || '(untitled)',
        authors: ref.authors || '(unknown)',
        year: ref.year || '—',
        action: 'added',
      });
    }
  }

  // Removed references (in A but not B)
  for (const ref of dataA.references) {
    if (!idsB.has(ref.id)) {
      changes.push({
        id: ref.id,
        title: ref.title || '(untitled)',
        authors: ref.authors || '(unknown)',
        year: ref.year || '—',
        action: 'removed',
      });
    }
  }

  return changes;
}

function getChapterChartData(
  dataA: ThesisData,
  dataB: ThesisData
): Array<{ name: string; A: number; B: number }> {
  const maxChapters = Math.max(dataA.chapters.length, dataB.chapters.length);
  const data: Array<{ name: string; A: number; B: number }> = [];

  for (let i = 0; i < maxChapters; i++) {
    const chapA = dataA.chapters[i];
    const chapB = dataB.chapters[i];

    const wordsA = chapA
      ? countWords(chapA.content + ' ' + chapA.subSections.map((s) => s.content).join(' '))
      : 0;
    const wordsB = chapB
      ? countWords(chapB.content + ' ' + chapB.subSections.map((s) => s.content).join(' '))
      : 0;

    const label = chapB?.title || chapA?.title || `Ch. ${i + 1}`;
    // Truncate long chapter names for chart labels
    const shortLabel =
      label.length > 18 ? label.substring(0, 16) + '...' : label;

    data.push({
      name: shortLabel,
      A: wordsA,
      B: wordsB,
    });
  }

  return data;
}

// ============================================================
// Sub-components
// ============================================================

function ChangeIndicator({ change }: { change: DiffDimension['change'] }) {
  const config = {
    added: { label: '+', className: 'bg-[var(--color-fill-success)] text-[var(--color-text-success)]' },
    removed: { label: '−', className: 'bg-[var(--color-fill-danger)] text-[var(--color-text-danger)]' },
    changed: { label: '↔', className: 'bg-[var(--color-fill-warning)] text-[var(--color-text-warning)]' },
    unchanged: { label: '—', className: 'bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]' },
  };

  const c = config[change];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function DiffSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-[var(--color-bg-muted)] p-4 mb-4">
        <svg
          className="size-8 text-[var(--color-text-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
    </div>
  );
}

// Custom tooltip for the bar chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--color-text-primary)]">
            {entry.name}: {entry.value.toLocaleString()} words
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="mt-1 border-t border-[var(--color-border-subtle)] pt-1 text-xs font-medium">
          <span
            className={
              payload[1].value > payload[0].value
                ? 'text-[var(--color-text-success)]'
                : payload[1].value < payload[0].value
                  ? 'text-[var(--color-text-danger)]'
                  : 'text-[var(--color-text-tertiary)]'
            }
          >
            {payload[1].value > payload[0].value
              ? `+${(payload[1].value - payload[0].value).toLocaleString()} words`
              : payload[1].value < payload[0].value
                ? `-${(payload[0].value - payload[1].value).toLocaleString()} words`
                : 'No change'}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

const CURRENT_STATE_ID = '__current__';

export default function ThesisDiff({ isOpen, onClose }: ThesisDiffProps) {
  // Store: live thesis data
  const thesis = useThesisStore((s) => s.thesis);

  // State
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>(CURRENT_STATE_ID);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [computing, setComputing] = useState(false);
  const [diffResult, setDiffResult] = useState<SnapshotDiffData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  // Load snapshots on mount
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function load() {
      setLoadingSnapshots(true);
      setError(null);
      try {
        const list = await listSnapshots(thesis ?? undefined);
        if (!cancelled) {
          setSnapshots(list);
          // Default A to the most recent snapshot (if available)
          if (list.length > 0 && !selectedA) {
            setSelectedA(list[0].id);
          }
        }
      } catch (err) {
        console.error('[ThesisDiff] Failed to load snapshots:', err);
        if (!cancelled) {
          setError('Failed to load snapshots. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoadingSnapshots(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, thesis]);

  // Reset diff when selection changes
  useEffect(() => {
    setDiffResult(null);
  }, [selectedA, selectedB]);

  // Compare handler
  const handleCompare = useCallback(async () => {
    if (!selectedA || !selectedB) return;
    if (selectedA === selectedB) {
      setError('Please select two different versions to compare.');
      return;
    }

    setComputing(true);
    setError(null);
    setDiffResult(null);

    try {
      // Helper to get thesis data for a selection
      async function getData(id: string): Promise<{
        id: string;
        label: string;
        createdAt: number;
        data: ThesisData;
      } | null> {
        if (id === CURRENT_STATE_ID) {
          if (!thesis) return null;
          return {
            id: CURRENT_STATE_ID,
            label: 'Current State',
            createdAt: Date.now(),
            data: thesis,
          };
        }

        const snapshotData = await restoreSnapshot(id);
        if (!snapshotData) return null;

        const summary = snapshots.find((s) => s.id === id);
        return {
          id,
          label: summary?.label || `Snapshot ${id.slice(0, 12)}`,
          createdAt: summary?.createdAt || 0,
          data: snapshotData,
        };
      }

      const dataA = await getData(selectedA);
      const dataB = await getData(selectedB);

      if (!dataA || !dataB) {
        setError('Could not load one or both snapshots. They may have been deleted.');
        setComputing(false);
        return;
      }

      // Small delay to let the skeleton render
      await new Promise((r) => setTimeout(r, 100));

      const dimensions = computeDetailedDiff(dataA.data, dataB.data);

      setDiffResult({
        snapshotA: dataA,
        snapshotB: dataB,
        dimensions,
      });
    } catch (err) {
      console.error('[ThesisDiff] Compare failed:', err);
      setError('An error occurred while computing the diff. Please try again.');
    } finally {
      setComputing(false);
    }
  }, [selectedA, selectedB, thesis, snapshots]);

  // Get snapshot label for display
  function getSnapshotLabel(id: string): string {
    if (id === CURRENT_STATE_ID) return 'Current State';
    const snap = snapshots.find((s) => s.id === id);
    if (!snap) return 'Unknown';
    const tagBadge = snap.tag ? `[${snap.tag}] ` : '';
    return `${tagBadge}${snap.label} — ${formatDate(snap.createdAt)}`;
  }

  // Derived data
  const chapterDiffs = diffResult
    ? computeChapterDiffs(diffResult.snapshotA.data, diffResult.snapshotB.data)
    : [];

  const chapterChartData = diffResult
    ? getChapterChartData(diffResult.snapshotA.data, diffResult.snapshotB.data)
    : [];

  const referenceChanges = diffResult
    ? computeReferenceChanges(
        diffResult.snapshotA.data,
        diffResult.snapshotB.data
      )
    : [];

  const addedRefs = referenceChanges.filter((r) => r.action === 'added');
  const removedRefs = referenceChanges.filter((r) => r.action === 'removed');

  const changedDimensions = diffResult
    ? diffResult.dimensions.filter((d) => d.change !== 'unchanged')
    : [];

  const unchangedDimensions = diffResult
    ? diffResult.dimensions.filter((d) => d.change === 'unchanged')
    : [];

  // ============================================================
  // Render
  // ============================================================

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border-subtle)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[var(--color-text-primary)]">
              Thesis Version Comparison
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--color-text-secondary)]">
              Compare two snapshots to see what changed between versions.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* ── Snapshot Selection ── */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select A */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                  Compare from
                </label>
                {loadingSnapshots ? (
                  <Skeleton className="h-9 w-full" />
                ) : snapshots.length === 0 && !thesis ? (
                  <p className="text-sm text-[var(--color-text-tertiary)] py-2">
                    No snapshots available
                  </p>
                ) : (
                  <Select
                    value={selectedA}
                    onValueChange={setSelectedA}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select snapshot..." />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map((snap) => (
                        <SelectItem key={snap.id} value={snap.id}>
                          {getSnapshotLabel(snap.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Select B */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                  Compare to
                </label>
                {loadingSnapshots ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    value={selectedB}
                    onValueChange={setSelectedB}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select snapshot..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CURRENT_STATE_ID}>
                        Current State (live)
                      </SelectItem>
                      {snapshots.map((snap) => (
                        <SelectItem key={snap.id} value={snap.id}>
                          {getSnapshotLabel(snap.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Compare button */}
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={handleCompare}
                disabled={!selectedA || !selectedB || selectedA === selectedB || computing || loadingSnapshots}
                className="bg-[var(--c-brand-600)] hover:bg-[var(--c-brand-800)] text-white"
              >
                {computing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Comparing...
                  </>
                ) : (
                  'Compare Versions'
                )}
              </Button>

              {error && (
                <span className="text-xs text-[var(--color-text-danger)]">
                  {error}
                </span>
              )}
            </div>
          </section>

          {/* ── Diff Results ── */}
          <AnimatePresence mode="wait">
            {computing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <DiffSkeleton />
              </motion.div>
            ) : diffResult ? (
              <motion.div
                key="results"
                className="space-y-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Summary bar */}
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-bg-subtle)] p-3">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Summary:
                  </span>
                  {changedDimensions.length === 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      No changes detected
                    </Badge>
                  ) : (
                    <>
                      <Badge
                        className="text-xs bg-[var(--color-fill-success)] text-[var(--color-text-success)] border-transparent"
                      >
                        {changedDimensions.filter((d) => d.change === 'added').length} added
                      </Badge>
                      <Badge
                        className="text-xs bg-[var(--color-fill-danger)] text-[var(--color-text-danger)] border-transparent"
                      >
                        {changedDimensions.filter((d) => d.change === 'removed').length} removed
                      </Badge>
                      <Badge
                        className="text-xs bg-[var(--color-fill-warning)] text-[var(--color-text-warning)] border-transparent"
                      >
                        {changedDimensions.filter((d) => d.change === 'changed').length} changed
                      </Badge>
                    </>
                  )}
                </div>

                {/* ── Word Count Chart ── */}
                {chapterChartData.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                      Word Count per Chapter
                    </h3>
                    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={chapterChartData}
                          margin={{ top: 5, right: 10, left: -10, bottom: 40 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border-subtle)"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                            angle={-25}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                            width={50}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend
                            wrapperStyle={{ fontSize: 11 }}
                            iconType="circle"
                            iconSize={8}
                          />
                          <Bar
                            dataKey="A"
                            name={diffResult.snapshotA.label.length > 20
                              ? diffResult.snapshotA.label.slice(0, 18) + '...'
                              : diffResult.snapshotA.label}
                            fill="var(--color-text-tertiary)"
                            radius={[2, 2, 0, 0]}
                            barSize={20}
                          />
                          <Bar
                            dataKey="B"
                            name={diffResult.snapshotB.label.length > 20
                              ? diffResult.snapshotB.label.slice(0, 18) + '...'
                              : diffResult.snapshotB.label}
                            fill="var(--c-brand-600)"
                            radius={[2, 2, 0, 0]}
                            barSize={20}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                )}

                {/* ── Dimensions Table ── */}
                <section>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                    Dimension Comparison
                  </h3>
                  <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--color-bg-muted)] z-10">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
                              Dimension
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
                              {diffResult.snapshotA.label.length > 22
                                ? diffResult.snapshotA.label.slice(0, 20) + '...'
                                : diffResult.snapshotA.label}
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
                              {diffResult.snapshotB.label.length > 22
                                ? diffResult.snapshotB.label.slice(0, 20) + '...'
                                : diffResult.snapshotB.label}
                            </th>
                            <th className="text-center px-3 py-2 font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)] w-12">
                              Δ
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {diffResult.dimensions.map((dim, idx) => (
                            <tr
                              key={dim.label}
                              className={
                                idx % 2 === 0
                                  ? 'bg-[var(--color-bg-base)]'
                                  : 'bg-[var(--color-bg-subtle)]'
                              }
                            >
                              <td className="px-3 py-2 text-[var(--color-text-primary)] font-medium max-w-[140px] truncate">
                                {dim.label}
                              </td>
                              <td className="px-3 py-2 text-[var(--color-text-secondary)] max-w-[180px] truncate">
                                {typeof dim.valueA === 'number'
                                  ? dim.valueA.toLocaleString()
                                  : dim.valueA}
                              </td>
                              <td className="px-3 py-2 text-[var(--color-text-secondary)] max-w-[180px] truncate">
                                {typeof dim.valueB === 'number'
                                  ? dim.valueB.toLocaleString()
                                  : dim.valueB}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <ChangeIndicator change={dim.change} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* ── Chapter Details ── */}
                {chapterDiffs.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                      Chapter Details
                    </h3>
                    <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <Accordion
                          type="multiple"
                          value={expandedChapters}
                          onValueChange={setExpandedChapters}
                        >
                          {chapterDiffs.map((ch) => {
                            const isRemoved = ch.titleA === '(removed)';
                            const isNew = ch.titleB === '(removed)';

                            return (
                              <AccordionItem
                                key={ch.chapterNumber}
                                value={`ch-${ch.chapterNumber}`}
                                className="border-b border-[var(--color-border-subtle)] last:border-b-0"
                              >
                                <AccordionTrigger className="px-3 hover:no-underline hover:bg-[var(--color-bg-subtle)] transition-colors">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="shrink-0 text-[10px] font-mono text-[var(--color-text-tertiary)] w-10">
                                      Ch.{ch.chapterNumber}
                                    </span>
                                    <span className="truncate text-[var(--color-text-primary)] text-xs font-medium">
                                      {isNew
                                        ? '(new chapter)'
                                        : isRemoved
                                          ? '(removed)'
                                          : ch.titleB}
                                    </span>
                                    <span className="shrink-0 ml-auto mr-2">
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 ${
                                          ch.delta > 0
                                            ? 'border-[var(--color-text-success)] text-[var(--color-text-success)]'
                                            : ch.delta < 0
                                              ? 'border-[var(--color-text-danger)] text-[var(--color-text-danger)]'
                                              : ''
                                        }`}
                                      >
                                        {ch.delta > 0
                                          ? `+${ch.delta.toLocaleString()}`
                                          : ch.delta < 0
                                            ? ch.delta.toLocaleString()
                                            : '0'}{' '}
                                        words
                                      </Badge>
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3">
                                  <div className="ml-10 space-y-2 rounded-md bg-[var(--color-bg-subtle)] p-3 text-xs">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <span className="block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)] mb-1">
                                          {diffResult.snapshotA.label.slice(0, 20)}
                                        </span>
                                        {isRemoved ? (
                                          <span className="text-[var(--color-text-tertiary)] italic">
                                            (chapter not present)
                                          </span>
                                        ) : (
                                          <div className="space-y-1">
                                            <p className="text-[var(--color-text-primary)]">
                                              {ch.titleA}
                                            </p>
                                            <p className="text-[var(--color-text-secondary)]">
                                              {ch.wordsA.toLocaleString()} words · {ch.sectionsA}{' '}
                                              sections
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <span className="block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)] mb-1">
                                          {diffResult.snapshotB.label.slice(0, 20)}
                                        </span>
                                        {isNew ? (
                                          <span className="text-[var(--color-text-success)] font-medium">
                                            New chapter
                                          </span>
                                        ) : (
                                          <div className="space-y-1">
                                            <p className="text-[var(--color-text-primary)]">
                                              {ch.titleB}
                                              {ch.titleChanged && (
                                                <span className="ml-2 text-[var(--color-text-warning)]">
                                                  (title changed)
                                                </span>
                                              )}
                                            </p>
                                            <p className="text-[var(--color-text-secondary)]">
                                              {ch.wordsB.toLocaleString()} words · {ch.sectionsB}{' '}
                                              sections
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>
                    </div>
                  </section>
                )}

                {/* ── Reference Changes ── */}
                {referenceChanges.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                      Reference Changes
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Added */}
                      {addedRefs.length > 0 && (
                        <div className="rounded-lg border border-[var(--color-text-success)]/20 bg-[var(--color-fill-success)] overflow-hidden">
                          <div className="px-3 py-2 border-b border-[var(--color-text-success)]/10">
                            <span className="text-xs font-semibold text-[var(--color-text-success)]">
                              + {addedRefs.length} Added
                            </span>
                          </div>
                          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--color-text-success)]/8">
                            {addedRefs.map((ref) => (
                              <div key={ref.id} className="px-3 py-2 text-xs">
                                <p className="font-medium text-[var(--color-text-primary)] truncate">
                                  {ref.title}
                                </p>
                                <p className="text-[var(--color-text-secondary)] truncate">
                                  {ref.authors} ({ref.year})
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Removed */}
                      {removedRefs.length > 0 && (
                        <div className="rounded-lg border border-[var(--color-text-danger)]/20 bg-[var(--color-fill-danger)] overflow-hidden">
                          <div className="px-3 py-2 border-b border-[var(--color-text-danger)]/10">
                            <span className="text-xs font-semibold text-[var(--color-text-danger)]">
                              − {removedRefs.length} Removed
                            </span>
                          </div>
                          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--color-text-danger)]/8">
                            {removedRefs.map((ref) => (
                              <div key={ref.id} className="px-3 py-2 text-xs">
                                <p className="font-medium text-[var(--color-text-primary)] truncate line-through decoration-[var(--color-text-danger)]/40">
                                  {ref.title}
                                </p>
                                <p className="text-[var(--color-text-secondary)] truncate">
                                  {ref.authors} ({ref.year})
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* ── No changes ── */}
                {changedDimensions.length === 0 &&
                  referenceChanges.length === 0 &&
                  chapterDiffs.every((c) => c.delta === 0 && !c.titleChanged) && (
                    <EmptyState message="These two versions are identical. No differences were found." />
                  )}
              </motion.div>
            ) : !computing && !loadingSnapshots && snapshots.length > 0 ? (
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState message="Select two snapshots above and click 'Compare Versions' to see the differences." />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
          {diffResult && (
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {changedDimensions.length} dimension{changedDimensions.length !== 1 ? 's' : ''} changed ·{' '}
              {addedRefs.length + removedRefs.length} reference{addedRefs.length + removedRefs.length !== 1 ? 's' : ''}{' '}
              added/removed
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
