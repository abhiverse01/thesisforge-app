import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// ============================================================
// Blog Post Template — Ready for future content
// ============================================================

const BASE_URL = "https://thesisforge-web.vercel.app";

// Empty array for now — blog posts will be added later
interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  content: string;
  excerpt: string;
}

// Placeholder — will be populated with actual blog posts
const blogPosts: BlogPost[] = [];

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) {
    return {
      title: "Blog Post — ThesisForge",
      description: "Read this article on the ThesisForge blog.",
    };
  }

  return {
    title: `${post.title} | ThesisForge Blog`,
    description: post.description,
    alternates: {
      canonical: `${BASE_URL}/blog/${slug}`,
    },
    openGraph: {
      title: `${post.title} | ThesisForge Blog`,
      description: post.description,
      url: `${BASE_URL}/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      siteName: "ThesisForge",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  // Article JSON-LD — ready for when blog posts are added
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "ThesisForge",
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleLd),
        }}
      />

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
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground font-medium truncate max-w-[200px]">{post.title}</li>
            </ol>
            <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0">
              Generate Thesis
            </Link>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {/* Post Header */}
            <header className="mb-10">
              <time
                dateTime={post.date}
                className="block text-sm text-muted-foreground mb-3"
              >
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h1 className="page-title mb-4">{post.title}</h1>
              <p className="text-lg text-muted-foreground">{post.excerpt}</p>
              <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {post.author.charAt(0)}
                </div>
                <span>{post.author}</span>
              </div>
            </header>

            {/* Post Content */}
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {post.content.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph.trim()}</p>
              ))}
            </div>

            {/* CTA */}
            <section className="mt-14 rounded-2xl bg-primary/5 border border-primary/10 p-8 text-center">
              <h2 className="section-title mb-3">Ready to Write Your Thesis?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                Generate a professional LaTeX thesis in minutes with ThesisForge. Free, no account
                required.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Start Free Thesis Generator
              </Link>
            </section>
          </article>
        </main>

        {/* Footer */}
        <footer className="border-t py-8 mt-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ThesisForge. Free forever.</p>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
