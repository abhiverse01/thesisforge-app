"use client";

import React, { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

/**
 * GODMODE 13: ChunkLoadError recovery boundary. When a new deployment ships,
 * the browser may have cached HTML referencing old chunk hashes. Those chunks
 * no longer exist on the server → 404 → ChunkLoadError → white screen.
 * This component catches that specific error and offers a hard reload.
 */
export function ChunkLoadRecovery({ children }: { children: React.ReactNode }) {
  const [chunkError, setChunkError] = useState(false);

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      // ChunkLoadError from Webpack/Turbopack manifests as:
      // - "Loading chunk" or "Loading CSS chunk" (Webpack)
      // - "Failed to load chunk" (Turbopack)
      if (e.message && /Loading (CSS )?chunk|Failed to load chunk/.test(e.message)) {
        e.preventDefault();
        setChunkError(true);
      }
    };
    // Also catch unhandled promise rejections (dynamic() failures)
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      if (reason instanceof Error && /Loading (CSS )?chunk|Failed to (load chunk|fetch dynamically imported module)/.test(reason.message)) {
        e.preventDefault();
        setChunkError(true);
      }
    };
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  // Auto-reload after 1.5s — users don't understand chunk errors
  useEffect(() => {
    if (chunkError) {
      const timer = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(timer);
    }
  }, [chunkError]);

  if (chunkError) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6 text-primary animate-spin" />
          </div>
          <h2 className="text-lg font-semibold">Updating ThesisForge</h2>
          <p className="text-sm text-muted-foreground">
            Reloading with the latest version now…
          </p>
        </div>
      </div>
    );
  }
  return children;
}
