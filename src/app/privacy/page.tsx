import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE_URL } from '@/lib/config';

export function generateMetadata(): Metadata {
  return {
    title: 'Privacy Policy',
    description:
      'Privacy Policy for ThesisForge — a privacy-first, zero data collection LaTeX thesis generator. Your thesis never leaves your browser.',
    alternates: { canonical: `${SITE_URL}/privacy` },
    openGraph: {
      title: 'Privacy Policy | ThesisForge',
      description:
        'ThesisForge collects zero data. Your thesis never leaves your browser. Full privacy policy details.',
      url: `${SITE_URL}/privacy`,
      type: 'website',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ThesisForge — Free LaTeX Thesis Generator' }],
    },
  };
}

export default function PrivacyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: May 28, 2026</p>

          <section id="overview" className="space-y-4">
            <h2>1. Overview</h2>
            <p>
              ThesisForge is designed with a privacy-first philosophy. We collect zero data. No
              accounts, no tracking, no analytics — just a tool that helps you write your thesis.
              Your data stays entirely on your device.
            </p>
          </section>

          <section id="no-collection" className="space-y-4">
            <h2>2. Information We Do Not Collect</h2>
            <p>ThesisForge does not collect, store, or process any of the following:</p>
            <ul>
              <li>
                <strong>Account information</strong> — No sign-up, registration, or login is
                required.
              </li>
              <li>
                <strong>Email addresses</strong> — We never ask for or receive your email.
              </li>
              <li>
                <strong>Personal information</strong> — No names, demographics, or identifying data
                is collected.
              </li>
              <li>
                <strong>Thesis content</strong> — Your thesis text, references, and metadata are
                never transmitted to any server.
              </li>
              <li>
                <strong>Usage data</strong> — No analytics, no tracking pixels, no behavioral data.
              </li>
              <li>
                <strong>IP addresses</strong> — We do not log or store IP addresses.
              </li>
            </ul>
          </section>

          <section id="local-storage" className="space-y-4">
            <h2>3. Local Storage</h2>
            <p>
              All thesis data — including your document content, chapter structure, references, and
              formatting preferences — is stored exclusively in your browser&apos;s IndexedDB. This
              data:
            </p>
            <ul>
              <li>Remains entirely on your device.</li>
              <li>Is never transmitted to any external server.</li>
              <li>Is only accessible within your browser on the same origin.</li>
              <li>Will be permanently deleted if you clear your browser&apos;s site data.</li>
            </ul>
            <p>
              We have no ability to access, recover, or restore your locally stored thesis data. We
              strongly recommend periodically exporting your thesis as a ZIP file to ensure you have a
              backup.
            </p>
          </section>

          <section id="analytics" className="space-y-4">
            <h2>4. Analytics</h2>
            <p>
              ThesisForge does not use any analytics services. There are no Google Analytics, Plausible,
              Umami, or any other third-party analytics tools integrated into the Service. We have no
              visibility into how many users visit the site, which features they use, or how long they
              spend on the application.
            </p>
          </section>

          <section id="cookies" className="space-y-4">
            <h2>5. Cookies</h2>
            <p>
              ThesisForge does not set any advertising or tracking cookies. The only browser storage
              mechanisms used are:
            </p>
            <ul>
              <li>
                <strong>localStorage</strong> — Used solely to store your theme preference (light or
                dark mode).
              </li>
              <li>
                <strong>IndexedDB</strong> — Used to store your thesis data locally.
              </li>
            </ul>
            <p>
              Neither of these are traditional cookies, and neither is used for tracking or
              advertising purposes. For more details, please see our{' '}
              <Link href="/cookies" className="text-primary hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section id="third-party" className="space-y-4">
            <h2>6. Third-Party Services</h2>
            <p>ThesisForge relies on a minimal number of third-party services:</p>
            <ul>
              <li>
                <strong>Vercel</strong> — Used for hosting and CDN delivery. Vercel may process
                standard server logs (request paths, status codes, timestamps) but does not receive
                any user-submitted content or personal data from ThesisForge.
              </li>
              <li>
                <strong>Google Fonts</strong> — Used to load the Poppins typeface. Google Fonts may
                log standard HTTP request metadata (IP address, user agent) when serving font files.
                This is handled entirely by Google and is outside of our control.
              </li>
            </ul>
          </section>

          <section id="children" className="space-y-4">
            <h2>7. Children&apos;s Privacy</h2>
            <p>
              ThesisForge is not specifically directed at children under the age of 13. However,
              since ThesisForge collects no personal information whatsoever, COPPA (Children&apos;s
              Online Privacy Protection Act) compliance concerns are effectively mitigated — there is
              no personal data to collect, store, or disclose.
            </p>
          </section>

          <section id="your-rights" className="space-y-4">
            <h2>8. Your Rights</h2>
            <p>
              Since ThesisForge does not collect any personal data, there is no data for you to
              access, correct, export, or request deletion of through us. However, you have full
              control over your locally stored data:
            </p>
            <ul>
              <li>
                <strong>Delete thesis data:</strong> Clear your browser&apos;s site data or use the
                &quot;Clear All Data&quot; option within ThesisForge.
              </li>
              <li>
                <strong>Delete theme preference:</strong> Clear localStorage for the ThesisForge
                origin.
              </li>
              <li>
                <strong>Export your thesis:</strong> Use the built-in export feature to download your
                work as a ZIP file at any time.
              </li>
            </ul>
          </section>

          <section id="changes" className="space-y-4">
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be reflected on
              this page with an updated &quot;Last updated&quot; date. We encourage you to review
              this page periodically for any updates.
            </p>
          </section>

          <section id="contact" className="space-y-4">
            <h2>10. Contact</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please
              contact us through our website.
            </p>
          </section>

          <section id="effective-date" className="space-y-4">
            <h2>11. Effective Date</h2>
            <p>This Privacy Policy is effective as of May 28, 2026.</p>
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
