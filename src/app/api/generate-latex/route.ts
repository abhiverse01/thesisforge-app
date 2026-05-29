import { NextRequest, NextResponse } from 'next/server';
import { generateLatex, generateBibtexFile } from '@/lib/latex-generator';
import type { ThesisData } from '@/lib/thesis-types';

// Maximum request body size: 2MB (protects against abuse)
const MAX_BODY_SIZE = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Guard: Reject oversized request bodies before parsing
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 2MB.' },
        { status: 413 }
      );
    }

    // Read and parse the body with a size limit
    const bodyText = await request.text();
    if (bodyText.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 2MB.' },
        { status: 413 }
      );
    }

    let body: { thesis: ThesisData; format?: 'tex' | 'bib' };
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    if (!body.thesis) {
      return NextResponse.json(
        { error: 'Thesis data is required.' },
        { status: 400 }
      );
    }

    const thesis = body.thesis;

    // Ensure thesis type is present — default to 'report' as safe fallback
    if (!thesis.type) {
      thesis.type = 'report';
    }

    // Ensure metadata exists with defaults for required fields
    if (!thesis.metadata) {
      thesis.metadata = {
        title: 'Untitled Thesis',
        subtitle: '',
        author: '',
        authorId: '',
        university: '',
        universityLogo: '',
        faculty: '',
        department: '',
        supervisor: '',
        supervisorTitle: '',
        coSupervisor: '',
        coSupervisorTitle: '',
        submissionDate: '',
        graduationDate: '',
        location: '',
        dedication: '',
        acknowledgment: '',
        orcid: '',
        reportNumber: '',
      };
    }

    // Ensure options exist with sensible defaults
    if (!thesis.options) {
      thesis.options = {
        fontSize: '12pt',
        paperSize: 'a4paper',
        lineSpacing: 'onehalf',
        marginSize: 'normal',
        includeDedication: false,
        includeAcknowledgment: false,
        includeAppendices: false,
        includeListings: false,
        includeGlossary: false,
        citationStyle: 'ieee',
        figureNumbering: 'continuous',
        tableNumbering: 'continuous',
        tocDepth: 3,
      };
    }

    // Ensure arrays exist
    thesis.chapters = thesis.chapters || [];
    thesis.references = thesis.references || [];
    thesis.appendices = thesis.appendices || [];
    thesis.keywords = thesis.keywords || [];
    thesis.abstract = thesis.abstract || '';

    const format = body.format || 'tex';

    if (format === 'bib') {
      const bibtex = generateBibtexFile(thesis);
      return NextResponse.json({ success: true, bibtex, format: 'bib' });
    }

    const latex = generateLatex(thesis);
    return NextResponse.json({ success: true, latex, format: 'tex' });
  } catch (error) {
    console.error('LaTeX generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate LaTeX code. Please check your input.' },
      { status: 500 }
    );
  }
}
