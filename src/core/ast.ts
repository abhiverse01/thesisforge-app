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
  | 'RawLaTeX'
  // ── Pipeline expansion node types (Engine v3) ──
  | 'Acronym'
  | 'GlossaryEntry'
  | 'NomenclatureEntry'
  | 'Subfigure'
  | 'Algorithm'
  | 'TikzFigure'
  | 'MultilineMath'
  | 'HyperLink'
  | 'Index'
  | 'AcronymRef'
  | 'Theorem';

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

// ── Pipeline Expansion Nodes (Engine v3) ────────────────────────

export interface AcronymNode extends ASTNode {
  type: 'Acronym';
  key: string;
  abbreviation: string;
  fullForm: string;
}

export interface GlossaryEntryNode extends ASTNode {
  type: 'GlossaryEntry';
  key: string;
  name: string;
  description: string;
}

export interface NomenclatureEntryNode extends ASTNode {
  type: 'NomenclatureEntry';
  symbol: string;
  description: string;
}

export interface SubfigureNode extends ASTNode {
  type: 'Subfigure';
  caption: string;
  label?: string;
  width: string;
  placement?: string;    // Default: 'htbp'
  children: ASTNode[];
}

export interface AlgorithmNode extends ASTNode {
  type: 'Algorithm';
  caption: string;
  label?: string;
  language: string;       // Default: 'algorithmicx' (algorithmicx pseudocode)
  children: ASTNode[];
}

export interface TikzFigureNode extends ASTNode {
  type: 'TikzFigure';
  content: string;        // Raw TikZ code — passthrough
}

export type MultilineMathEnvironment = 'align' | 'equation*' | 'gather' | 'multline';

export interface MultilineMathNode extends ASTNode {
  type: 'MultilineMath';
  environment: MultilineMathEnvironment;
  content: string;        // Raw math lines
  label?: string;
}

export interface HyperLinkNode extends ASTNode {
  type: 'HyperLink';
  url: string;
  text: string;
}

export interface IndexNode extends ASTNode {
  type: 'Index';
  entry: string;
}

export type AcronymRefType = 'acrshort' | 'acrlong' | 'acrfull';

export interface AcronymRefNode extends ASTNode {
  type: 'AcronymRef';
  key: string;
  refType: AcronymRefType;
}

export type TheoremType = 'theorem' | 'lemma' | 'proof' | 'definition' | 'proposition' | 'corollary';

export interface TheoremNode extends ASTNode {
  type: 'Theorem';
  theoremType: TheoremType;
  caption?: string;
  label?: string;
  children: ASTNode[];
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

// ── Pipeline Expansion Factories (Engine v3) ────────────────────

export function acronym(key: string, abbreviation: string, fullForm: string): AcronymNode {
  return { type: 'Acronym', key, abbreviation, fullForm };
}

export function glossaryEntry(key: string, name: string, description: string): GlossaryEntryNode {
  return { type: 'GlossaryEntry', key, name, description };
}

export function nomenclatureEntry(symbol: string, description: string): NomenclatureEntryNode {
  return { type: 'NomenclatureEntry', symbol, description };
}

export function subfigure(opts: {
  caption: string;
  width: string;
  label?: string;
  placement?: string;
  children?: ASTNode[];
}): SubfigureNode {
  return {
    type: 'Subfigure',
    caption: opts.caption,
    width: opts.width,
    label: opts.label,
    placement: opts.placement || 'htbp',
    children: opts.children || [],
  };
}

export function algorithm(opts: {
  caption: string;
  language?: string;
  label?: string;
  children: ASTNode[];
}): AlgorithmNode {
  return {
    type: 'Algorithm',
    caption: opts.caption,
    language: opts.language || 'algorithmicx',
    label: opts.label,
    children: opts.children,
  };
}

export function tikzFigure(content: string): TikzFigureNode {
  return { type: 'TikzFigure', content };
}

export function multilineMath(opts: {
  environment: MultilineMathEnvironment;
  content: string;
  label?: string;
}): MultilineMathNode {
  return {
    type: 'MultilineMath',
    environment: opts.environment,
    content: opts.content,
    label: opts.label,
  };
}

export function hyperLink(url: string, text: string): HyperLinkNode {
  return { type: 'HyperLink', url, text };
}

export function index(entry: string): IndexNode {
  return { type: 'Index', entry };
}

export function acronymRef(key: string, refType: AcronymRefType): AcronymRefNode {
  return { type: 'AcronymRef', key, refType };
}

export function theorem(opts: {
  theoremType: TheoremType;
  caption?: string;
  label?: string;
  children: ASTNode[];
}): TheoremNode {
  return {
    type: 'Theorem',
    theoremType: opts.theoremType,
    caption: opts.caption,
    label: opts.label,
    children: opts.children,
  };
}

// ============================================================
// AST Diff Engine
// ============================================================

export interface ASTDiffEntry {
  type: 'added' | 'removed' | 'changed';
  path: string;       // e.g. "children.2.title"
  oldValue?: string;
  newValue?: string;
  description: string; // Human-readable: "Added Figure node to Chapter 3"
}

/**
 * Perform a minimal diff between two AST snapshots.
 * Compares children arrays, recursively diffs matching nodes,
 * and generates human-readable descriptions for each change.
 */
export function diffAST(before: DocumentNode, after: DocumentNode): ASTDiffEntry[] {
  const entries: ASTDiffEntry[] = [];
  diffNodes(before, after, '', entries);
  return entries;
}

type StringRecord = Record<string, string | number | boolean | undefined>;

function diffNodes(before: ASTNode, after: ASTNode, path: string, entries: ASTDiffEntry[]): void {
  // If the node types differ, report a removal + addition
  if (before.type !== after.type) {
    entries.push({
      type: 'removed',
      path,
      description: `Removed ${before.type} node at ${path || 'root'}`,
    });
    entries.push({
      type: 'added',
      path,
      description: `Added ${after.type} node at ${path || 'root'}`,
    });
    return;
  }

  // Diff the two nodes of the same type by comparing string properties
  diffProperties(before, after, path, entries);

  // Diff children arrays
  const beforeChildren = before.children ?? [];
  const afterChildren = after.children ?? [];
  diffChildrenArrays(beforeChildren, afterChildren, path, entries);
}

function diffProperties(before: ASTNode, after: ASTNode, path: string, entries: ASTDiffEntry[]): void {
  // Extract all serializable string-keyed properties (skip 'type' and 'children')
  const beforeProps = extractProperties(before);
  const afterProps = extractProperties(after);

  const allKeys = Array.from(new Set([...Object.keys(beforeProps), ...Object.keys(afterProps)]));

  for (const key of allKeys) {
    const bVal = beforeProps[key];
    const aVal = afterProps[key];

    const bStr = stringifyValue(bVal);
    const aStr = stringifyValue(aVal);

    if (bStr !== aStr) {
      entries.push({
        type: bStr === undefined ? 'added' : aStr === undefined ? 'removed' : 'changed',
        path: path ? `${path}.${key}` : key,
        oldValue: bStr,
        newValue: aStr,
        description: bStr === undefined
          ? `Added property "${key}" with value "${aStr}" at ${path || 'root'}`
          : aStr === undefined
            ? `Removed property "${key}" (was "${bStr}") at ${path || 'root'}`
            : `Changed "${key}" from "${bStr}" to "${aStr}" at ${path || 'root'}`,
      });
    }
  }
}

function diffChildrenArrays(
  beforeChildren: ASTNode[],
  afterChildren: ASTNode[],
  parentPath: string,
  entries: ASTDiffEntry[]
): void {
  const maxLen = Math.max(beforeChildren.length, afterChildren.length);

  for (let i = 0; i < maxLen; i++) {
    const childPath = parentPath ? `${parentPath}.children.${i}` : `children.${i}`;

    if (i >= beforeChildren.length) {
      // Node added
      entries.push({
        type: 'added',
        path: childPath,
        description: `Added ${afterChildren[i].type} node at index ${i}`,
      });
    } else if (i >= afterChildren.length) {
      // Node removed
      entries.push({
        type: 'removed',
        path: childPath,
        description: `Removed ${beforeChildren[i].type} node at index ${i}`,
      });
    } else {
      // Recursively diff matching nodes by index
      diffNodes(beforeChildren[i], afterChildren[i], childPath, entries);
    }
  }
}

function extractProperties(node: ASTNode): StringRecord {
  const props: StringRecord = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'children') continue;
    // Skip functions
    if (typeof value === 'function') continue;
    if (typeof value === 'object' && value !== null) continue;
    props[key] = value as string | number | boolean | undefined;
  }
  return props;
}

function stringifyValue(value: string | number | boolean | undefined): string | undefined {
  if (value === undefined) return undefined;
  return String(value);
}

// ============================================================
// Preamble Optimizer
// ============================================================

export interface PreambleInfo {
  packages: PackageImportNode[];
  warnings: string[];
}

/**
 * Canonical load order for common LaTeX packages.
 * Packages not in this list are placed after the last matched entry.
 */
const CANONICAL_ORDER: readonly string[] = [
  'inputenc',
  'fontenc',
  'babel',
  'csquotes',
  'fontspec',
  'amsmath',
  'amssymb',
  'amsthm',
  'mathtools',
  'unicode-math',
  'graphicx',
  'xcolor',
  'float',
  'caption',
  'subcaption',
  'subfig',
  'booktabs',
  'array',
  'multirow',
  'longtable',
  'listings',
  'algorithm',
  'algorithmicx',
  'algpseudocode',
  'tikz',
  'pgfplots',
  'pgfplotsset',
  'nomencl',
  'makeidx',
  'glossaries',
  'glossary-inline',
  'acronym',
  'natbib',
  'biblatex',
  'url',
  'hyperref',
  'cleveref',
] as const;

/** Known conflicting package pairs — the second entry is removed. */
const CONFLICT_PAIRS: readonly [string, string][] = [
  ['subfig', 'subcaption'],
  ['subcaption', 'subfig'],
  ['times', 'mathptmx'],
  ['mathptmx', 'times'],
  ['inputenc', 'fontspec'],
  ['fontenc', 'fontspec'],
  ['natbib', 'biblatex'],
  ['biblatex', 'natbib'],
] as const;

function canonicalIndex(packageName: string): number {
  const lower = packageName.toLowerCase();
  for (let i = 0; i < CANONICAL_ORDER.length; i++) {
    if (CANONICAL_ORDER[i].toLowerCase() === lower) return i;
  }
  // Unknown packages go after hyperref but before cleveref (index = length - 1)
  return CANONICAL_ORDER.length - 1;
}

/**
 * Optimize a list of package imports by:
 * - Deduplicating packages by name (first occurrence wins)
 * - Sorting by canonical load order
 * - Warning on known conflicts and removing conflicting packages
 */
export function optimizePreamble(packages: PackageImportNode[]): PreambleInfo {
  const warnings: string[] = [];

  // Step 1: Deduplicate by package name (first occurrence wins)
  const seen = new Map<string, PackageImportNode>();
  const deduplicated: PackageImportNode[] = [];

  for (const pkg of packages) {
    const lower = pkg.packageName.toLowerCase();
    if (seen.has(lower)) {
      warnings.push(
        `Duplicate package "${pkg.packageName}" removed (first occurrence kept)`
      );
    } else {
      seen.set(lower, pkg);
      deduplicated.push(pkg);
    }
  }

  // Step 2: Detect and resolve known conflicts
  const conflictingNames = new Set<string>();
  for (const [first, second] of CONFLICT_PAIRS) {
    if (seen.has(first.toLowerCase()) && seen.has(second.toLowerCase())) {
      warnings.push(
        `Known conflict: "${first}" and "${second}" cannot coexist — removing "${second}"`
      );
      conflictingNames.add(second.toLowerCase());
    }
  }

  const conflictFree = deduplicated.filter(
    pkg => !conflictingNames.has(pkg.packageName.toLowerCase())
  );

  // Step 3: Sort by canonical order
  const sorted = [...conflictFree].sort((a, b) => {
    return canonicalIndex(a.packageName) - canonicalIndex(b.packageName);
  });

  return { packages: sorted, warnings };
}
