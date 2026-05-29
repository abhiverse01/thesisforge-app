import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

// ============================================================
// GODMODE 14: Branded 404 Page
// Next.js App Router renders this component for unmatched routes.
// Without it, users see Next.js's default "Not Found" page —
// a generic, unbranded experience that breaks the app illusion.
//
// FIX: Previous versions had NO not-found.tsx. Any mistyped URL
// or broken link showed an unstyled white page. This branded version
// provides a clear path back to the app and matches the design language.
// ============================================================

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-pattern">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* 404 icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <FileQuestion className="w-7 h-7 text-muted-foreground" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold google-gradient-text">404</h1>
          <p className="text-lg font-semibold text-foreground tracking-tight">
            Page not found
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Recovery */}
        <Button
          asChild
          className="w-full h-12 gap-2"
        >
          <Link href="/" className="flex items-center justify-center gap-2 w-full h-12">
            <Home className="w-4 h-4" />
            Back to ThesisForge
          </Link>
        </Button>

        {/* Help text */}
        <p className="text-xs text-muted-foreground/50">
          If you think this is a mistake, please{' '}
          <a
            href="mailto:support@thesisforge.dev"
            className="underline underline-offset-2 hover:text-foreground"
          >
            contact support
          </a>.
        </p>
      </div>
    </div>
  );
}
