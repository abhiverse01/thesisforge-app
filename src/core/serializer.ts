// ============================================================
// ThesisForge Core — AST Serializer
// Converts AST nodes to LaTeX string output.
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
} from './ast';
import { escapeLatex } from '@/utils/latex-escape';

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
      return escapeLatex(t.content);
    }

    case 'Comment': {
      const c = node as CommentNode;
      return `% ${c.content}`;
    }

    case 'BlankLine': {
      return '';
    }

    case 'MacroDef': {
      const m = node as MacroDefNode;
      const opts = m.options && m.options.length > 0 ? `[${m.options.join(', ')}]` : '';
      return `\\newcommand${opts}{${m.name}}{${m.definition}}`;
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
        nodes.push(command('\\\\'));
      }
      const line = lines[j].trim();
      if (line) {
        nodes.push(text(line, escaped));
      }
    }
    nodes.push(blankLine());
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
            'listoffigures', 'listoftables', 'maketitle'].includes(cmdName);
  }
  return false;
}

/**
 * Escape LaTeX special characters in a string (for use outside AST context).
 */
export { escapeLatex };
