---
Task ID: 1
Agent: Main Agent
Task: BUG HUNT · FIX · REGRESSION GUARD — ThesisForge surgical bug fix across 6 failure zones

Work Log:
- Read all core source files (fsm.ts, persistence.ts, serializer.ts, export.ts, validators.ts, ast.ts, ast-builder.ts, templates.ts, bib.ts, linter.ts, latex-escape.ts, thesis-types.ts, thesis-store.ts)
- Read all component files (generate-preview.tsx, chapter-editor.tsx, save-indicator.tsx)
- Read main page.tsx

- Created src/core/fsmGuard.ts (Zone 1A — FSM State Validator)
- Fixed cite key generation in ast-builder.ts, bib.ts, latex-generator.ts (Zone 3B)
- Fixed empty chapter body handling in ast-builder.ts (Zone 3C)
- Created src/core/latexAssertions.ts (Zone 3A — LaTeX Contract Assertions)
- Created src/utils/inputSanitizer.ts (Zone 6A — Input Sanitizer)
- Added sanitizeChapterBody to latex-escape.ts (Zone 6B — LaTeX injection)
- Rewrote src/core/persistence.ts (Zones 2A/2B/2C/5A/5B):
  - QuotaExceededError handling + emergency JSON backup
  - Additive-only DB migration (v2→v3)
  - Version stamps + cross-tab conflict detection
  - Defensive draft loader with sanitizeDraft()
  - In-memory fallback for private mode
- Updated thesis-store.ts (Zones 1C/4A/4B):
  - Template switch resets chapters, preserves metadata
  - Stale error clearing on field change
  - Added isGenerating/setGenerating for export spinner
  - Added clearFieldError utility
- Fixed export.ts (Zone 3A — LaTeX assertions before export)
- Fixed generate-preview.tsx (Zone 4B — finally blocks for spinner)
- Fixed chapter-editor.tsx (Zone 6D — debounced word count)
- Created src/tests/guards.ts (Regression Guard System — 35 tests)

Stage Summary:
- 6 Failure Zones addressed with detection/fix/guard triad
- 35 regression guard tests created covering FSM, LaTeX, persistence, and input safety
- All new code annotated with FIX(ZONE-X) comments
- Lint passes (only pre-existing format-editor.tsx conditional hook error remains)
- New files: fsmGuard.ts, latexAssertions.ts, inputSanitizer.ts, tests/guards.ts
- Modified files: latex-escape.ts, ast-builder.ts, bib.ts, latex-generator.ts, persistence.ts, thesis-store.ts, export.ts, generate-preview.tsx, chapter-editor.tsx
