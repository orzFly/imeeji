import type { ImageRef } from "./types.ts";

const FULL_PATTERN =
  /(?<registry>[a-z0-9][a-z0-9.-]*\.[a-z]{2,})\/(?<repo>[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*):(?<tag>[a-zA-Z0-9._-]+)/gi;

const SHORTHAND_PATTERN =
  /(?:^|\s)image:\s+(?<quote>["'])?(?<imageMatch>(?<repo>[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)?)(?::(?<tag>[a-zA-Z0-9._-]+))?)(\k<quote>)?/i;

const FROM_PATTERN =
  /^\s*FROM\s+(?:--platform=[^\s]+\s+)?(?<imageMatch>(?<repo>[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)?)(?::(?<tag>[a-zA-Z0-9._-]+))?)(?:\s+AS\s+[^\s]+)?\s*$/i;

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("#") ||
    trimmed.startsWith(";") ||
    trimmed.startsWith("//");
}

function normalizeShorthandRepo(repo: string): {
  registry: string;
  repository: string;
} {
  if (repo.includes("/")) {
    return { registry: "docker.io", repository: repo };
  }
  return { registry: "docker.io", repository: `library/${repo}` };
}

export function findImages(
  content: string,
  filePath: string,
  allowComments = false,
): ImageRef[] {
  const images: ImageRef[] = [];
  const lines = content.split("\n");

  let lineOffset = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;

    if (!allowComments && isCommentLine(line)) {
      lineOffset += line.length + 1;
      continue;
    }

    FULL_PATTERN.lastIndex = 0;
    const fullMatch = FULL_PATTERN.exec(line);

    if (fullMatch) {
      const registry = fullMatch.groups?.registry ?? "";
      const repository = fullMatch.groups?.repo ?? "";
      const tag = fullMatch.groups?.tag ?? "";
      const fullText = fullMatch[0];
      const matchStartInLine = fullMatch.index ?? 0;

      const startIndex = lineOffset + matchStartInLine;
      const endIndex = startIndex + fullText.length;
      const column = matchStartInLine + 1;

      images.push({
        full: fullText,
        registry,
        repository,
        tag,
        line: lineNum,
        column,
        startIndex,
        endIndex,
        matchedLength: fullText.length,
        escaper: (t) => `${registry}/${repository}:${t}`,
        filePath,
      });
    } else {
      const fromMatch = FROM_PATTERN.exec(line);

      if (fromMatch) {
        const imageMatch = fromMatch.groups?.imageMatch ?? "";
        const originalRepo = fromMatch.groups?.repo ?? "";
        const capturedTag = fromMatch.groups?.tag;
        const hasExplicitTag = capturedTag !== undefined;
        const tag = capturedTag ?? "latest";

        if (originalRepo.toLowerCase() === "scratch") {
          lineOffset += line.length + 1;
          continue;
        }

        const { registry, repository } = normalizeShorthandRepo(originalRepo);

        const matchStartInLine = fromMatch.index ?? 0;
        const imageMatchStart = fromMatch[0].indexOf(imageMatch);

        const startIndex = lineOffset + matchStartInLine + imageMatchStart;
        const matchedLength = imageMatch.length;
        const full = imageMatch;

        const endIndex = startIndex + matchedLength;
        const column = (startIndex - lineOffset) + 1;

        images.push({
          full,
          registry,
          repository,
          tag,
          line: lineNum,
          column,
          startIndex,
          endIndex,
          matchedLength,
          hasExplicitTag,
          escaper: (t) => `${originalRepo}:${t}`,
          filePath,
        });
      } else {
        const shorthandMatch = SHORTHAND_PATTERN.exec(line);

        if (shorthandMatch) {
          const quote = shorthandMatch.groups?.quote ?? "";
          const imageMatch = shorthandMatch.groups?.imageMatch ?? "";
          const originalRepo = shorthandMatch.groups?.repo ?? "";
          const capturedTag = shorthandMatch.groups?.tag;
          const hasExplicitTag = capturedTag !== undefined;
          const tag = capturedTag ?? "latest";

          const { registry, repository } = normalizeShorthandRepo(originalRepo);

          const matchStartInLine = shorthandMatch.index ?? 0;
          const imageMatchStart = shorthandMatch[0].indexOf(imageMatch);

          let startIndex: number;
          let matchedLength: number;
          let full: string;

          if (quote) {
            startIndex = lineOffset + matchStartInLine + imageMatchStart - 1;
            matchedLength = imageMatch.length + 2;
            full = `${quote}${imageMatch}${quote}`;
          } else {
            startIndex = lineOffset + matchStartInLine + imageMatchStart;
            matchedLength = imageMatch.length;
            full = imageMatch;
          }

          const endIndex = startIndex + matchedLength;
          const column = (startIndex - lineOffset) + 1;

          images.push({
            full,
            registry,
            repository,
            tag,
            line: lineNum,
            column,
            startIndex,
            endIndex,
            matchedLength,
            hasExplicitTag,
            escaper: (t) => `${quote}${originalRepo}:${t}${quote}`,
            filePath,
          });
        }
      }
    }

    lineOffset += line.length + 1;
  }

  return images;
}
