---
Task ID: 1
Agent: Main
Task: ENGINE SUPERCHARGE + SMART IMPORT SYSTEM for ThesisForge v2.0

Work Log:
- Read all existing files that need modification (ast.ts, ast-builder.ts, compilation-simulator.ts, latexAssertions.ts, scheduler.ts, thesis-store.ts, thesis-types.ts, page.tsx, package.json, next.config.ts, intelligence/types.ts, templates.ts)
- Confirmed Mission 1 Upgrades 2, 3, 4 were ALREADY IMPLEMENTED in previous sessions:
  - runPass3Extended() with 10 COMMON_MISTAKES patterns in compilation-simulator.ts
  - A04-A11 assertions in latexAssertions.ts
  - passiveVoiceDetector, transitionAnalyzer, acronymChecker in scheduler.ts + types.ts
- Implemented Mission 1 Upgrade 1: Enhanced AST Builder
  - Added buildChapterBodyNodes() to ast-builder.ts with detection for: ##/### headings, ``` code blocks, $$/\[ display math, - bullet lists, 1. numbered lists
  - Integrated into existing processChapterBody() pipeline
  - Added imports for MathNode, VerbatimNode, ListNode, FigureNode, TableNode and their factory functions
- Created complete Smart Import System (Mission 2):
  - src/core/importer/types.ts — ImportSource, ExtractedMetadata, ExtractedChapter, ExtractedReference, ImportResult, ImportConfidence, FieldMapping
  - src/core/importer/texImporter.ts — LaTeX source parser with \title, \author, \chapter extraction, BibTeX parsing, subsection support
  - src/core/importer/pdfImporter.ts — PDF parsing via pdfjs-dist, metadata/chapter/reference extraction with regex patterns
  - src/core/importer/templateDetector.ts — Heuristic template detection from degree keywords + word count
  - src/core/importer/confidenceScorer.ts — Per-field confidence scoring (0-1), weighted overall
  - src/core/importer/fieldMapper.ts — Map extracted data to ThesisData shape
  - src/core/importer/index.ts — Public API: importFile(file)
  - src/components/thesis/ImportReviewModal.tsx — Review UI with confidence badges, toggle switches, tabs (Metadata/Chapters/References)
  - Added applyImportData action to thesis-store.ts with full template/chapter/reference/metadata support
  - Added import trigger to page.tsx (hidden file input, ImportReviewModal, event listener for apply)
  - Added import button to Homepage component with file input
  - Installed pdfjs-dist@5.6.205

Stage Summary:
- Mission 1 complete: AST Builder upgraded with 6 new structure detections
- Mission 2 complete: Full import system for .pdf and .tex files
- ESLint passes with 0 errors
- All 8 importer files created + 1 UI component + 2 store/page integrations
