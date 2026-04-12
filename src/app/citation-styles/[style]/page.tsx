import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// ============================================================
// Citation Style Data — SEO & Content Definitions
// ============================================================

interface CitationStyleData {
  style: string;
  seoTitle: string;
  description: string;
  keyword: string;
  edition: string;
  disciplines: string[];
  format: string;
  formatDescription: string;
  pageContent: string;
  bibtexExample: string;
  renderedExample: string;
  faqs: { question: string; answer: string }[];
}

const BASE_URL = "https://thesisforge-web.vercel.app";

const citationStyles: Record<string, CitationStyleData> = {
  apa: {
    style: "apa",
    seoTitle: "APA Citation Style for LaTeX Thesis",
    description:
      "Use APA 7th edition citation style in your LaTeX thesis. Free automatic APA formatting with BibTeX. Works with Overleaf. No LaTeX knowledge required.",
    keyword: "APA latex thesis template",
    edition: "7th Edition",
    disciplines: ["Social Sciences", "Psychology", "Education", "Nursing", "Business"],
    format: "Author-Date (Parenthetical)",
    formatDescription:
      "APA uses an author-date citation system where in-text citations include the author's last name and the year of publication, enclosed in parentheses. The full reference appears in an alphabetised reference list at the end of the document.",
    pageContent: `APA (American Psychological Association) citation style is one of the most widely used referencing systems in academic writing, particularly in the social sciences, psychology, education, and nursing. The current version, APA 7th Edition, was published in 2019 and introduced several important changes including simplified in-text citations for works with three or more authors, a standardised DOI format, and updated guidelines for citing online sources.

The APA citation format follows an author-date system. When you reference a source in the body of your text, you include the author's surname and the year of publication in parentheses, for example (Smith, 2023). For direct quotations, you also include the page number: (Smith, 2023, p. 42). When a work has one or two authors, you list all names in every citation. For three or more authors, you use only the first author's name followed by "et al." from the very first citation.

The reference list at the end of your document provides complete bibliographic information for every source cited in your text. Each reference entry follows a specific format that varies by source type — journal articles, books, book chapters, websites, and conference proceedings each have their own formatting rules. The reference list is alphabetised by the first author's surname and uses a hanging indent for each entry.

Using APA citation style in LaTeX traditionally requires configuring the biblatex package with the appropriate style option and ensuring that your BibTeX entries follow the correct field conventions. ThesisForge handles all of this complexity automatically. When you select APA as your citation style in the formatting step, ThesisForge generates the correct LaTeX configuration and ensures that all your references are formatted according to APA 7th Edition guidelines.

ThesisForge supports all common source types for APA citations: journal articles with volume and issue numbers, books with publisher information, book chapters, online sources with URLs and access dates, conference proceedings, theses, and technical reports. The reference editor provides dedicated fields for each source type, so you can enter your citation data without worrying about which BibTeX fields are required.

Whether you are writing a psychology research paper, an education thesis, or a nursing dissertation, ThesisForge's APA citation support ensures that your references are correctly formatted and your in-text citations match the APA 7th Edition standard. Export your thesis to Overleaf, compile it, and your bibliography will be generated automatically with perfect APA formatting.`,
    bibtexExample: `@article{smith2023cognitive,
  author  = {Smith, John A. and Doe, Jane B.},
  title   = {Cognitive Load Theory in 
             Online Learning Environments},
  journal = {Journal of Educational Psychology},
  year    = {2023},
  volume  = {115},
  number  = {2},
  pages   = {345--362},
  doi     = {10.1037/edu0000678}
}

@book{johnson2022research,
  author    = {Johnson, Robert K.},
  title     = {Research Methods in the 
               Social Sciences},
  publisher = {Oxford University Press},
  year      = {2022},
  address   = {Oxford},
  edition   = {5th}
}

@online{worldhealthorg2023,
  author  = {{World Health Organization}},
  title   = {Mental Health and Work},
  year    = {2023},
  url     = {https://www.who.int/teams/
            mental-health-and-substance-use},
  urldate = {2023-11-15}
}`,
    renderedExample: `Smith, J. A., & Doe, J. B. (2023). Cognitive load theory in online learning environments. Journal of Educational Psychology, 115(2), 345–362. https://doi.org/10.1037/edu0000678

Johnson, R. K. (2022). Research methods in the social sciences (5th ed.). Oxford University Press.

World Health Organization. (2023). Mental health and work. https://www.who.int/teams/mental-health-and-substance-use`,
    faqs: [
      {
        question: "What is APA 7th edition citation style?",
        answer:
          "APA 7th edition is the latest version of the citation format published by the American Psychological Association. It uses an author-date system for in-text citations and provides specific formatting rules for the reference list. It is the standard citation style for social sciences, psychology, and education.",
      },
      {
        question: "How does ThesisForge format APA citations?",
        answer:
          "ThesisForge uses the biblatex package with the APA style backend. When you enter your references in the wizard, ThesisForge generates the correct BibTeX entries and configures the LaTeX document to produce APA 7th Edition formatted citations and bibliography automatically.",
      },
      {
        question: "Can I use APA style with Overleaf?",
        answer:
          "Yes. ThesisForge exports a ZIP file containing your main.tex and references.bib that is fully compatible with Overleaf. Simply upload the ZIP to Overleaf and compile — your APA citations and bibliography will be generated automatically.",
      },
      {
        question: "What is the difference between APA 6th and APA 7th edition?",
        answer:
          "APA 7th edition simplifies in-text citations for works with three or more authors (always use 'et al.' from the first citation), standardises DOI formatting as a URL, removes the publisher location requirement for books, and introduces new guidelines for citing online sources. ThesisForge uses APA 7th edition by default.",
      },
      {
        question: "Does ThesisForge handle APA in-text citations?",
        answer:
          "Yes. When you add references in ThesisForge, you can cite them in your thesis text using the cite key. ThesisForge generates the correct \\cite{} commands, and LaTeX handles the in-text formatting automatically according to APA 7th Edition rules.",
      },
    ],
  },

  ieee: {
    style: "ieee",
    seoTitle: "IEEE Citation Style for LaTeX Thesis",
    description:
      "Use IEEE citation style in your LaTeX thesis. Free automatic IEEE numeric formatting with BibTeX. Works with Overleaf. No LaTeX knowledge required.",
    keyword: "IEEE latex thesis template",
    edition: "Latest",
    disciplines: ["Engineering", "Computer Science", "Electronics", "Telecommunications", "Information Technology"],
    format: "Numeric [1]",
    formatDescription:
      "IEEE uses a numeric citation system where sources are numbered in the order they first appear in the text. In-text citations use square brackets containing the reference number, such as [1]. Multiple citations are separated by commas, and ranges use en-dashes, e.g., [1]–[5].",
    pageContent: `IEEE citation style is the standard referencing format used in engineering, computer science, electronics, and telecommunications disciplines. Published and maintained by the Institute of Electrical and Electronics Engineers, this citation format uses a numeric system that assigns each source a unique number based on the order of its first appearance in the text.

The numeric citation system is particularly well-suited for technical writing because it keeps the body text clean and uncluttered. Instead of interrupting the flow with long author-date citations, you simply reference a number in square brackets — [1], [2], [3] — and the reader can look up the full citation in the numbered reference list at the end of the document. When citing multiple sources at once, you can combine them: [1], [3], [5] or use ranges like [1]–[5].

Each reference in the bibliography follows a specific format that varies by source type. For journal articles, the format includes the author names (initials first), article title in quotation marks, journal name in italics, volume, issue, pages, and year. For conference papers, the format includes the conference name, proceedings title, pages, and date. Books include publisher and location information.

IEEE citation style is deeply integrated with LaTeX. In fact, the IEEEtran document class and bibliography style were specifically designed for IEEE publications. Using the IEEE style in LaTeX with BibTeX produces perfectly formatted references that comply with IEEE editorial standards. However, configuring this setup manually — including the correct use of the IEEEtran.bst file and proper BibTeX entry formatting — can be challenging for LaTeX beginners.

ThesisForge eliminates this complexity. When you select IEEE as your citation style, the generated LaTeX code includes the correct bibliography configuration, and all BibTeX entries are formatted to produce IEEE-compliant references. Whether you are citing journal articles, conference papers, technical reports, or online sources, ThesisForge handles the formatting details automatically.

For computer science theses, engineering dissertations, and technical research reports, IEEE citation style provides a clean, professional referencing system that is widely recognised and expected in technical publications. ThesisForge ensures your IEEE citations are correct without requiring you to learn the intricacies of the IEEE editorial manual.`,
    bibtexExample: `@article{chen2023neural,
  author  = {Y. Chen and M. Zhang and 
             L. Wang},
  title   = {Neural Network Approaches for 
             Signal Processing},
  journal = {IEEE Trans. Signal Process.},
  year    = {2023},
  volume  = {71},
  pages   = {1234--1248},
  doi     = {10.1109/TSP.2023.3284567}
}

@inproceedings{kumar2022distributed,
  author    = {A. Kumar and S. Patel},
  title     = {Distributed Computing in 
               Edge Networks},
  booktitle = {Proc. IEEE Int. Conf. Cloud 
               Computing (CLOUD)},
  year      = {2022},
  pages     = {456--463},
  doi       = {10.1109/CLOUD54543.2022.00062}
}

@book{haykin2019neural,
  author    = {S. Haykin},
  title     = {Neural Networks and Learning 
               Machines},
  publisher = {Pearson},
  year      = {2019},
  edition   = {4th}
}`,
    renderedExample: `[1] Y. Chen, M. Zhang, and L. Wang, "Neural network approaches for signal processing," IEEE Trans. Signal Process., vol. 71, pp. 1234–1248, 2023, doi: 10.1109/TSP.2023.3284567.

[2] A. Kumar and S. Patel, "Distributed computing in edge networks," in Proc. IEEE Int. Conf. Cloud Computing (CLOUD), 2022, pp. 456–463, doi: 10.1109/CLOUD54543.2022.00062.

[3] S. Haykin, Neural Networks and Learning Machines, 4th ed. Pearson, 2019.`,
    faqs: [
      {
        question: "What is IEEE citation style?",
        answer:
          "IEEE citation style is a numeric referencing system used in engineering and computer science. Sources are numbered sequentially in the order they first appear, and in-text citations use square brackets with the reference number, e.g., [1].",
      },
      {
        question: "How does IEEE citation differ from APA?",
        answer:
          "IEEE uses numeric citations in square brackets [1] while APA uses author-date citations (Smith, 2023). IEEE references list authors with initials first, while APA lists surnames first. IEEE is standard in engineering; APA is standard in social sciences.",
      },
      {
        question: "Can ThesisForge generate IEEE-compliant BibTeX?",
        answer:
          "Yes. When you select IEEE citation style in ThesisForge, all generated BibTeX entries and the LaTeX document configuration use the IEEEtran bibliography style, producing fully IEEE-compliant references.",
      },
      {
        question: "Does IEEE style require a specific document class?",
        answer:
          "While the IEEEtran document class is recommended for IEEE publications, ThesisForge generates compatible code that works with standard LaTeX document classes. The bibliography style (IEEEtran.bst) is what determines the reference formatting.",
      },
      {
        question: "How do I cite multiple sources in IEEE style?",
        answer:
          "In IEEE style, multiple sources are cited as [1], [2], [3] or as a range [1]–[3]. ThesisForge handles this automatically when you insert multiple citations in your text.",
      },
    ],
  },

  chicago: {
    style: "chicago",
    seoTitle: "Chicago Citation Style for LaTeX Thesis",
    description:
      "Use Chicago 17th edition citation style in your LaTeX thesis. Free automatic Chicago footnote formatting with BibTeX. Works with Overleaf.",
    keyword: "Chicago citation latex",
    edition: "17th Edition",
    disciplines: ["History", "Humanities", "Arts", "Theology", "Philosophy"],
    format: "Footnotes / Bibliography",
    formatDescription:
      "Chicago style primarily uses footnotes or endnotes for citations. A superscript number in the text corresponds to a note containing the full citation. The bibliography at the end provides a complete list of all sources cited, formatted differently from the notes.",
    pageContent: `The Chicago Manual of Style (CMOS) is one of the oldest and most comprehensive style guides in academic publishing. Currently in its 17th edition, Chicago style is the preferred citation format in history, humanities, arts, theology, and philosophy. It offers two documentation systems: the Notes and Bibliography system (commonly used in humanities) and the Author-Date system (used in social sciences). ThesisForge supports the Notes and Bibliography system, which is the most distinctive feature of Chicago style.

The Notes and Bibliography system uses footnotes (or endnotes) to cite sources in the body of the text. When you reference a source, you insert a superscript number that corresponds to a note at the bottom of the page (or end of the chapter). The note contains the full bibliographic citation for the source. The first time you cite a source, the note includes complete information. Subsequent citations to the same source can use a shortened format.

This footnoting approach has several advantages for humanities writing. It keeps the main text readable and free of citation clutter, allows for discursive notes that provide additional context or acknowledge sources not directly cited, and gives readers immediate access to full citation information without flipping to a bibliography. For long-form academic writing such as history theses, literary analyses, and philosophical arguments, this system is ideally suited.

The bibliography at the end of a Chicago-style document lists all sources alphabetically by the author's surname. Each entry follows a specific format that differs from the footnote format — for example, the author's name is listed as Surname, First Name (unlike the footnote format which lists First Name Surname). Book titles are italicised, article titles are placed in quotation marks, and journal names are italicised.

Implementing Chicago footnotes in LaTeX requires the biblatex-chicago package and proper configuration. The footnotes must be formatted differently from the bibliography entries, and the ibid and shortened citation forms must be handled correctly. ThesisForge manages all of this complexity: select Chicago style in the formatting step, and the generated LaTeX code will produce correctly formatted footnotes and bibliography automatically.

For students writing history theses, literary analyses, art history papers, or theological dissertations, ThesisForge's Chicago citation support provides the academic rigour expected in humanities disciplines without the LaTeX configuration headaches.`,
    bibtexExample: `@book{foucault1977discipline,
  author    = {Michel Foucault},
  title     = {Discipline and Punish: The 
               Birth of the Prison},
  translator = {Alan Sheridan},
  publisher = {Vintage Books},
  year      = {1977},
  address   = {New York}
}

@article{white1973structure,
  author  = {Hayden White},
  title   = {The Structure of Historical 
             Narrative},
  journal = {Clio},
  year    = {1973},
  volume  = {3},
  number  = {1},
  pages   = {3--24}
}

@incollection{geertz1973interpretation,
  author    = {Clifford Geertz},
  title     = {Thick Description: Toward an 
               Interpretive Theory of Culture},
  booktitle = {The Interpretation of 
               Cultures},
  publisher = {Basic Books},
  year      = {1973},
  address   = {New York},
  pages     = {3--30}
}`,
    renderedExample: `1. Michel Foucault, Discipline and Punish: The Birth of the Prison, trans. Alan Sheridan (New York: Vintage Books, 1977), 23.

2. Hayden White, "The Structure of Historical Narrative," Clio 3, no. 1 (1973): 5.

3. Foucault, Discipline and Punish, 200–201.

Foucault, Michel. Discipline and Punish: The Birth of the Prison. Translated by Alan Sheridan. New York: Vintage Books, 1977.

Geertz, Clifford. "Thick Description: Toward an Interpretive Theory of Culture." In The Interpretation of Cultures, 3–30. New York: Basic Books, 1973.

White, Hayden. "The Structure of Historical Narrative." Clio 3, no. 1 (1973): 3–24.`,
    faqs: [
      {
        question: "What is Chicago citation style?",
        answer:
          "Chicago citation style, published in The Chicago Manual of Style (17th edition), is a referencing system commonly used in history and humanities. It uses footnotes or endnotes for in-text citations and a comprehensive bibliography at the end of the document.",
      },
      {
        question: "Does ThesisForge support Chicago footnotes?",
        answer:
          "Yes. When you select Chicago style, ThesisForge configures the LaTeX document to use footnotes for citations and produces a correctly formatted bibliography. The footnotes are numbered automatically and formatted according to Chicago 17th edition guidelines.",
      },
      {
        question: "What is the difference between Chicago notes and Chicago author-date?",
        answer:
          "Chicago Notes and Bibliography uses footnotes for citations and is common in humanities. Chicago Author-Date uses parenthetical in-text citations like APA and is used in social sciences. ThesisForge uses the Notes and Bibliography system.",
      },
      {
        question: "How are subsequent citations formatted in Chicago style?",
        answer:
          "After the first full citation, subsequent references to the same source use a shortened format: author's surname, shortened title, and page number. LaTeX with biblatex-chicago handles this automatically.",
      },
      {
        question: "Can I use Chicago style for my history thesis?",
        answer:
          "Yes. Chicago style is the standard citation format for history theses and is widely expected in humanities disciplines. ThesisForge's Chicago template is designed specifically for this use case.",
      },
    ],
  },

  harvard: {
    style: "harvard",
    seoTitle: "Harvard Referencing for LaTeX Thesis",
    description:
      "Use Harvard referencing style in your LaTeX thesis. Free automatic Harvard author-date formatting with BibTeX. Works with Overleaf. No LaTeX knowledge needed.",
    keyword: "Harvard referencing latex",
    edition: "Standard",
    disciplines: ["Business", "Economics", "Social Sciences", "Law", "Natural Sciences"],
    format: "Author-Date (Parenthetical)",
    formatDescription:
      "Harvard referencing uses an author-date citation system similar to APA. In-text citations include the author's surname, year of publication, and optionally a page number, all within parentheses. The reference list at the end provides full bibliographic details alphabetised by author.",
    pageContent: `Harvard referencing is one of the most widely used citation systems in the world, particularly in business, economics, law, and the natural sciences. Unlike APA or Chicago, Harvard referencing is not maintained by a single organisation — instead, it is a standardised system used by thousands of universities worldwide. While the basic principles are consistent, some institutions have their own variations. ThesisForge follows the most common Harvard referencing conventions.

The Harvard system uses an author-date citation format. In the body of your text, when you reference a source, you include the author's surname and the year of publication in parentheses: (Smith, 2023). If you are quoting directly or referring to a specific passage, you include the page number: (Smith, 2023, p. 42). For works with two authors, both names are included: (Smith and Jones, 2023). For three or more authors, the first author's name is followed by "et al.": (Smith et al., 2023).

The reference list at the end of your Harvard-style document provides complete bibliographic information for every source cited in your text. References are listed alphabetically by the first author's surname. Each reference follows a specific format that varies by source type. Journal articles, books, book chapters, websites, and conference papers each have their own formatting rules. A key feature of Harvard referencing is that the year of publication appears immediately after the author's name in the reference list entry.

One important difference between Harvard and APA referencing is how multiple works by the same author from the same year are distinguished. In Harvard style, these are differentiated by adding a lowercase letter (a, b, c) after the year: (Smith, 2023a) and (Smith, 2023b). The reference list entries for these works are also labelled accordingly.

Implementing Harvard referencing in LaTeX requires the appropriate bibliography style and correct BibTeX entry formatting. ThesisForge handles all of this automatically. When you select Harvard as your citation style, the generated LaTeX code uses the correct bibliography configuration, and all references are formatted according to Harvard referencing standards.

For business students writing MBA theses, economics researchers, or anyone at a university that requires Harvard referencing, ThesisForge provides a reliable, error-free way to produce correctly formatted citations and bibliographies in LaTeX without any manual configuration.`,
    bibtexExample: `@article{williams2023impact,
  author  = {Williams, Sarah and 
             Brown, David},
  title   = {The Impact of Remote Work on 
             Employee Productivity},
  journal = {Journal of Business Research},
  year    = {2023},
  volume  = {156},
  pages   = {113--125},
  doi     = {10.1016/j.jbusres.2023.01.045}
}

@book{porter2020competitive,
  author    = {Porter, Michael E.},
  title     = {Competitive Strategy: 
               Techniques for Analyzing 
               Industries and Competitors},
  publisher = {Free Press},
  year      = {2020},
  address   = {New York},
  edition   = {2nd}
}

@website{mckinsey2023ai,
  author  = {{McKinsey Global Institute}},
  title   = {The Economic Potential of 
             Generative AI},
  year    = {2023},
  url     = {https://www.mckinsey.com/
            featured-insights/artificial-
            intelligence},
  urldate = {2023-11-20}
}`,
    renderedExample: `Williams, S. and Brown, D. (2023) 'The impact of remote work on employee productivity', Journal of Business Research, 156, pp. 113–125. doi: 10.1016/j.jbusres.2023.01.045.

Porter, M.E. (2020) Competitive strategy: techniques for analyzing industries and competitors. 2nd edn. New York: Free Press.

McKinsey Global Institute (2023) The economic potential of generative AI. Available at: https://www.mckinsey.com/featured-insights/artificial-intelligence (Accessed: 20 November 2023).`,
    faqs: [
      {
        question: "What is Harvard referencing style?",
        answer:
          "Harvard referencing is an author-date citation system used widely in business, economics, and social sciences. In-text citations include the author's surname and publication year in parentheses, e.g., (Smith, 2023), with a full reference list at the end of the document.",
      },
      {
        question: "Is Harvard referencing the same as APA?",
        answer:
          "No. While both use author-date citations, they differ in formatting details. Harvard references typically put the year in parentheses immediately after the author name in the reference list, use different punctuation conventions, and format article titles differently. Harvard also commonly uses 'et al.' for 4+ authors from the first citation.",
      },
      {
        question: "Can ThesisForge generate Harvard-style BibTeX?",
        answer:
          "Yes. When you select Harvard referencing style in ThesisForge, the generated LaTeX code uses the appropriate bibliography style to produce Harvard-formatted citations and references automatically.",
      },
      {
        question: "How do I cite multiple works by the same author in Harvard style?",
        answer:
          "In Harvard style, multiple works by the same author from the same year are distinguished with lowercase letters: (Smith, 2023a), (Smith, 2023b). These are also reflected in the reference list. LaTeX handles this automatically.",
      },
      {
        question: "Which universities use Harvard referencing?",
        answer:
          "Harvard referencing is used by thousands of universities worldwide, particularly in the UK, Australia, and parts of Europe. Many business schools, economics departments, and law schools require Harvard style. Check your institution's specific guidelines for any local variations.",
      },
    ],
  },

  vancouver: {
    style: "vancouver",
    seoTitle: "Vancouver Citation Style for LaTeX Thesis",
    description:
      "Use Vancouver citation style in your LaTeX thesis. Free automatic Vancouver numeric formatting with BibTeX. Works with Overleaf. No LaTeX knowledge needed.",
    keyword: "Vancouver citation style latex",
    edition: "Standard",
    disciplines: ["Medicine", "Biomedical Sciences", "Health Sciences", "Pharmacy", "Dentistry"],
    format: "Numeric [1]",
    formatDescription:
      "Vancouver style uses a numeric citation system where sources are numbered consecutively in the order they appear in the text. In-text citations use Arabic numerals in square brackets, superscripts, or parentheses. The reference list is numbered correspondingly.",
    pageContent: `Vancouver citation style is the standard referencing format used in biomedical and health sciences. Named after the city where it was first agreed upon at a 1978 meeting of medical journal editors, Vancouver style is used by the majority of biomedical journals worldwide and is the required citation format for theses in medicine, nursing, pharmacy, dentistry, and public health.

The Vancouver citation system assigns a unique number to each source based on the order in which it first appears in the text. When you reference a source, you insert the corresponding number in square brackets — [1], [2], [3] — or sometimes as a superscript. If you refer to the same source multiple times, it retains its original number. When citing multiple sources simultaneously, you can use commas or en-dashes for ranges: [1, 3, 5] or [1]–[5].

The reference list at the end of a Vancouver-style document provides complete bibliographic information for each cited source. References are listed in numerical order (not alphabetical order), matching the citation numbers in the text. Each reference follows a specific format that is regulated by the International Committee of Medical Journal Editors (ICMJE). For journal articles, the format is: Authors. Title. Journal abbreviation. Year;Volume(Issue):Pages.

A distinctive feature of Vancouver style is how authors are listed. In the reference list, if there are six or fewer authors, all are listed. If there are seven or more authors, the first six are listed followed by "et al." Author names use initials without periods, separated by spaces (not commas). This convention differs significantly from both APA and IEEE styles.

Another important feature of Vancouver style is the use of abbreviated journal titles. The full journal name is replaced with a standardised abbreviation from the NLM Catalog (formerly PubMed). For example, "The New England Journal of Medicine" becomes "N Engl J Med." These abbreviations must be used exactly as specified, with proper punctuation and capitalisation.

Implementing Vancouver referencing in LaTeX requires the correct bibliography style (such as vancouver.bst or similar) and properly formatted BibTeX entries that include abbreviated journal names. ThesisForge handles all of these details automatically. When you select Vancouver as your citation style, the generated LaTeX code produces correctly numbered citations and a properly formatted reference list that complies with ICMJE standards.

For medical students, biomedical researchers, and health sciences professionals, ThesisForge's Vancouver citation support provides the academic rigour required by biomedical journals and medical schools without the complexity of manual LaTeX configuration.`,
    bibtexExample: `@article{li2023efficacy,
  author  = {Li, X and Wang, H and 
             Zhang, Q and Chen, Y},
  title   = {Efficacy of Metformin in 
             Type 2 Diabetes Management: 
             A Meta-Analysis},
  journal = {Lancet Diabetes Endocrinol},
  year    = {2023},
  volume  = {11},
  number  = {5},
  pages   = {312--324},
  doi     = {10.1016/S2213-8587(23)00045-2}
}

@article{jones2022covid,
  author  = {Jones, R and Patel, M and 
             Anderson, K and Williams, S and 
             Taylor, D and Brown, L},
  title   = {Long COVID: A Comprehensive 
             Review of Persistent Symptoms},
  journal = {BMJ},
  year    = {2022},
  volume  = {377},
  pages   = {o694},
  doi     = {10.1136/bmj.o694}
}`,
    renderedExample: `[1] Li X, Wang H, Zhang Q, Chen Y. Efficacy of metformin in type 2 diabetes management: a meta-analysis. Lancet Diabetes Endocrinol. 2023;11(5):312-24.

[2] Jones R, Patel M, Anderson K, Williams S, Taylor D, Brown L. Long COVID: a comprehensive review of persistent symptoms. BMJ. 2022;377:o694.`,
    faqs: [
      {
        question: "What is Vancouver citation style?",
        answer:
          "Vancouver style is a numeric referencing system used in biomedical and health sciences. Sources are numbered in the order they appear, with in-text citations using numbers in square brackets [1]. It follows guidelines from the International Committee of Medical Journal Editors (ICMJE).",
      },
      {
        question: "How is Vancouver different from IEEE citation style?",
        answer:
          "Both use numeric citations, but Vancouver follows ICMJE guidelines with specific rules for author names (initials without periods), abbreviated journal titles (from NLM Catalog), and reference list ordering. IEEE follows IEEE editorial guidelines with different formatting conventions.",
      },
      {
        question: "Can I use Vancouver style for my medical thesis?",
        answer:
          "Yes. Vancouver style is the standard citation format for medical theses, nursing dissertations, and biomedical research papers. Most medical schools and health science programs require Vancouver referencing.",
      },
      {
        question: "Does ThesisForge handle Vancouver journal abbreviations?",
        answer:
          "Yes. When you enter journal article references in ThesisForge with Vancouver style selected, the generated BibTeX entries and LaTeX configuration produce correctly abbreviated journal titles according to NLM Catalog standards.",
      },
      {
        question: "How are multiple authors handled in Vancouver style?",
        answer:
          "In Vancouver style, if a source has six or fewer authors, all are listed. If there are seven or more, the first six are listed followed by 'et al.' Author names use initials without periods, separated by spaces.",
      },
    ],
  },
};

// ============================================================
// Static Params & Metadata
// ============================================================

export function generateStaticParams() {
  return Object.values(citationStyles).map((s) => ({ style: s.style }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ style: string }>;
}): Promise<Metadata> {
  const { style } = await params;
  const data = citationStyles[style];
  if (!data) return {};

  return {
    title: data.seoTitle,
    description: data.description,
    alternates: {
      canonical: `${BASE_URL}/citation-styles/${style}`,
    },
    openGraph: {
      title: `${data.seoTitle} | ThesisForge`,
      description: data.description,
      url: `${BASE_URL}/citation-styles/${style}`,
      type: "article",
      siteName: "ThesisForge",
    },
    twitter: {
      card: "summary_large_image",
      title: data.seoTitle,
      description: data.description,
    },
  };
}

// ============================================================
// Page Component
// ============================================================

const styleDisplayName: Record<string, string> = {
  apa: "APA",
  ieee: "IEEE",
  chicago: "Chicago",
  harvard: "Harvard",
  vancouver: "Vancouver",
};

export default async function CitationStyleLandingPage({
  params,
}: {
  params: Promise<{ style: string }>;
}) {
  const { style } = await params;
  const data = citationStyles[style];

  if (!data) {
    notFound();
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  const otherStyles = Object.values(citationStyles).filter(
    (s) => s.style !== style
  );

  const templateTypes = [
    { slug: "bachelors", label: "Bachelor" },
    { slug: "masters", label: "Master" },
    { slug: "phd", label: "PhD" },
    { slug: "research-report", label: "Research Report" },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqLd),
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
                <Link href="/citation-styles/apa" className="hover:text-foreground transition-colors">
                  Citation Styles
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground font-medium">{styleDisplayName[style]}</li>
            </ol>
            <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Generate Thesis
            </Link>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {/* H1 */}
            <h1 className="page-title mb-4">{data.keyword}</h1>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl">{data.description}</p>

            {/* Style Overview Badge Row */}
            <div className="flex flex-wrap gap-3 mb-10">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                {data.edition}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium">
                {data.format}
              </span>
              {data.disciplines.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* How the Style Works */}
            <section aria-labelledby="format-heading" className="mb-14">
              <h2 id="format-heading" className="section-title mb-4">
                How {styleDisplayName[style]} Citation Works
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-3xl">{data.formatDescription}</p>
            </section>

            {/* Main Content */}
            <section aria-labelledby="about-heading" className="mb-14">
              <h2 id="about-heading" className="section-title mb-6">
                About {styleDisplayName[style]} Citation Style
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed max-w-3xl">
                {data.pageContent.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph.trim()}</p>
                ))}
              </div>
            </section>

            {/* BibTeX Example */}
            <section aria-labelledby="bibtex-heading" className="mb-14">
              <h2 id="bibtex-heading" className="section-title mb-4">
                {styleDisplayName[style]} BibTeX Example
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
                Below is a sample BibTeX file formatted for {styleDisplayName[style]} citation style.
                ThesisForge generates BibTeX automatically when you add references in the wizard.
              </p>
              <div className="rounded-xl border bg-card overflow-x-auto">
                <pre className="latex-code-block p-6 text-sm leading-relaxed overflow-x-auto">
                  <code>{data.bibtexExample}</code>
                </pre>
              </div>
            </section>

            {/* Rendered Output */}
            <section aria-labelledby="rendered-heading" className="mb-14">
              <h2 id="rendered-heading" className="section-title mb-4">
                Rendered {styleDisplayName[style]} Output
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
                This is what the above BibTeX entries look like when compiled with{" "}
                {styleDisplayName[style]} citation style in LaTeX:
              </p>
              <div className="rounded-xl border bg-card p-6">
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground font-mono">
                  {data.renderedExample.split("\n\n").map((block, i) => (
                    <p key={i} className="whitespace-pre-wrap">{block.trim()}</p>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="mb-14 rounded-2xl bg-primary/5 border border-primary/10 p-8 sm:p-10 text-center">
              <h2 className="section-title mb-3">
                Generate a Thesis with {styleDisplayName[style]} Citations
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Choose {styleDisplayName[style]} as your citation style in ThesisForge and get perfectly
                formatted citations and bibliography — automatically. No LaTeX knowledge required.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity cta-pulse"
              >
                Start Free Thesis Generator
              </Link>
            </section>

            {/* FAQ Section */}
            <section aria-labelledby="faq-heading" className="mb-14">
              <h2 id="faq-heading" className="section-title mb-6">
                Frequently Asked Questions About {styleDisplayName[style]} Citation
              </h2>
              <div className="space-y-4">
                {data.faqs.map((faq) => (
                  <details key={faq.question} className="group rounded-xl border bg-card">
                    <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-medium hover:text-primary transition-colors list-none">
                      {faq.question}
                      <svg
                        className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0 ml-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Internal Links — Other Citation Styles */}
            <section aria-labelledby="other-styles-heading" className="mb-14">
              <h2 id="other-styles-heading" className="section-title mb-6">
                Other Citation Styles
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {otherStyles.map((s) => (
                  <Link
                    key={s.style}
                    href={`/citation-styles/${s.style}`}
                    className="block p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <h3 className="text-sm font-semibold mb-1">{styleDisplayName[s.style]}</h3>
                    <p className="text-xs text-muted-foreground">{s.format}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Internal Links — Templates */}
            <section aria-labelledby="templates-heading" className="mb-14">
              <h2 id="templates-heading" className="section-title mb-6">
                Use {styleDisplayName[style]} With Any Thesis Template
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                {styleDisplayName[style]} citation style works with all ThesisForge templates:
              </p>
              <div className="flex flex-wrap gap-3">
                {templateTypes.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/templates/${t.slug}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    {t.label} Template
                  </Link>
                ))}
              </div>
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
