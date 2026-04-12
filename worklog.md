---
Task ID: 1
Agent: Main Agent (Godmode Intelligence Audit)
Task: Full godmode audit & fix of the ThesisForge intelligence codebase

Work Log:
- Read and analyzed ALL 14 intelligence-related files: types.ts, index.ts, readingStats.ts, scheduler.ts, citationGraph.ts, structureAnalyzer.ts, keywordExtractor.ts, citationParser.ts, deduplicator.ts, latexHeuristics.ts, completenessScorer.ts, engine/intelligence.ts, intelligence-panel.tsx
- Read all dependency files: thesis-types.ts, thesis-store.ts, bib.ts
- Identified 16 bugs across 8 files, categorized by severity (critical/high/medium)
- Applied all fixes in a single coordinated pass

Stage Summary:
- 16 bugs found and fixed across the intelligence codebase
- Zero lint errors after all fixes
- Key fixes:
  1. engine/intelligence.ts: Fixed duplicate `Cref` in cross-ref regex
  2. structureAnalyzer.ts: Upgraded countWords to strip LaTeX commands (was inflating word counts)
  3. readingStats.ts: Fixed isVowelChar missing 'y', removed duplicate 'ted' in passive voice regex
  4. completenessScorer.ts: Added optional chaining on subSections in 4 functions (countConclusionElements, computeSubsectionDepth, computeCitationCoverage, computeKeywordAlignment)
  5. scheduler.ts: Added notifyCallback() on algorithm failure, tracked/cleaned setTimeout IDs in dispose(), reset results on re-init, added disposed guard
  6. citationGraph.ts: Pass `type` in generateCiteKeyFromRef to avoid 'untitled' fallback keys
  7. latexHeuristics.ts: Fixed hash-symbol rule (broken negative lookahead), made autofix nullable in type (removed 6 `null as unknown as` hacks)
  8. intelligence-panel.tsx: Fixed stale closure in sidebarTitle (subscribe to store), improved duplicate messages to show reference titles, filtered "Fix all" to only apply safe autofixes, fixed apostrophe escaping
