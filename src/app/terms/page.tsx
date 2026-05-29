import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE_URL } from '@/lib/config';

export function generateMetadata(): Metadata {
  return {
    title: 'Terms of Service',
    description:
      'Terms of Service for ThesisForge — the free, browser-based LaTeX thesis generator. Learn about your rights, data handling, and usage guidelines.',
    alternates: { canonical: `${SITE_URL}/terms` },
    openGraph: {
      title: 'Terms of Service | ThesisForge',
      description:
        'Terms of Service for ThesisForge — the free, browser-based LaTeX thesis generator.',
      url: `${SITE_URL}/terms`,
      type: 'website',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ThesisForge — Free LaTeX Thesis Generator' }],
    },
  };
}

export default function TermsPage() {
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
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: May 28, 2026</p>

          <section id="acceptance" className="space-y-4">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using ThesisForge (&quot;the Service&quot;), you agree to be bound by
              these Terms of Service (&quot;Terms&quot;). If you do not agree with any part of these
              Terms, you must discontinue use of the Service immediately.
            </p>
          </section>

          <section id="description" className="space-y-4">
            <h2>2. Description of Service</h2>
            <p>
              ThesisForge is a free, browser-based LaTeX thesis generator. The Service allows users
              to create, edit, and export academic thesis documents in LaTeX format through a guided
              wizard interface. No account creation or registration is required. All processing
              occurs entirely on the client side within your web browser.
            </p>
          </section>

          <section id="intellectual-property" className="space-y-4">
            <h2>3. Intellectual Property</h2>
            <p>
              You retain full ownership of all content you create using ThesisForge, including but
              not limited to thesis text, research data, bibliographic references, and any other
              original material you input into the Service.
            </p>
            <p>
              ThesisForge does not claim any ownership, license, or rights over the content you
              generate. The LaTeX templates, user interface, and underlying software code remain the
              intellectual property of ThesisForge and its contributors.
            </p>
          </section>

          <section id="data-privacy" className="space-y-4">
            <h2>4. Data &amp; Privacy</h2>
            <p>
              All thesis data is stored exclusively in your browser&apos;s IndexedDB local storage.
              Nothing is transmitted to any external server. Your thesis content, personal
              information, and browsing activity are never collected, transmitted, or stored by our
              servers.
            </p>
            <p>
              For complete details, please refer to our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section id="acceptable-use" className="space-y-4">
            <h2>5. Acceptable Use</h2>
            <p>You agree not to use ThesisForge for any of the following:</p>
            <ul>
              <li>
                Generating, facilitating, or submitting plagiarized academic work or content that
                violates academic integrity policies.
              </li>
              <li>
                Using the Service for any unlawful purpose or in violation of any applicable laws
                or regulations.
              </li>
              <li>
                Attempting to reverse-engineer, decompile, or disassemble any part of the Service.
              </li>
              <li>
                Introducing malicious code, viruses, or harmful content through the Service.
              </li>
            </ul>
            <p>
              You are solely responsible for ensuring that your use of ThesisForge complies with
              your institution&apos;s academic integrity policies. For more details, see our{' '}
              <Link href="/acceptable-use" className="text-primary hover:underline">
                Acceptable Use Policy
              </Link>
              .
            </p>
          </section>

          <section id="disclaimer" className="space-y-4">
            <h2>6. Disclaimer of Warranties</h2>
            <p>
              ThesisForge is provided on an &quot;as is&quot; and &quot;as available&quot; basis
              without any warranties of any kind, either express or implied. We do not guarantee
              that:
            </p>
            <ul>
              <li>
                The generated LaTeX code will compile without errors in all LaTeX distributions or
                environments.
              </li>
              <li>The Service will be available at all times without interruption.</li>
              <li>
                The templates and formatting will meet the specific requirements of your
                institution.
              </li>
              <li>The Service will be free from bugs or errors.</li>
            </ul>
          </section>

          <section id="limitation" className="space-y-4">
            <h2>7. Limitation of Liability</h2>
            <p>
              In no event shall ThesisForge, its contributors, or its developers be liable for any
              indirect, incidental, special, consequential, or punitive damages arising out of or in
              connection with your use of the Service, including but not limited to:
            </p>
            <ul>
              <li>Failure to meet academic submission deadlines.</li>
              <li>LaTeX compilation errors or formatting issues in generated documents.</li>
              <li>
                Loss of thesis data resulting from clearing your browser storage, cache, or cookies.
              </li>
              <li>Any academic or professional consequences arising from the use of the Service.</li>
            </ul>
          </section>

          <section id="open-source" className="space-y-4">
            <h2>8. Open Source</h2>
            <p>
              The ThesisForge source code is released under the{' '}
              <Link
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                MIT License
              </Link>
              . You are free to view, modify, and self-host the software under the terms of this
              license. The full source code is available on GitHub.
            </p>
          </section>

          <section id="changes" className="space-y-4">
            <h2>9. Changes to Terms</h2>
            <p>
              We reserve the right to update or modify these Terms of Service at any time. Changes
              will be posted on this page with an updated &quot;Last updated&quot; date. Your
              continued use of ThesisForge after any changes constitutes acceptance of the revised
              Terms.
            </p>
          </section>

          <section id="contact" className="space-y-4">
            <h2>10. Contact</h2>
            <p>
              If you have questions or concerns about these Terms of Service, please
              contact us through our website.
            </p>
          </section>

          <section id="effective-date" className="space-y-4">
            <h2>11. Effective Date</h2>
            <p>These Terms of Service are effective as of May 28, 2026.</p>
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
