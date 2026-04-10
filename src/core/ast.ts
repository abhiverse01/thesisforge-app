// ============================================================
// ThesisForge Core — LaTeX Abstract Syntax Tree (AST)
// Do NOT build LaTeX by string concatenation. Build an AST, then serialize.
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
  | 'DocumentClass';

export interface ASTNode {
  type: ASTNodeType;
  children?: ASTNode[];
}

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
  options?: string[];    // [opt1, opt2]
  args?: (string | ASTNode)[];  // {arg1} {arg2}
  star?: boolean;        // \command*
}

export interface EnvironmentNode extends ASTNode {
  type: 'Environment';
  envName: string;
  options?: string[];
  children: ASTNode[];
}

export interface TextNode extends ASTNode {
  type: 'Text';
  content: string;
  escaped?: boolean;  // If true, content is already LaTeX-escaped
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
  definition: string;  // The LaTeX command body
  options?: string[];
}

// ============================================================
// AST Node Factory Functions
// ============================================================

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
  options?: string[]
): EnvironmentNode {
  return { type: 'Environment', envName, children, options };
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
