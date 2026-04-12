// ============================================================
// ThesisForge Core — AST Serializer (Engine v3)
// Converts AST nodes to LaTeX string output.
// The serializer is the ONLY place that produces LaTeX strings.
// Every element must be serialized from typed AST nodes.
// ============================================================

import type {
  ASTNode,
  ASTNodeType,
  DocumentNode,
  PreambleNode,
  DocumentClassNode,
  PackageImportNode,
  CommandNode,
  EnvironmentNode,
  TextNode,
  CommentNode,
  BlankLineNode,
  MacroDefNode,
  // Extended types
  MathNode,
  VerbatimNode,
  ListNode,
  FigureNode,
  TableNode,
  CitationNode,
  LabelNode,
  RefNode,
  FootnoteNode,
  HorizontalRuleNode,
  NewPageNode,
  RawLaTeXNode,
  // Pipeline expansion types
  AcronymNode,
  GlossaryEntryNode,
  NomenclatureEntryNode,
  SubfigureNode,
  AlgorithmNode,
  TikzFigureNode,
  MultilineMathNode,
  HyperLinkNode,
  IndexNode,
  AcronymRefNode,
  TheoremNode,
} from './ast';
import { escapeLatexBody } from '@/engine/escape';

import {
  rawLaTeX as rawLaTeXNode,
} from './ast';

// ============================================================
// Serializer Error (Strict Mode)
// ============================================================

export class SerializerError extends Error {
  public readonly nodeType: string;
  public readonly nodePath: string;

  constructor(nodeType: string, nodePath: string, message: string) {
    super(message);
    this.name = 'SerializerError';
    this.nodeType = nodeType;
    this.nodePath = nodePath;
    // Restore prototype chain (required for extending built-in Error)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Check that a required string field is non-empty.
 * In strict mode, throws SerializerError. In lenient mode, returns the value as-is.
 */
function requireString(
  value: string | undefined,
  nodeType: ASTNodeType,
  fieldName: string,
  nodePath: string,
  strict: boolean,
): string {
  if (strict && (value === undefined || value === '')) {
    throw new SerializerError(
      nodeType,
      nodePath,
      `Required field "${fieldName}" is empty or missing on ${nodeType} node at ${nodePath}`,
    );
  }
  return value ?? '';
}

// ============================================================
// Required field definitions per node type (for strict mode)
// ============================================================

/** Map of node type → required fields that must be non-empty strings. */
const REQUIRED_FIELDS: Record<string, string[]> = {
  Environment: ['envName'],
  DocumentClass: ['className'],
  PackageImport: ['packageName'],
  Command: ['name'],
  Figure: ['path', 'caption', 'label'],
  Table: ['caption', 'label'],
  Citation: ['keys'],
  Label: ['label'],
  Ref: ['label'],
  Footnote: ['content'],
  Math: ['content'],
  Text: ['content'],
  Comment: ['content'],
  MacroDef: ['name', 'definition'],
  Verbatim: ['content'],
  Acronym: ['key', 'abbreviation', 'fullForm'],
  GlossaryEntry: ['key', 'name', 'description'],
  NomenclatureEntry: ['symbol', 'description'],
  Subfigure: ['caption', 'width'],
  Algorithm: ['caption'],
  TikzFigure: ['content'],
  MultilineMath: ['environment', 'content'],
  HyperLink: ['url', 'text'],
  Index: ['entry'],
  AcronymRef: ['key', 'refType'],
  Theorem: ['theoremType'],
  RawLaTeX: ['content'],
};

/**
 * Validate required fields for a node in strict mode.
 * Throws SerializerError on the first missing/empty required field.
 */
function validateRequiredFields(node: ASTNode, nodePath: string, strict: boolean): void {
  if (!strict) return;
  const fields = REQUIRED_FIELDS[node.type];
  if (fields === undefined) return;

  const record = node as unknown as Record<string, unknown>;
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== 'string' || value === '') {
      throw new SerializerError(
        node.type,
        nodePath,
        `Required field "${field}" is empty or missing on ${node.type} node at ${nodePath}`,
      );
    }
  }
}

// ============================================================
// Core Serializer
// ============================================================

/**
 * Serialize any AST node to LaTeX string.
 * @param node - The AST node to serialize
 * @param indent - Current indentation level (spaces)
 * @param strict - When true, throw SerializerError on missing required fields
 * @param nodePath - Current dot-path for error reporting (used internally)
 */
export function serialize(
  node: ASTNode,
  indent: number = 0,
  strict: boolean = false,
  nodePath: string = '',
): string {
  // Validate required fields in strict mode
  validateRequiredFields(node, nodePath, strict);

  const pad = '  '.repeat(indent);

  switch (node.type) {
    case 'Document': {
      return (node as DocumentNode).children
        .map((child, idx) =>
          serialize(child, indent, strict, nodePath ? `${nodePath}.children.${idx}` : `children.${idx}`),
        )
        .join('\n');
    }

    case 'Preamble': {
      const p = node as PreambleNode;
      let result = '';
      result += serialize(p.documentClass, indent, strict, `${nodePath}.documentClass`);
      result += '\n';
      for (let i = 0; i < p.packages.length; i++) {
        result += serialize(p.packages[i], indent, strict, `${nodePath}.packages.${i}`) + '\n';
      }
      if (p.packages.length > 0) result += '\n';
      for (let i = 0; i < p.preambleCommands.length; i++) {
        result += serialize(p.preambleCommands[i], indent, strict, `${nodePath}.preambleCommands.${i}`) + '\n';
      }
      if (p.preambleCommands.length > 0) result += '\n';
      for (let i = 0; i < p.macroDefs.length; i++) {
        result += serialize(p.macroDefs[i], indent, strict, `${nodePath}.macroDefs.${i}`) + '\n';
      }
      return result;
    }

    case 'DocumentClass': {
      const dc = node as DocumentClassNode;
      const className = requireString(dc.className, dc.type, 'className', nodePath, strict);
      const opts = dc.options.length > 0 ? `[${dc.options.join(', ')}]` : '';
      return `\\documentclass${opts}{${className}}`;
    }

    case 'PackageImport': {
      const pi = node as PackageImportNode;
      const pkgName = requireString(pi.packageName, pi.type, 'packageName', nodePath, strict);
      const opts = pi.options && pi.options.length > 0 ? `[${pi.options.join(', ')}]` : '';
      return `\\usepackage${opts}{${pkgName}}`;
    }

    case 'Command': {
      const cmd = node as CommandNode;
      const cmdName = requireString(cmd.name, cmd.type, 'name', nodePath, strict);
      let result = `\\${cmdName}${cmd.star ? '*' : ''}`;
      if (cmd.options && cmd.options.length > 0) {
        result += `[${cmd.options.join(', ')}]`;
      }
      if (cmd.args && cmd.args.length > 0) {
        for (let i = 0; i < cmd.args.length; i++) {
          const arg = cmd.args[i];
          if (typeof arg === 'string') {
            result += `{${arg}}`;
          } else {
            result += `{${serialize(arg, 0, strict, `${nodePath}.args.${i}`)}}`;
          }
        }
      }
      return result;
    }

    case 'Environment': {
      const env = node as EnvironmentNode;
      const envName = requireString(env.envName, env.type, 'envName', nodePath, strict);
      let result = '';
      result += `\\begin{${envName}}`;
      if (env.options && env.options.length > 0) {
        result += `[${env.options.join(', ')}]`;
      }
      if (env.args && env.args.length > 0) {
        for (const arg of env.args) {
          result += `{${arg}}`;
        }
      }
      result += '\n';
      for (let i = 0; i < env.children.length; i++) {
        result += pad + serialize(env.children[i], indent + 1, strict, `${nodePath}.children.${i}`) + '\n';
      }
      result += `\\end{${envName}}`;
      return result;
    }

    case 'Text': {
      const t = node as TextNode;
      const content = requireString(t.content, t.type, 'content', nodePath, strict);
      if (t.escaped) return content;
      return escapeLatexBody(content);
    }

    case 'Comment': {
      const c = node as CommentNode;
      const content = requireString(c.content, c.type, 'content', nodePath, strict);
      return content.split('\n').map(line => `% ${line}`).join('\n');
    }

    case 'BlankLine': {
      return '';
    }

    case 'MacroDef': {
      const m = node as MacroDefNode;
      const name = requireString(m.name, m.type, 'name', nodePath, strict);
      const def = requireString(m.definition, m.type, 'definition', nodePath, strict);
      const opts = m.options && m.options.length > 0 ? `[${m.options.join(', ')}]` : '';
      return `\\newcommand${opts}{${name}}{${def}}`;
    }

    // ── Extended Node Types (Engine v2) ──────────────────────

    case 'Math': {
      const mn = node as MathNode;
      const content = requireString(mn.content, mn.type, 'content', nodePath, strict);
      return mn.display
        ? `\\[\n  ${content}\n\\]`
        : `$${content}$`;
    }

    case 'Verbatim': {
      const vn = node as VerbatimNode;
      const content = requireString(vn.content, vn.type, 'content', nodePath, strict);
      if (vn.language) {
        return `\\begin{lstlisting}[language=${vn.language}]\n${content}\n\\end{lstlisting}`;
      }
      return `\\begin{verbatim}\n${content}\n\\end{verbatim}`;
    }

    case 'List': {
      const ln = node as ListNode;
      const items = ln.items.map(item => {
        if (item.term) {
          return `  \\item[${escapeLatexBody(item.term)}] ${escapeLatexBody(item.content)}`;
        }
        return `  \\item ${escapeLatexBody(item.content)}`;
      }).join('\n');
      return `\\begin{${ln.listType}}\n${items}\n\\end{${ln.listType}}`;
    }

    case 'Figure': {
      const fn = node as FigureNode;
      const path = requireString(fn.path, fn.type, 'path', nodePath, strict);
      const caption = requireString(fn.caption, fn.type, 'caption', nodePath, strict);
      const lbl = requireString(fn.label, fn.type, 'label', nodePath, strict);
      return `\\begin{figure}[${fn.placement}]
  \\centering
  \\includegraphics[width=${fn.width}]{${path}}
  \\caption{${escapeLatexBody(caption)}}
  \\label{${lbl}}
\\end{figure}`;
    }

    case 'Table': {
      const tn = node as TableNode;
      const caption = requireString(tn.caption, tn.type, 'caption', nodePath, strict);
      const lbl = requireString(tn.label, tn.type, 'label', nodePath, strict);
      const colSpec = tn.columnSpec || tn.headers.map(() => 'l').join('');
      const header = tn.headers.map(h => escapeLatexBody(h)).join(' & ');
      const rows = tn.rows
        .map(row => '  ' + row.map(c => escapeLatexBody(c)).join(' & ') + ' \\\\')
        .join('\n');
      return `\\begin{table}[${tn.placement}]
  \\centering
  \\caption{${escapeLatexBody(caption)}}
  \\label{${lbl}}
  \\begin{tabular}{${colSpec}}
    \\toprule
    ${header} \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
\\end{table}`;
    }

    case 'Citation': {
      const cn = node as CitationNode;
      const keys = cn.keys.join(',');
      const pre = cn.pre ? `[${escapeLatexBody(cn.pre)}]` : '';
      const post = cn.post ? `[${escapeLatexBody(cn.post)}]` : '';
      return `\\${cn.command}${pre}${post}{${keys}}`;
    }

    case 'Label': {
      const lbn = node as LabelNode;
      const lbl = requireString(lbn.label, lbn.type, 'label', nodePath, strict);
      return `\\label{${lbl}}`;
    }

    case 'Ref': {
      const rn = node as RefNode;
      const lbl = requireString(rn.label, rn.type, 'label', nodePath, strict);
      return `\\${rn.refType}{${lbl}}`;
    }

    case 'Footnote': {
      const fnn = node as FootnoteNode;
      const content = requireString(fnn.content, fnn.type, 'content', nodePath, strict);
      return `\\footnote{${escapeLatexBody(content)}}`;
    }

    case 'HorizontalRule': {
      return '\\noindent\\rule{\\textwidth}{0.4pt}';
    }

    case 'NewPage': {
      const npn = node as NewPageNode;
      return `\\${npn.pageType}`;
    }

    case 'RawLaTeX': {
      const rln = node as RawLaTeXNode;
      const content = requireString(rln.content, rln.type, 'content', nodePath, strict);
      return content;
    }

    // ── Pipeline Expansion Node Types (Engine v3) ────────────

    case 'Acronym': {
      const ac = node as AcronymNode;
      const key = requireString(ac.key, ac.type, 'key', nodePath, strict);
      const abbr = requireString(ac.abbreviation, ac.type, 'abbreviation', nodePath, strict);
      const full = requireString(ac.fullForm, ac.type, 'fullForm', nodePath, strict);
      return `\\newacronym{${key}}{${abbr}}{${full}}`;
    }

    case 'GlossaryEntry': {
      const ge = node as GlossaryEntryNode;
      const key = requireString(ge.key, ge.type, 'key', nodePath, strict);
      const name = requireString(ge.name, ge.type, 'name', nodePath, strict);
      const desc = requireString(ge.description, ge.type, 'description', nodePath, strict);
      return `\\newglossaryentry{${key}}{name={${name}}, description={${desc}}}`;
    }

    case 'NomenclatureEntry': {
      const ne = node as NomenclatureEntryNode;
      const symbol = requireString(ne.symbol, ne.type, 'symbol', nodePath, strict);
      const desc = requireString(ne.description, ne.type, 'description', nodePath, strict);
      return `\\nomenclature{${symbol}}{${desc}}`;
    }

    case 'Subfigure': {
      const sf = node as SubfigureNode;
      const caption = requireString(sf.caption, sf.type, 'caption', nodePath, strict);
      const width = requireString(sf.width, sf.type, 'width', nodePath, strict);
      let result = `\\begin{subfigure}[${sf.placement}]{${width}}\n`;
      result += pad + '  \\centering\n';
      for (let i = 0; i < sf.children.length; i++) {
        result += pad + '  ' + serialize(sf.children[i], indent + 2, strict, `${nodePath}.children.${i}`) + '\n';
      }
      result += pad + `  \\caption{${escapeLatexBody(caption)}}\n`;
      if (sf.label) {
        result += pad + `  \\label{${sf.label}}\n`;
      }
      result += pad + `\\end{subfigure}`;
      return result;
    }

    case 'Algorithm': {
      const al = node as AlgorithmNode;
      const caption = requireString(al.caption, al.type, 'caption', nodePath, strict);
      let result = pad + '\\begin{algorithm}[htbp]\n';
      result += pad + '  \\caption{' + escapeLatexBody(caption) + '}\n';
      if (al.label) {
        result += pad + '  \\label{' + al.label + '}\n';
      }
      result += pad + '  \\begin{algorithmic}[1]\n';
      for (let i = 0; i < al.children.length; i++) {
        result += pad + '    ' + serialize(al.children[i], indent + 3, strict, `${nodePath}.children.${i}`) + '\n';
      }
      result += pad + '  \\end{algorithmic}\n';
      result += pad + `\\end{algorithm}`;
      return result;
    }

    case 'TikzFigure': {
      const tz = node as TikzFigureNode;
      const content = requireString(tz.content, tz.type, 'content', nodePath, strict);
      return pad + `\\begin{tikzpicture}\n${content}\n\\end{tikzpicture}`;
    }

    case 'MultilineMath': {
      const mm = node as MultilineMathNode;
      const envName = requireString(mm.environment, mm.type, 'environment', nodePath, strict);
      const content = requireString(mm.content, mm.type, 'content', nodePath, strict);
      let result = pad + `\\begin{${envName}}\n`;
      if (mm.label) {
        result += pad + `  \\label{${mm.label}}\n`;
      }
      result += pad + `  ${content}\n`;
      result += pad + `\\end{${envName}}`;
      return result;
    }

    case 'HyperLink': {
      const hl = node as HyperLinkNode;
      const url = requireString(hl.url, hl.type, 'url', nodePath, strict);
      const linkText = requireString(hl.text, hl.type, 'text', nodePath, strict);
      return `\\href{${url}}{${escapeLatexBody(linkText)}}`;
    }

    case 'Index': {
      const idx = node as IndexNode;
      const entry = requireString(idx.entry, idx.type, 'entry', nodePath, strict);
      return `\\index{${entry}}`;
    }

    case 'AcronymRef': {
      const ar = node as AcronymRefNode;
      const key = requireString(ar.key, ar.type, 'key', nodePath, strict);
      const refType = requireString(ar.refType, ar.type, 'refType', nodePath, strict);
      return `\\${refType}{${key}}`;
    }

    case 'Theorem': {
      const th = node as TheoremNode;
      const theoremType = requireString(th.theoremType, th.type, 'theoremType', nodePath, strict);
      let optPart = '';
      if (th.caption) {
        optPart = `[${escapeLatexBody(th.caption)}]`;
      }
      let result = pad + `\\begin{${theoremType}}${optPart}\n`;
      for (let i = 0; i < th.children.length; i++) {
        result += pad + '  ' + serialize(th.children[i], indent + 1, strict, `${nodePath}.children.${i}`) + '\n';
      }
      result += pad + `\\end{${theoremType}}`;
      return result;
    }

    default:
      return '';
  }
}

/**
 * Serialize a document with proper formatting — adds section separators
 * and begin/end document wrappers.
 */
export function serializeDocument(ast: DocumentNode): string {
  let result = '';

  for (let i = 0; i < ast.children.length; i++) {
    const child = ast.children[i];
    result += serialize(child, 0);

    // Add blank lines between major sections
    if (i < ast.children.length - 1) {
      const nextChild = ast.children[i + 1];
      if (isMajorSection(child) || isMajorSection(nextChild)) {
        result += '\n\n';
      } else {
        result += '\n';
      }
    }
  }

  return result;
}

/**
 * Convert plain text content to LaTeX paragraph nodes.
 * Handles figure/table placeholders, ## headings, and lists.
 */
export function contentToLatexNodes(content: string, escaped = false): ASTNode[] {
  if (!content || !content.trim()) return [];

  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
  const nodes: ASTNode[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Handle line breaks within a paragraph
    const lines = trimmed.split('\n');
    for (let j = 0; j < lines.length; j++) {
      if (j > 0) {
        // Line break within paragraph — use rawLaTeX node for correct \\
        nodes.push(rawLaTeXNode('\\\\'));
      }
      const line = lines[j].trim();
      if (line) {
        nodes.push({ type: 'Text', content: line, escaped } as ASTNode);
      }
    }
    nodes.push({ type: 'BlankLine' } as ASTNode);
  }

  return nodes;
}

/**
 * Check if a node is a major section boundary.
 */
function isMajorSection(node: ASTNode): boolean {
  if (node.type === 'Comment') {
    return (node as CommentNode).content.includes('===') ||
           (node as CommentNode).content.includes('---');
  }
  if (node.type === 'Environment') {
    const envName = (node as EnvironmentNode).envName;
    return ['document', 'titlepage', 'thebibliography', 'abstract', 'dedication'].includes(envName);
  }
  if (node.type === 'Command') {
    const cmdName = (node as CommandNode).name;
    return ['frontmatter', 'mainmatter', 'backmatter', 'appendix', 'tableofcontents',
            'listoffigures', 'listoftables', 'maketitle', 'begin'].includes(cmdName);
  }
  if (node.type === 'NewPage') {
    return true;
  }
  return false;
}

/**
 * Re-export escapeLatexBody for backward compatibility.
 */
export { escapeLatexBody as escapeLatex };
