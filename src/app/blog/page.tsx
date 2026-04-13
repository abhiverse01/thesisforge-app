import type { Metadata } from "next";
import Link from "next/link";

const BASE_URL = "https://thesisforge-web.vercel.app";

export const metadata: Metadata = {
  title: "Blog — ThesisForge Tips, Guides & LaTeX Advice",
  description:
    "Practical guides on writing your thesis in LaTeX, citation style tutorials, template tips, and academic writing advice. Stay updated with ThesisForge.",
  alternates: {
    canonical: `${BASE_URL}/blog`,
  },
  openGraph: {
    title: "Blog — ThesisForge Tips, Guides & LaTeX Advice",
    description:
      "Practical guides on writing your thesis in LaTeX, citation style tutorials, template tips, and academic writing advice.",
    url: `${BASE_URL}/blog`,
    type: "website",
    siteName: "ThesisForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — ThesisForge",
    description:
      "Practical guides on writing your thesis in LaTeX, citation style tutorials, template tips, and academic writing advice.",
  },
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl backdrop-saturate-[1.8]">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground font-medium">Blog</li>
          </ol>
          <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Generate Thesis
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <h1 className="page-title mb-4">ThesisForge Blog</h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
            Practical guides on writing your thesis in LaTeX, citation style tutorials, template
            tips, and academic writing advice. Stay updated with the latest from ThesisForge.
          </p>

          {/* Coming Soon */}
          <div className="rounded-2xl border border-dashed bg-muted/30 p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h2 className="section-title mb-3">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              We are working on in-depth articles about LaTeX thesis writing, citation styles,
              academic writing tips, and ThesisForge tutorials. Check back soon.
            </p>

            {/* Preview Topics */}
            <div className="max-w-lg mx-auto text-left space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upcoming Topics
              </p>
              <div className="space-y-2">
                {[
                  "How to Write a Bachelor Thesis in LaTeX — A Complete Guide",
                  "APA vs IEEE vs Chicago: Which Citation Style Should You Use?",
                  "10 Common LaTeX Errors (And How ThesisForge Avoids Them)",
                  "PhD Dissertation Structure: A Chapter-by-Chapter Guide",
                  "How to Export Your ThesisForge Project to Overleaf",
                ].map((topic) => (
                  <div
                    key={topic}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card border"
                  >
                    <svg
                      className="w-4 h-4 text-muted-foreground shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm text-muted-foreground">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Internal Links */}
          <section aria-labelledby="explore-heading" className="mt-14">
            <h2 id="explore-heading" className="section-title mb-6">
              Explore ThesisForge Resources
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/templates/bachelors"
                className="block p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <h3 className="text-sm font-semibold mb-1">Thesis Templates</h3>
                <p className="text-xs text-muted-foreground">
                  Bachelor, Master, PhD, and Research Report templates — free and ready to use.
                </p>
              </Link>
              <Link
                href="/citation-styles/apa"
                className="block p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <h3 className="text-sm font-semibold mb-1">Citation Style Guides</h3>
                <p className="text-xs text-muted-foreground">
                  APA, IEEE, Chicago, Harvard, and Vancouver citation styles explained with examples.
                </p>
              </Link>
              <Link
                href="/vs/overleaf"
                className="block p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <h3 className="text-sm font-semibold mb-1">Tool Comparisons</h3>
                <p className="text-xs text-muted-foreground">
                  Honest comparisons: ThesisForge vs Overleaf, Word, and LaTeX Templates.
                </p>
              </Link>
            </div>
          </section>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ThesisForge. Free forever.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
