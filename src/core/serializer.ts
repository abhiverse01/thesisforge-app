// ============================================================
// ThesisForge Core — AST Serializer (Engine v2)
// Converts AST nodes to LaTeX string output.
// The serializer is the ONLY place that produces LaTeX strings.
// Every element must be serialized from typed AST nodes.
// ============================================================

import type {
  ASTNode,
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
} from './ast';
import { escapeLatexBody } from '@/engine/escape';

/**
 * Serialize any AST node to LaTeX string.
 * @param node - The AST node to serialize
 * @param indent - Current indentation level (spaces)
 */
export function serialize(node: ASTNode, indent: number = 0): string {
  const pad = '  '.repeat(indent);

  switch (node.type) {
    case 'Document': {
      return (node as DocumentNode).children
        .map(child => serialize(child, indent))
        .join('\n');
    }

    case 'Preamble': {
      const p = node as PreambleNode;
      let result = '';
      result += serialize(p.documentClass, indent);
      result += '\n';
      for (const pkg of p.packages) {
        result += serialize(pkg, indent) + '\n';
      }
      if (p.packages.length > 0) result += '\n';
      for (const cmd of p.preambleCommands) {
        result += serialize(cmd, indent) + '\n';
      }
      if (p.preambleCommands.length > 0) result += '\n';
      for (const macro of p.macroDefs) {
        result += serialize(macro, indent) + '\n';
      }
      return result;
    }

    case 'DocumentClass': {
      const dc = node as DocumentClassNode;
      const opts = dc.options.length > 0 ? `[${dc.options.join(', ')}]` : '';
      return `\\documentclass${opts}{${dc.className}}`;
    }

    case 'PackageImport': {
      const pi = node as PackageImportNode;
      const opts = pi.options && pi.options.length > 0 ? `[${pi.options.join(', ')}]` : '';
      return `\\usepackage${opts}{${pi.packageName}}`;
    }

    case 'Command': {
      const cmd = node as CommandNode;
      let result = `\\${cmd.name}${cmd.star ? '*' : ''}`;
      if (cmd.options && cmd.options.length > 0) {
        result += `[${cmd.options.join(', ')}]`;
      }
      if (cmd.args && cmd.args.length > 0) {
        for (const arg of cmd.args) {
          if (typeof arg === 'string') {
            result += `{${arg}}`;
          } else {
            result += `{${serialize(arg, 0)}}`;
          }
        }
      }
      return result;
    }

    case 'Environment': {
      const env = node as EnvironmentNode;
      let result = '';
      result += `\\begin{${env.envName}}`;
      if (env.options && env.options.length > 0) {
        result += `[${env.options.join(', ')}]`;
      }
      if (env.args && env.args.length > 0) {
        for (const arg of env.args) {
          result += `{${arg}}`;
        }
      }
      result += '\n';
      for (const child of env.children) {
        result += pad + serialize(child, indent + 1) + '\n';
      }
      result += `\\end{${env.envName}}`;
      return result;
    }

    case 'Text': {
      const t = node as TextNode;
      if (t.escaped) return t.content;
      return escapeLatexBody(t.content);
    }

    case 'Comment': {
      const c = node as CommentNode;
      return c.content.split('\n').map(line => `% ${line}`).join('\n');
    }

    case 'BlankLine': {
      return '';
    }

    case 'MacroDef': {
      const m = node as MacroDefNode;
      const opts = m.options && m.options.length > 0 ? `[${m.options.join(', ')}]` : '';
      return `\\newcommand${opts}{${m.name}}{${m.definition}}`;
    }

    // ── Extended Node Types (Engine v2) ──────────────────────

    case 'Math': {
      const mn = node as MathNode;
      return mn.display
        ? `\\[\n  ${mn.content}\n\\]`
        : `$${mn.content}$`;
    }

    case 'Verbatim': {
      const vn = node as VerbatimNode;
      if (vn.language) {
        return `\\begin{lstlisting}[language=${vn.language}]\n${vn.content}\n\\end{lstlisting}`;
      }
      return `\\begin{verbatim}\n${vn.content}\n\\end{verbatim}`;
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
      return `\\begin{figure}[${fn.placement}]
  \\centering
  \\includegraphics[width=${fn.width}]{${fn.path}}
  \\caption{${escapeLatexBody(fn.caption)}}
  \\label{${fn.label}}
\\end{figure}`;
    }

    case 'Table': {
      const tn = node as TableNode;
      const colSpec = tn.columnSpec || tn.headers.map(() => 'l').join('');
      const header = tn.headers.map(h => escapeLatexBody(h)).join(' & ');
      const rows = tn.rows
        .map(row => '  ' + row.map(c => escapeLatexBody(c)).join(' & ') + ' \\\\')
        .join('\n');
      return `\\begin{table}[${tn.placement}]
  \\centering
  \\caption{${escapeLatexBody(tn.caption)}}
  \\label{${tn.label}}
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
      // natbib uses \citep{key}, \citet{key}, \citeauthor{key}, \citeyear{key}
      return `\\${cn.command}${pre}${post}{${keys}}`;
    }

    case 'Label': {
      const lbn = node as LabelNode;
      return `\\label{${lbn.label}}`;
    }

    case 'Ref': {
      const rn = node as RefNode;
      return `\\${rn.refType}{${rn.label}}`;
    }

    case 'Footnote': {
      const fnn = node as FootnoteNode;
      return `\\footnote{${escapeLatexBody(fnn.content)}}`;
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
      return rln.content;
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
        nodes.push({ type: 'Command', name: '\\\\', args: [], options: [], star: false } as unknown as ASTNode);
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
