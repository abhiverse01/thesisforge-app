// ============================================================
// ThesisForge — Monaco Loader Configuration
// ============================================================

import { loader } from '@monaco-editor/react';

const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs';

function configureLoader() {
  if (typeof window === 'undefined') return;  // SSR guard

  // FIX(Production): Set worker URL resolver for Next.js/Turbopack.
  // Without this, Monaco workers fail to load in production builds because
  // the bundler doesn't emit worker files at the expected CDN paths.
  // This MUST be set before any dynamic Monaco import.
  (window as any).MonacoEnvironment = {
    getWorkerUrl(_moduleId: string, label: string) {
      // Use CDN workers for all types — these are fetched from jsDelivr
      // and are guaranteed to match the Monaco version we load.
      if (label === 'json' || label === 'editorWorkerService') {
        return `${MONACO_CDN}/base/worker/workerMain.js`;
      }
      return `${MONACO_CDN}/base/worker/workerMain.js`;
    },
  };

  loader.config({
    paths: { vs: MONACO_CDN },
    'vs/nls': { availableLanguages: { '*': 'en' } },
  });

  // GODMODE FIX: Suppress the "[object Event]" AMD loader errors from Monaco CDN.
  // The Monaco AMD loader (loader.js) fires error events when sub-scripts fail
  // to load (e.g., due to ad-blockers, CDN hiccups, or network issues). These
  // show as unhelpful "[object Event]" messages in the console. The actual
  // functional error is caught by MonacoEditorWithTimeout's 20s timeout and
  // renders the MonacoLoadError UI with a retry button.
  // We intercept the AMD loader's global error to prevent it from cluttering
  // the console, since the component-level error handling is already in place.
  // GODMODE FIX: Suppress the "[object Event]" AMD loader errors from Monaco CDN.
  // Strategy: Set AMD config when loader becomes available via polling.
  // The AMD loader (loader.js) is loaded async from CDN. We set catchError:false
  // once it's available, and also hook window.onerror to suppress Monaco CDN
  // script load errors (these are handled by MonacoEditorWithTimeout's 20s timeout).
  const suppressAmdErrors = () => {
    try {
      const amdLoader = (window as any).require;
      if (amdLoader && typeof amdLoader.config === 'function') {
        amdLoader.config({ catchError: false });
        return true;
      }
    } catch {
      // If require.config fails, the AMD loader isn't loaded yet — ignore.
    }
    return false;
  };

  // Try immediately (works if Monaco scripts are pre-cached)
  if (!suppressAmdErrors()) {
    // Poll for the AMD loader (CDN loads asynchronously)
    let pollCount = 0;
    const pollInterval = setInterval(() => {
      if (suppressAmdErrors() || pollCount++ > 50) {
        clearInterval(pollInterval);
      }
    }, 100);
  }

  // Suppress Monaco CDN script errors (these are non-blocking and handled
  // by the component-level 20s timeout). Without this, every CDN hiccup
  // shows an unhelpful "[object Event]" in the console.
  // FIX21: Prevent memory leak on HMR — save original onerror so we can
  // restore it. Previous code blindly overwrote window.onerror on every
  // configureLoader() call (module hot-reload creates handler chains).
  const originalOnError = (window as any).onerror;
  const monacoErrorHandler = function(msg: any, url: string, line: number, col: number, error: any) {
    if (typeof url === 'string' && url.includes('cdn.jsdelivr.net/npm/monaco-editor')) {
      return true; // Suppress Monaco CDN errors
    }
    return originalOnError ? (originalOnError as (...args: any[]) => any).call(window, msg, url, line, col, error) : false;
  };
  (window as any).onerror = monacoErrorHandler;
}

export default function initMonacoLoader() {
  configureLoader();
}
