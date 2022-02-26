import {AtRule, Declaration, Parser, Plugin, Rule} from 'postcss';

type PatternItem =
  | ((node: Declaration | Rule | AtRule, value: string) => boolean)
  | RegExp
  | string;

type Pattern = PatternItem | PatternItem[];

export interface Options {
  atrule?: Pattern;
  rule?: Pattern;
  decl?: Pattern;
  css?: Parameters<Parser>[0];
}

declare const postcssDiscard: (options?: Options) => Plugin;

export default postcssDiscard;
