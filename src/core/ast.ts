// ============================================================
// ThesisForge Core — LaTeX Abstract Syntax Tree (AST)
// Do NOT build LaTeX by string concatenation. Build an AST, then serialize.
//
// Complete node taxonomy — every structural element in the document
// is a typed node. No strings. No template literals.
// ============================================================

export type ASTNodeType =
  | 'Document'
  | 'Preamble'
  | 'Command'
  | 'Environment'
  | 'Text'
  | 'Comment'
  | 'BlankLine'
  | 'MacroDef'
  | 'PackageImport'
  | 'DocumentClass'
  // ── Extended node types (Engine v2) ──
  | 'Math'
  | 'Verbatim'
  | 'List'
  | 'Figure'
  | 'Table'
  | 'Citation'
  | 'Label'
  | 'Ref'
  | 'Footnote'
  | 'HorizontalRule'
  | 'NewPage'
  | 'RawLaTeX';

export interface ASTNode {
  type: ASTNodeType;
  children?: ASTNode[];
}

// ── Core Nodes ──────────────────────────────────────────────────

export interface DocumentNode extends ASTNode {
  type: 'Document';
  children: ASTNode[];
}

export interface PreambleNode extends ASTNode {
  type: 'Preamble';
  documentClass: DocumentClassNode;
  packages: PackageImportNode[];
  macroDefs: MacroDefNode[];
  preambleCommands: ASTNode[];
}

export interface DocumentClassNode extends ASTNode {
  type: 'DocumentClass';
  className: string;
  options: string[];
}

export interface PackageImportNode extends ASTNode {
  type: 'PackageImport';
  packageName: string;
  options?: string[];
}

export interface CommandNode extends ASTNode {
  type: 'Command';
  name: string;
  options?: string[];           // [opt1, opt2]
  args?: (string | ASTNode)[];  // {arg1} {arg2}
  star?: boolean;               // \command*
}

export interface EnvironmentNode extends ASTNode {
  type: 'Environment';
  envName: string;
  options?: string[];
  args?: string[];              // {} mandatory args (e.g. {tabular}{lcc})
  children: ASTNode[];
}

export interface TextNode extends ASTNode {
  type: 'Text';
  content: string;
  escaped?: boolean;  // If true, content is already LaTeX-escaped or raw LaTeX
}

export interface CommentNode extends ASTNode {
  type: 'Comment';
  content: string;
}

export interface BlankLineNode extends ASTNode {
  type: 'BlankLine';
}

export interface MacroDefNode extends ASTNode {
  type: 'MacroDef';
  name: string;
  definition: string;
  options?: string[];
}

// ── Extended Nodes (Engine v2) ──────────────────────────────────

export interface MathNode extends ASTNode {
  type: 'Math';
  content: string;   // Raw math content (LaTeX math commands)
  display: boolean;  // true = \[...\], false = $...$
}

export interface VerbatimNode extends ASTNode {
  type: 'Verbatim';
  content: string;
  language: string | null;  // For lstlisting; null for \verbatim
}

export interface ListNode extends ASTNode {
  type: 'List';
  listType: 'itemize' | 'enumerate' | 'description';
  items: Array<{ term?: string; content: string }>;
}

export interface FigureNode extends ASTNode {
  type: 'Figure';
  path: string;
  caption: string;
  label: string;
  width?: string;        // Default: '0.8\\textwidth'
  placement?: string;    // Default: 'htbp'
  children?: ASTNode[];  // Optional subfigure children
}

export interface TableNode extends ASTNode {
  type: 'Table';
  caption: string;
  label: string;
  headers: string[];
  rows: string[][];
  placement?: string;    // Default: 'htbp'
  columnSpec?: string;   // Default: auto from headers
}

export interface CitationNode extends ASTNode {
  type: 'Citation';
  keys: string[];
  pre?: string;          // Text before citation
  post?: string;         // Text after citation (e.g. page number)
  command?: string;      // citep | citet | citeyear | citeauthor
}

export interface LabelNode extends ASTNode {
  type: 'Label';
  label: string;
}

export interface RefNode extends ASTNode {
  type: 'Ref';
  label: string;
  refType?: string;      // cref | ref | pageref | vref | eqref
}

export interface FootnoteNode extends ASTNode {
  type: 'Footnote';
  content: string;
}

export interface HorizontalRuleNode extends ASTNode {
  type: 'HorizontalRule';
}

export interface NewPageNode extends ASTNode {
  type: 'NewPage';
  pageType?: string;     // clearpage | cleardoublepage | newpage
}

export interface RawLaTeXNode extends ASTNode {
  type: 'RawLaTeX';
  content: string;       // Raw LaTeX string — output as-is
}

// ============================================================
// AST Node Factory Functions
// ============================================================

// ── Core factories ──────────────────────────────────────────────

export function document(children: ASTNode[]): DocumentNode {
  return { type: 'Document', children };
}

export function preamble(
  documentClass: DocumentClassNode,
  packages: PackageImportNode[],
  macroDefs: MacroDefNode[],
  preambleCommands: ASTNode[]
): PreambleNode {
  return { type: 'Preamble', documentClass, packages, macroDefs, preambleCommands };
}

export function docClass(className: string, options: string[] = []): DocumentClassNode {
  return { type: 'DocumentClass', className, options };
}

export function usepackage(packageName: string, options?: string[]): PackageImportNode {
  return { type: 'PackageImport', packageName, options };
}

export function command(
  name: string,
  args?: (string | ASTNode)[],
  options?: string[],
  star?: boolean
): CommandNode {
  return { type: 'Command', name, args, options, star };
}

export function environment(
  envName: string,
  children: ASTNode[] = [],
  options?: string[],
  args?: string[]
): EnvironmentNode {
  return { type: 'Environment', envName, children, options, args };
}

export function text(content: string, escaped = false): TextNode {
  return { type: 'Text', content, escaped };
}

export function comment(content: string): CommentNode {
  return { type: 'Comment', content };
}

export function blankLine(): BlankLineNode {
  return { type: 'BlankLine' };
}

export function macroDef(name: string, definition: string, options?: string[]): MacroDefNode {
  return { type: 'MacroDef', name, definition, options };
}

// ── Extended factories ──────────────────────────────────────────

export function math(content: string, display = false): MathNode {
  return { type: 'Math', content, display };
}

export function verbatim(content: string, language: string | null = null): VerbatimNode {
  return { type: 'Verbatim', content, language };
}

export function list(
  listType: 'itemize' | 'enumerate' | 'description',
  items: Array<{ term?: string; content: string }>
): ListNode {
  return { type: 'List', listType, items };
}

export function figure(opts: {
  path: string;
  caption: string;
  label: string;
  width?: string;
  placement?: string;
}): FigureNode {
  return {
    type: 'Figure',
    path: opts.path,
    caption: opts.caption,
    label: opts.label,
    width: opts.width || '0.8\\textwidth',
    placement: opts.placement || 'htbp',
  };
}

export function table(opts: {
  caption: string;
  label: string;
  headers: string[];
  rows: string[][];
  placement?: string;
  columnSpec?: string;
}): TableNode {
  return {
    type: 'Table',
    caption: opts.caption,
    label: opts.label,
    headers: opts.headers,
    rows: opts.rows,
    placement: opts.placement || 'htbp',
    columnSpec: opts.columnSpec,
  };
}

export function citation(
  keys: string[],
  pre?: string,
  post?: string,
  command?: string
): CitationNode {
  return { type: 'Citation', keys, pre, post, command: command || 'citep' };
}

export function label(labelStr: string): LabelNode {
  return { type: 'Label', label: labelStr };
}

export function ref(labelStr: string, refType?: string): RefNode {
  return { type: 'Ref', label: labelStr, refType: refType || 'cref' };
}

export function footnote(content: string): FootnoteNode {
  return { type: 'Footnote', content };
}

export function horizontalRule(): HorizontalRuleNode {
  return { type: 'HorizontalRule' };
}

export function newPage(pageType?: string): NewPageNode {
  return { type: 'NewPage', pageType: pageType || 'clearpage' };
}

export function rawLaTeX(content: string): RawLaTeXNode {
  return { type: 'RawLaTeX', content };
}
