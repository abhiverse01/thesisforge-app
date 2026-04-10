'use client';

// ============================================================
// ThesisForge Intelligence Panel — Unified Sidebar
// All 8 algorithms feed into this single sidebar panel.
// Shows completeness ring, active issues, word stats,
// structure balance, keywords, and reading time.
// ============================================================

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  Sparkles,
  BookOpen,
  BarChart3,
  Target,
  Type,
  Quote,
  Clock,
  CircleDot,
  Eye,
} from 'lucide-react';
import type {
  IntelligenceResults,
  CompletenessResult,
  HeuristicFinding,
} from '@/intelligence';
import {
  intelligenceScheduler,
  ALGORITHM_SCHEDULE,
} from '@/intelligence/scheduler';
import { countWords } from '@/intelligence/structureAnalyzer';

// ============================================================
// Props
// ============================================================

interface IntelligencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
}

// ============================================================
// Completeness Ring — Circular progress indicator
// ============================================================

function CompletenessRing({ result }: { result: CompletenessResult | null }) {
  if (!result) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted-foreground/20" />
            <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="none"
              className="text-muted-foreground/40" strokeDasharray="0 220" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-muted-foreground">--</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">Select a template to start</span>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 35;
  const progress = (result.score / 100) * circumference;

  const colorClass =
    result.score >= 90
      ? 'text-purple-500'
      : result.score >= 70
        ? 'text-green-500'
        : result.score >= 40
          ? 'text-amber-500'
          : 'text-red-500';

  const levelLabel =
    result.level === 'ready'
      ? 'Export ready'
      : result.level === 'almost'
        ? 'Almost there'
        : result.level === 'in-progress'
          ? 'In progress'
          : 'Getting started';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted-foreground/20" />
          <motion.circle
            cx="40" cy="40" r="35"
            stroke="currentColor" strokeWidth="6" fill="none"
            className={colorClass}
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            initial={false}
            animate={{ strokeDasharray: [`${progress} ${circumference}`] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${colorClass}`}>{result.score}</span>
        </div>
      </div>
      <span className={`text-xs font-medium ${colorClass}`}>{levelLabel}</span>
    </div>
  );
}

// ============================================================
// Issue Card — Single issue display
// ============================================================

function IssueCard({
  severity,
  message,
  action,
  onAction,
}: {
  severity: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  const severityConfig = {
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    suggestion: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    info: { icon: Info, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
  };

  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg ${config.bg} border ${config.border}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground/80 leading-relaxed">{message}</p>
        {action && onAction && (
          <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 p-0 hover:underline" onClick={onAction}>
            {action}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Collapsible Section
// ============================================================

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 text-left">{title}</span>
        {badge !== undefined && badge > 0 && (
          <Badge variant={badge > 0 ? 'destructive' : 'secondary'} className="text-xs px-1.5 py-0">
            {badge}
          </Badge>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Word Stats Section
// ============================================================

function WordStatsSection({ results }: { results: IntelligenceResults }) {
  if (!results.readingStats) return null;

  const { readingStats } = results;
  const { total } = readingStats;

  return (
    <div className="space-y-2">
      {/* Total stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-foreground">{total.words.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total words</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-foreground">~{total.readingTime} min</div>
          <div className="text-xs text-muted-foreground">Reading time</div>
        </div>
      </div>

      {/* Abstract status */}
      {total.abstractWords > 0 && (
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Abstract</span>
            <span className={`text-xs font-medium ${
              total.abstractStatus === 'good' ? 'text-green-500' : 'text-amber-500'
            }`}>
              {total.abstractWords} words
              {total.abstractStatus !== 'good' && (
                total.abstractWords < 100 ? ' (too short)' : ' (too long)'
              )}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                total.abstractStatus === 'good' ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (total.abstractWords / 300) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Per-chapter word counts */}
      <div className="space-y-1.5">
        {readingStats.chapters.map((ch) => (
          <div key={ch.chapterId} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[60%]" title={ch.chapterTitle}>
              {ch.chapterTitle}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{ch.words.toLocaleString()}</span>
              <span className="text-muted-foreground/60">~{ch.readingTime}m</span>
            </div>
          </div>
        ))}
      </div>

      {/* Long sentence warning */}
      {readingStats.longSentenceChapters.length > 0 && (
        <div className="flex items-start gap-1.5 text-xs text-amber-500">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Consider shorter sentences in: {readingStats.longSentenceChapters.join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Structure Balance Section
// ============================================================

function StructureBalanceSection({ results }: { results: IntelligenceResults }) {
  if (!results.structure) return null;

  const { structure } = results;

  return (
    <div className="space-y-3">
      {/* Balance score gauge */}
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`text-2xl font-bold ${
                (structure.balanceScore ?? 0) >= 80 ? 'text-green-500'
                  : (structure.balanceScore ?? 0) >= 60 ? 'text-amber-500'
                    : 'text-red-500'
              }`}>
                {structure.balanceScore ?? '--'}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px]">
                Balance score 0-100. Measures how evenly your word count is distributed
                across chapters compared to academic norms.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Structural balance</div>
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <motion.div
              className={`h-2 rounded-full transition-all duration-500 ${
                (structure.balanceScore ?? 0) >= 80 ? 'bg-green-500'
                  : (structure.balanceScore ?? 0) >= 60 ? 'bg-amber-500'
                    : 'text-red-500 bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${structure.balanceScore ?? 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Word count bars per chapter */}
      <div className="space-y-1.5">
        {structure.wordCounts.map((ch) => {
          const issue = structure.issues.find((i) => i.chapterId === ch.id);
          const pct = structure.totalWords > 0 ? (ch.words / structure.totalWords) * 100 : 0;
          const barColor = issue
            ? issue.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
            : 'bg-green-500';

          return (
            <div key={ch.id}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-muted-foreground truncate max-w-[60%]">{ch.title}</span>
                <span className="text-muted-foreground">{Math.round(pct)}% ({ch.words})</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full ${barColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pct * 4)}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Issues */}
      {structure.issues.length > 0 && (
        <div className="space-y-1.5">
          {structure.issues.slice(0, 3).map((issue, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-xs">
              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                issue.severity === 'high' ? 'text-red-500' : 'text-amber-500'
              }`} />
              <span className="text-muted-foreground">
                <strong>{issue.chapterTitle}</strong> is {issue.direction}represented
                ({issue.actualPct}% vs {issue.idealPct}% ideal)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Keywords Section
// ============================================================

function KeywordsSection({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs font-normal">
          {kw}
        </Badge>
      ))}
    </div>
  );
}

// ============================================================
// Heuristics Section
// ============================================================

function HeuristicsSection({ results }: { results: IntelligenceResults }) {
  if (results.heuristics.size === 0) return null;

  // Collect all findings, capped at 5 for display
  const allFindings: Array<{ chapterId: string; finding: HeuristicFinding }> = [];
  for (const [chapterId, findings] of results.heuristics) {
    for (const finding of findings) {
      allFindings.push({ chapterId, finding });
    }
  }

  // Sort by severity and cap at 5
  const severityOrder: Record<string, number> = { error: 0, warning: 1, suggestion: 2, info: 3 };
  allFindings.sort((a, b) =>
    (severityOrder[a.finding.severity] ?? 99) - (severityOrder[b.finding.severity] ?? 99)
  );
  const displayFindings = allFindings.slice(0, 5);
  const remaining = allFindings.length - 5;

  return (
    <div className="space-y-1.5">
      {displayFindings.map((item, idx) => (
        <IssueCard
          key={idx}
          severity={item.finding.severity}
          message={item.finding.message}
          action={item.finding.fix ? 'Fix' : undefined}
        />
      ))}
      {remaining > 0 && (
        <div className="text-xs text-muted-foreground text-center py-1">
          + {remaining} more suggestion{remaining > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Citation Graph Section
// ============================================================

function CitationGraphSection({ results }: { results: IntelligenceResults }) {
  if (!results.citationGraph) return null;

  const { citationGraph } = results;

  return (
    <div className="space-y-2">
      {/* Citation ratio */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Citation coverage</span>
        <span className={`text-sm font-medium ${
          citationGraph.citationRatio >= 80 ? 'text-green-500'
            : citationGraph.citationRatio >= 50 ? 'text-amber-500'
              : 'text-red-500'
        }`}>
          {citationGraph.citationRatio}%
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {citationGraph.totalCitations} of {citationGraph.totalReferences} references cited
      </div>

      {/* Undefined citations (errors) */}
      {citationGraph.undefinedCitations.length > 0 && (
        <div className="space-y-1">
          {citationGraph.undefinedCitations.slice(0, 3).map((key, idx) => (
            <IssueCard
              key={idx}
              severity="error"
              message={`Your chapter uses \\cite{${key}} but this reference doesn't exist in your bibliography.`}
            />
          ))}
        </div>
      )}

      {/* Uncited references (warnings) */}
      {citationGraph.uncitedReferences.length > 0 && (
        <IssueCard
          severity="warning"
          message={`You have ${citationGraph.uncitedReferences.length} reference${citationGraph.uncitedReferences.length > 1 ? 's' : ''} that ${citationGraph.uncitedReferences.length > 1 ? 'aren\'t' : 'isn\'t'} cited anywhere.`}
        />
      )}
    </div>
  );
}

// ============================================================
// Completeness Checklist
// ============================================================

function CompletenessChecklist({ result }: { result: CompletenessResult | null }) {
  if (!result) return null;

  const incompleteItems = result.breakdown.filter((item) => !item.achieved);
  const nextAction = incompleteItems.sort((a, b) => b.weight - a.weight)[0];

  return (
    <div className="space-y-2">
      {/* Next recommended action */}
      {nextAction && (
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <div className="text-xs font-medium text-blue-500">Next recommended</div>
            <div className="text-xs text-muted-foreground">{nextAction.label}</div>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-1">
        {result.breakdown.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            {item.achieved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <CircleDot className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span className={item.achieved ? 'text-muted-foreground' : 'text-foreground/70'}>
              {item.label}
            </span>
            <span className="ml-auto text-muted-foreground/50">{item.weight}pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main Intelligence Panel Component
// ============================================================

export default function IntelligencePanel({ isOpen, onClose, currentStep }: IntelligencePanelProps) {
  const [results, setResults] = useState<IntelligenceResults>({
    completeness: null,
    readingStats: null,
    structure: null,
    keywords: [],
    citationGraph: null,
    duplicates: [],
    heuristics: new Map(),
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize scheduler
  useEffect(() => {
    intelligenceScheduler.init(setResults);
    return () => intelligenceScheduler.dispose();
  }, []);

  // Compute active issues for the current step
  const activeIssues = useMemo(() => {
    const issues: Array<{
      severity: string;
      message: string;
      action?: string;
      weight: number;
    }> = [];

    // Undefined citations → error
    if (results.citationGraph?.undefinedCitations.length) {
      results.citationGraph.undefinedCitations.forEach((key) => {
        issues.push({
          severity: 'error',
          message: `Undefined citation: \\cite{${key}}`,
          weight: 100,
        });
      });
    }

    // Duplicates → warning
    if (results.duplicates.length > 0) {
      results.duplicates.forEach((dup) => {
        issues.push({
          severity: 'warning',
          message: `Possible duplicate: ${dup.reason} (${Math.round(dup.score * 100)}% match)`,
          weight: 80,
        });
      });
    }

    // Uncited references → warning
    if (results.citationGraph?.uncitedReferences.length) {
      issues.push({
        severity: 'warning',
        message: `${results.citationGraph.uncitedReferences.length} uncited reference(s)`,
        weight: 70,
      });
    }

    // Structure issues → suggestion
    if (results.structure?.issues.filter((i) => i.severity === 'high').length) {
      issues.push({
        severity: 'suggestion',
        message: `${results.structure.issues.filter((i) => i.severity === 'high').length} chapter(s) significantly ${results.structure.issues[0]?.direction === 'over' ? 'over' : 'under'}represented`,
        weight: 50,
      });
    }

    // Long sentence chapters → suggestion
    if (results.readingStats?.longSentenceChapters.length) {
      issues.push({
        severity: 'suggestion',
        message: `Consider shorter sentences in: ${results.readingStats.longSentenceChapters.join(', ')}`,
        weight: 40,
      });
    }

    // Sort by weight (severity) and cap at 5
    return issues.sort((a, b) => b.weight - a.weight).slice(0, 5);
  }, [results]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-80 bg-background/95 backdrop-blur-sm border-l border-border shadow-2xl z-50 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-semibold">Intelligence</h2>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-3 space-y-3">
            {/* Completeness Ring */}
            <div className="flex justify-center py-2">
              <CompletenessRing result={results.completeness} />
            </div>

            {/* Active Issues */}
            {activeIssues.length > 0 && (
              <CollapsibleSection
                title="Active Issues"
                icon={AlertCircle}
                defaultOpen={true}
                badge={activeIssues.filter((i) => i.severity === 'error').length || undefined}
              >
                <div className="space-y-1.5">
                  {activeIssues.map((issue, idx) => (
                    <IssueCard
                      key={idx}
                      severity={issue.severity}
                      message={issue.message}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Completeness Checklist */}
            <CollapsibleSection title="Completeness" icon={Target}>
              <CompletenessChecklist result={results.completeness} />
            </CollapsibleSection>

            {/* Word Stats */}
            {results.readingStats && (
              <CollapsibleSection
                title="Word Stats"
                icon={BookOpen}
                badge={results.readingStats.total.words || undefined}
              >
                <WordStatsSection results={results} />
              </CollapsibleSection>
            )}

            {/* Structure Balance */}
            {results.structure && results.structure.totalWords >= 100 && (
              <CollapsibleSection title="Structure Balance" icon={BarChart3}>
                <StructureBalanceSection results={results} />
              </CollapsibleSection>
            )}

            {/* Citation Graph */}
            {results.citationGraph && (results.citationGraph.totalCitations > 0 || results.citationGraph.totalReferences > 0) && (
              <CollapsibleSection
                title="Citation Graph"
                icon={Quote}
                badge={results.citationGraph.undefinedCitations.length || undefined}
              >
                <CitationGraphSection results={results} />
              </CollapsibleSection>
            )}

            {/* LaTeX Heuristics */}
            {results.heuristics.size > 0 && (() => {
              const totalCount = Array.from(results.heuristics.values())
                .reduce((sum, f) => sum + f.length, 0);
              if (totalCount === 0) return null;
              return (
                <CollapsibleSection
                  title="LaTeX Tips"
                  icon={Lightbulb}
                  badge={totalCount}
                >
                  <HeuristicsSection results={results} />
                </CollapsibleSection>
              );
            })()}

            {/* Keywords */}
            {results.keywords.length > 0 && (
              <CollapsibleSection title="Keywords" icon={Type}>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Generated from your chapter content
                  </div>
                  <KeywordsSection keywords={results.keywords} />
                </div>
              </CollapsibleSection>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
