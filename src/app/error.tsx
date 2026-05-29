'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertTriangle } from 'lucide-react';

// ============================================================
// GODMODE 14: Branded Error Boundary
// Next.js App Router catches unhandled errors in route segments
// and renders this component. Without it, users see Next.js's
// default unstyled error page — a jarring experience.
//
// FIX: Previous versions had NO error.tsx, meaning any runtime error
// (failed dynamic import, render crash, unhandled exception) would
// show an unstyled white page with a generic error message.
// This branded version matches the app's design language and provides
// a clear recovery path (retry or go home).
// ============================================================

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for monitoring — silent to user, visible in dev console
    console.error('[ThesisForge ErrorBoundary]', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-pattern">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error.message || 'An unexpected error occurred. This has been logged for investigation.'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Recovery actions */}
        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full h-12 gap-2"
            variant="outline"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            onClick={() => {
              // Clear any potentially corrupted IndexedDB state before navigating
              try {
                sessionStorage.clear();
              } catch { /* sessionStorage unavailable */ }
              window.location.href = '/';
            }}
            variant="ghost"
            className="w-full h-12 text-muted-foreground"
          >
            Go to Homepage
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground/50">
          If this persists, try clearing your browser data for this site and reloading.
        </p>
      </div>
    </div>
  );
}
