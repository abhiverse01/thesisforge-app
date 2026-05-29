// ============================================================
// ThesisForge — Editor Layout
// Full-viewport, no scroll — editor manages its own overflow.
// No wizard chrome.
//
// FIX20: Removed h-screen from height chain. See detailed root cause
// analysis below (preserved for future reference).
// ============================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LaTeX Editor — ThesisForge',
  description: 'Full-featured LaTeX editor with real-time lint and compilation simulation.',
};

/*
 * FIX20 CRITICAL — Root cause of mobile editor "cut to top half":
 *
 * The className was: "h-dvh [height:100dvh] h-screen w-screen flex flex-col"
 *
 * All three height utilities (h-dvh, [height:100dvh], h-screen) generate CSS with
 * identical specificity (0,1,0). In Tailwind v4, the LAST utility in source order wins.
 *
 * - h-dvh    → height: 100dvh  (dynamic viewport — excludes browser address bar)
 * - [height:100dvh] → height: 100dvh (same value, fallback for old browsers)
 * - h-screen  → height: 100vh   (static viewport — INCLUDES browser address bar)
 *
 * h-screen (last in source) won, setting height to 100vh. On mobile, 100vh is
 * ~44-56px TALLER than 100dvh (the actual visible area). The parent's
 * overflow-hidden clips the bottom by this difference, cutting the editor.
 *
 * Fix: Remove h-screen. h-dvh gives correct dynamic viewport height on mobile.
 * [height:100dvh] provides fallback for browsers without dvh unit support.
 */

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh [height:100dvh] w-screen flex flex-col">
      {/* FIXSEVENTEEN: Wrap children in flex-1 min-h-0 container.
           ROOT CAUSE: The editor page renders EditorErrorBoundary → Suspense →
           LatexEditorWrapper → Fragment → div(flex-1). Through this chain of
           non-flex wrappers, flex-1 had no flex-col parent to resolve against.
           On mobile browsers, flex-1 in a non-flex context collapses to content
           height (~0px), cutting the editor to the top half. Adding a flex-1
           wrapper ensures the child div's flex-1 resolves against a properly
           constrained parent. min-h-0 prevents flex items from overflowing
           beyond the viewport-height container. */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
