import type { ImageRef } from "./types.ts";

const IMAGE_PATTERN =
  /(?<registry>[a-z0-9][a-z0-9.-]*\.[a-z]{2,})\/(?<repo>[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*):(?<tag>[a-zA-Z0-9._-]+)/gi;

export function findImages(content: string, filePath: string): ImageRef[] {
  const images: ImageRef[] = [];

  for (const match of content.matchAll(IMAGE_PATTERN)) {
    const fullMatch = match[0];
    const registry = match.groups?.registry ?? "";
    const repository = match.groups?.repo ?? "";
    const tag = match.groups?.tag ?? "";

    const startIndex = match.index ?? 0;

    let lineNum = 1;
    let lineStart = 0;
    for (let i = 0; i < startIndex; i++) {
      if (content[i] === "\n") {
        lineNum++;
        lineStart = i + 1;
      }
    }
    const column = startIndex - lineStart + 1;

    images.push({
      full: fullMatch,
      registry,
      repository,
      tag,
      line: lineNum,
      column,
      startIndex,
      endIndex: startIndex + fullMatch.length,
      filePath,
    });
  }

  return images;
}

export function applyUpdates(content: string, updates: ImageRef[]): string {
  const sorted = [...updates].sort((a, b) => b.startIndex - a.startIndex);

  let result = content;
  for (const update of sorted) {
    result = result.slice(0, update.startIndex) +
      update.full +
      result.slice(update.endIndex);
  }
  return result;
}
