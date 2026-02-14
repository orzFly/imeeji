export interface ImageRef {
  full: string;
  registry: string;
  repository: string;
  tag: string;
  line: number;
  column: number;
  startIndex: number;
  endIndex: number;
  originalFull?: string;
}

export interface ParsedTag {
  original: string;
  prefix: string;
  version: string;
  suffix: string;
  semver: boolean;
  isFloating: boolean;
}

export interface VariantGroup {
  suffix: string;
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
}
