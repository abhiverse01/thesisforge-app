import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE_URL } from '@/lib/config';

export function generateMetadata(): Metadata {
  return {
    title: 'Cookie Policy',
    description:
      'Cookie Policy for ThesisForge — learn about browser storage, third-party cookies, and how to manage your data in our privacy-first LaTeX thesis generator.',
    alternates: { canonical: `${SITE_URL}/cookies` },
    openGraph: {
      title: 'Cookie Policy | ThesisForge',
      description:
        'Cookie Policy for ThesisForge. No advertising or tracking cookies. Learn about browser storage and data management.',
      url: `${SITE_URL}/cookies`,
      type: 'website',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ThesisForge — Free LaTeX Thesis Generator' }],
    },
  };
}

export default function CookiePolicyPage() {
  return (
    <main className="bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to ThesisForge
        </Link>

        <article className="prose prose-sm dark:prose-invert max-w-prose mx-auto">
          <h1>Cookie Policy</h1>
          <p className="text-muted-foreground">Last updated: May 28, 2026</p>

          <section id="do-we-use-cookies" className="space-y-4">
            <h2>1. Do We Use Cookies?</h2>
            <p>
              No. ThesisForge does not set any advertising cookies, tracking cookies, or analytics
              cookies. We do not use cookies to identify you, track your behavior, or serve
              targeted advertisements.
            </p>
            <p>
              The Service uses browser-native storage mechanisms (localStorage and IndexedDB) for
              functional purposes only. These are not traditional cookies and are not shared with
              third parties.
            </p>
          </section>

          <section id="technical-storage" className="space-y-4">
            <h2>2. Technical Storage</h2>
            <p>ThesisForge uses the following browser storage mechanisms:</p>

            <h3>localStorage</h3>
            <p>
              Used to store your UI theme preference (light or dark mode). This is a simple key-value
              store that persists across sessions. The data stored is minimal — a single key with a
              string value such as &quot;light&quot; or &quot;dark&quot;. This is not used for
              tracking or identification.
            </p>

            <h3>IndexedDB</h3>
            <p>
              Used to store your thesis data locally, including document content, chapter structure,
              references, and formatting preferences. IndexedDB is a browser-based database that holds
              significantly more data than traditional cookies and is not transmitted to servers. Your
              thesis data remains entirely on your device.
            </p>
          </section>

          <section id="third-party-cookies" className="space-y-4">
            <h2>3. Third-Party Cookies</h2>
            <p>
              ThesisForge does not intentionally set any third-party cookies. However, our hosting
              infrastructure may set cookies for operational purposes:
            </p>
            <ul>
              <li>
                <strong>Vercel</strong> — Our hosting and CDN provider may set cookies related to
                edge routing, load balancing, or CDN functionality. These are infrastructure cookies
                used to deliver the website reliably and are not used for user tracking or
                advertising.
              </li>
              <li>
                <strong>Google Fonts</strong> — Font loading requests may trigger Google&apos;s
                standard cookie practices. This is outside of our control and is governed by
                Google&apos;s own privacy policies.
              </li>
            </ul>
          </section>

          <section id="managing-storage" className="space-y-4">
            <h2>4. Managing Storage</h2>
            <p>
              Since ThesisForge does not use traditional cookies for tracking, there are no
              opt-in/opt-out cookie banners. However, you can manage or delete your browser storage
              at any time:
            </p>

            <h3>Google Chrome</h3>
            <ul>
              <li>
                Go to{' '}
                <strong>Settings → Privacy and security → Cookies and other site data</strong>.
              </li>
              <li>
                Click <strong>See all site data and permissions</strong> and search for ThesisForge.
              </li>
              <li>
                Click the trash icon to delete all stored data for this site.
              </li>
            </ul>

            <h3>Mozilla Firefox</h3>
            <ul>
              <li>
                Go to{' '}
                <strong>Settings → Privacy &amp; Security → Cookies and Site Data</strong>.
              </li>
              <li>
                Click <strong>Manage Data…</strong> and search for ThesisForge.
              </li>
              <li>
                Select the entry and click <strong>Remove Selected</strong>.
              </li>
            </ul>

            <h3>Apple Safari</h3>
            <ul>
              <li>
                Go to{' '}
                <strong>Safari → Settings → Privacy → Manage Website Data…</strong>.
              </li>
              <li>
                Search for ThesisForge in the list.
              </li>
              <li>
                Click <strong>Remove</strong> to delete all stored data.
              </li>
            </ul>

            <p>
              <strong>Important:</strong> Clearing site data will permanently delete your thesis
              draft. Make sure to export your thesis as a ZIP file before clearing browser data if
              you want to preserve your work.
            </p>
          </section>

          <section id="contact" className="space-y-4">
            <h2>5. Contact</h2>
            <p>
              If you have questions or concerns about this Cookie Policy, please
              contact us through our website.
            </p>
          </section>

          <section id="effective-date" className="space-y-4">
            <h2>6. Effective Date</h2>
            <p>This Cookie Policy is effective as of May 28, 2026.</p>
          </section>
        </article>

        {/* Bottom back link */}
        <div className="max-w-prose mx-auto mt-12 pt-8 border-t">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to ThesisForge
          </Link>
        </div>
      </div>
    </main>
  );
}
