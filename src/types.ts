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
}

export interface TagGroup {
  prefix: string;
  suffix: string;
  tags: ParsedTag[];
  latest: ParsedTag;
}

export interface ImageUpdate {
  image: ImageRef;
  currentTag: string;
  newTag: string;
  tagGroups: TagGroup[];
}
