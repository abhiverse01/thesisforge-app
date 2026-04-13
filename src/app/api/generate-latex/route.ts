import { NextRequest, NextResponse } from 'next/server';
import { generateLatex, generateBibtexFile } from '@/lib/latex-generator';
import type { ThesisData } from '@/lib/thesis-types';

export async function POST(request: NextRequest) {
  try {
    const body: { thesis: ThesisData; format?: 'tex' | 'bib' } = await request.json();

    if (!body.thesis) {
      return NextResponse.json(
        { error: 'Thesis data is required' },
        { status: 400 }
      );
    }

    const thesis = body.thesis;
    const format = body.format || 'tex';

    if (format === 'bib') {
      const bibtex = generateBibtexFile(thesis);
      return NextResponse.json({ success: true, latex: bibtex, format: 'bib' });
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
