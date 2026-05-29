import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE_URL } from '@/lib/config';

export function generateMetadata(): Metadata {
  return {
    title: 'Acceptable Use Policy',
    description:
      'Acceptable Use Policy for ThesisForge — guidelines for responsible and ethical use of our free LaTeX thesis generator.',
    alternates: { canonical: `${SITE_URL}/acceptable-use` },
    openGraph: {
      title: 'Acceptable Use Policy | ThesisForge',
      description:
        'Guidelines for responsible and ethical use of ThesisForge, the free LaTeX thesis generator.',
      url: `${SITE_URL}/acceptable-use`,
      type: 'website',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ThesisForge — Free LaTeX Thesis Generator' }],
    },
  };
}

export default function AcceptableUsePage() {
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
          <h1>Acceptable Use Policy</h1>
          <p className="text-muted-foreground">Last updated: May 28, 2026</p>

          <section id="purpose" className="space-y-4">
            <h2>1. Purpose</h2>
            <p>
              ThesisForge is intended to assist with legitimate academic writing by providing a
              structured, user-friendly interface for generating LaTeX-formatted thesis documents.
              This Acceptable Use Policy outlines the expected and prohibited uses of the Service to
              promote academic integrity and responsible scholarship.
            </p>
          </section>

          <section id="permitted" className="space-y-4">
            <h2>2. Permitted Uses</h2>
            <p>You may use ThesisForge for the following purposes:</p>
            <ul>
              <li>
                <strong>Personal academic research</strong> — Structuring and formatting your own
                original thesis, dissertation, or research report.
              </li>
              <li>
                <strong>Thesis writing</strong> — Creating, editing, and exporting academic
                documents for submission at your educational institution.
              </li>
              <li>
                <strong>Learning LaTeX</strong> — Using ThesisForge as a learning tool to understand
                LaTeX document structure, syntax, and best practices.
              </li>
              <li>
                <strong>Structuring academic documents</strong> — Organizing chapters, sections,
                references, and formatting for academic manuscripts.
              </li>
              <li>
                <strong>Collaboration</strong> — Sharing exported LaTeX files with advisors,
                co-authors, or collaborators for review.
              </li>
            </ul>
          </section>

          <section id="prohibited" className="space-y-4">
            <h2>3. Prohibited Uses</h2>
            <p>You must not use ThesisForge for any of the following:</p>
            <ul>
              <li>
                <strong>Academic dishonesty</strong> — Submitting documents generated or formatted
                with ThesisForge as original work without proper attribution, or representing
                AI-generated content as your own without disclosure as required by your institution.
              </li>
              <li>
                <strong>Plagiarism</strong> — Using the Service to generate, structure, or format
                content that you do not have the right to use, or that constitutes plagiarism under
                your institution&apos;s policies.
              </li>
              <li>
                <strong>Circumventing plagiarism detection</strong> — Using ThesisForge to
                deliberately evade plagiarism detection software or academic integrity systems.
              </li>
              <li>
                <strong>Fraudulent credentials</strong> — Generating academic documents for the
                purpose of obtaining fraudulent degrees, certifications, or credentials.
              </li>
              <li>
                <strong>Automated abuse</strong> — Using bots, scripts, or automated tools to
                generate large volumes of documents through the Service in a manner that could degrade
                performance for other users.
              </li>
              <li>
                <strong>Unlawful activity</strong> — Using the Service for any purpose that violates
                applicable local, national, or international laws.
              </li>
            </ul>
          </section>

          <section id="academic-integrity" className="space-y-4">
            <h2>4. Academic Integrity</h2>
            <p>
              ThesisForge is a formatting and structuring tool — it does not generate thesis content
              for you. You are entirely responsible for the originality, accuracy, and academic merit
              of the content you input into the Service.
            </p>
            <p>
              We strongly encourage all users to comply with their institution&apos;s academic
              integrity policies. If your institution requires disclosure of tools used in the
              writing process, you should disclose your use of ThesisForge. When in doubt, consult
              your academic advisor or institution&apos;s integrity office.
            </p>
            <p>
              ThesisForge does not monitor, review, or validate the content of documents created by
              its users. We have no mechanism to detect academic dishonesty and bear no
              responsibility for how the output is used.
            </p>
          </section>

          <section id="enforcement" className="space-y-4">
            <h2>5. Enforcement</h2>
            <p>
              ThesisForge is a fully client-side service that does not require user accounts. As
              such, we do not have the ability to monitor individual user activity or enforce usage
              policies at the user level. However:
            </p>
            <ul>
              <li>
                We reserve the right to implement rate limiting or access restrictions to prevent
                automated abuse of the Service.
              </li>
              <li>
                We may block abusive API usage patterns that degrade the Service for legitimate
                users.
              </li>
              <li>
                Reports of systematic misuse may result in IP-level restrictions at our hosting
                provider level.
              </li>
            </ul>
            <p>
              Academic enforcement is the responsibility of your educational institution, not
              ThesisForge. Institutional plagiarism detection tools, honor codes, and academic
              integrity committees are the appropriate mechanisms for addressing misuse.
            </p>
          </section>

          <section id="contact" className="space-y-4">
            <h2>6. Contact</h2>
            <p>
              If you have questions or concerns about this Acceptable Use Policy, please
              contact us through our website.
            </p>
          </section>

          <section id="effective-date" className="space-y-4">
            <h2>7. Effective Date</h2>
            <p>This Acceptable Use Policy is effective as of May 28, 2026.</p>
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
