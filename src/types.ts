import type { LsioImageMetadata } from "./integrations/lsio.ts";

export interface ImageRef {
  full: string;
  registry: string;
  repository: string;
  tag: string;
  line: number;
  column: number;
  startIndex: number;
  endIndex: number;
  matchedLength: number;
  originalFull?: string;
  hasExplicitTag?: boolean;
  escaper?: (tag: string) => string;
  filePath: string;
}

export interface ParsedTag {
  original: string;
  version: string[];
  variantKey: string;
  semver: boolean;
  isFloating: boolean;
}

export interface VariantGroup {
  variantKey: string;
  latest: ParsedTag | null;
  older: ParsedTag[];
  floating: ParsedTag[];
}

export interface ImageUpdate {
  image: ImageRef;
  currentTag: string;
  newTag: string;
  variants: VariantGroup[];
  currentVariant: VariantGroup | null;
  lsioMetadata?: LsioImageMetadata;
}

export interface TagFetchResult {
  tags: string[];
  digestMap?: Map<string, string>;
  foundCurrentTag?: boolean;
}
