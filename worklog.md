---
Task ID: 1
Agent: Main Agent
Task: Fix runtime error "setGenerating is not defined" and LaTeX generation pipeline bugs

Work Log:
- Read page.tsx and identified setGenerating was used at lines 522/542 but not destructured from useThesisStore at line 158
- Added setGenerating to the destructuring: `isGenerating, setGenerating, setSaveStatus`
- Ran lint — passed clean
- Used Explore subagent to verify entire LaTeX generation pipeline (6 files, all exports, all transitive imports)
- Found 3 critical bugs in ast-builder.ts:
  - Bug A: text() calls for table placeholders missing escaped=true, causing escapeLatex() to mangle LaTeX commands
  - Bug B: includegraphics args/options swapped (already fixed in previous session)
  - Bug E: E007 assertion false-positive (NOT a real issue — AST uses \bibitem, not \cite)
- Fixed Bug A: Added `, true` to all 8 text() calls in buildTablePlaceholder (lines 780-787)
- Found and fixed TS error in chapter-editor.tsx: SubSectionCard received unexpected chapterId prop
- Ran tsc --noEmit — zero errors in src/
- Ran bun run lint — passed clean

Stage Summary:
- FIXED: Runtime ReferenceError "setGenerating is not defined" (page.tsx line 544)
- FIXED: Mangled LaTeX table placeholders (ast-builder.ts lines 780-787)
- FIXED: TypeScript error in chapter-editor.tsx (chapterId prop)
- VERIFIED: All 6 LaTeX pipeline files exist with correct exports
- VERIFIED: ThesisData interface consistent across pipeline
- VERIFIED: Lint passes clean
- VERIFIED: TypeScript compilation clean (no src/ errors)
