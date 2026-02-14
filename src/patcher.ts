import type { ImageRef } from "./types.ts";

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export function generateDiff(
  filePath: string,
  originalContent: string,
  updates: ImageRef[],
): string {
  if (updates.length === 0) {
    return "";
  }

  const originalLines = originalContent.split("\n");
  const sortedUpdates = [...updates].sort((a, b) => a.line - b.line);

  const hunks: DiffHunk[] = [];
  const contextLines = 3;

  let lineIdx = 0;

  const newLines: string[] = [];

  while (lineIdx < originalLines.length) {
    const lineNum = lineIdx + 1;
    const line = originalLines[lineIdx];

    const update = sortedUpdates.find((u) => u.line === lineNum);

    if (update) {
      const originalFull = update.originalFull ?? update.full;
      const newImageRef =
        `${update.registry}/${update.repository}:${update.tag}`;
      newLines.push(line.replace(originalFull, newImageRef));
    } else {
      newLines.push(line);
    }

    lineIdx++;
  }

  const changedLineNumbers = new Set(updates.map((u) => u.line));

  let i = 0;
  while (i < originalLines.length) {
    const lineNum = i + 1;

    if (changedLineNumbers.has(lineNum)) {
      const changeStart = Math.max(0, i - contextLines);
      let changeEnd = i + contextLines + 1;

      for (let j = i + 1; j < Math.min(originalLines.length, changeEnd); j++) {
        if (changedLineNumbers.has(j + 1)) {
          changeEnd = j + contextLines + 1;
        }
      }
      changeEnd = Math.min(originalLines.length, changeEnd);

      const hunkLines: string[] = [];

      for (let j = changeStart; j < changeEnd; j++) {
        const ln = j + 1;
        const oldLine = originalLines[j];
        const newLine = newLines[j];

        if (changedLineNumbers.has(ln)) {
          hunkLines.push(`-${oldLine}`);
          hunkLines.push(`+${newLine}`);
        } else {
          hunkLines.push(` ${oldLine}`);
        }
      }

      hunks.push({
        oldStart: changeStart + 1,
        oldLines: changeEnd - changeStart,
        newStart: changeStart + 1,
        newLines: changeEnd - changeStart,
        lines: hunkLines,
      });

      i = changeEnd;
    } else {
      i++;
    }
  }

  const header = `--- a/${filePath}\n+++ b/${filePath}\n`;

  const hunkTexts = hunks.map((h) => {
    return `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@\n${
      h.lines.join("\n")
    }`;
  });

  return header + hunkTexts.join("\n") + "\n";
}

export function applyUpdates(
  originalContent: string,
  updates: ImageRef[],
): string {
  const originalLines = originalContent.split("\n");

  const newLines = originalLines.map((line, idx) => {
    const lineNum = idx + 1;
    const update = updates.find((u) => u.line === lineNum);

    if (update) {
      const originalFull = update.originalFull ?? update.full;
      const newImageRef =
        `${update.registry}/${update.repository}:${update.tag}`;
      return line.replace(originalFull, newImageRef);
    }

    return line;
  });

  return newLines.join("\n");
}
