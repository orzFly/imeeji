import { Box, Text, useInput } from "ink";
import type { Key } from "ink";
import { useTerminalSize } from "./useTerminalSize.ts";
import { TitleBar } from "./TitleBar.tsx";
import { ControlBar } from "./ControlBar.tsx";

interface ContextViewerProps {
  filePath: string;
  fileContent: string;
  line: number;
  onClose: () => void;
}

export function ContextViewer({
  filePath,
  fileContent,
  line,
  onClose,
}: ContextViewerProps) {
  const { rows } = useTerminalSize();
  const halfWindow = Math.max(1, Math.floor((rows - 6) / 2));

  useInput((_input: string, key: Key) => {
    if (key.escape) {
      onClose();
    }
  });

  const lines = fileContent.split("\n");
  const startLine = Math.max(1, line - halfWindow);
  const endLine = Math.min(lines.length, line + halfWindow);

  const contextLines: { num: number; content: string; isTarget: boolean }[] = [];

  for (let i = startLine; i <= endLine; i++) {
    contextLines.push({
      num: i,
      content: lines[i - 1] ?? "",
      isTarget: i === line,
    });
  }

  const maxLineNum = Math.max(...contextLines.map((l) => l.num));
  const lineNumWidth = String(maxLineNum).length;

  const shortcuts = [
    { key: "ESC", label: "Close" },
  ];

  return (
    <Box flexDirection="column" height={rows} overflow="hidden">
      <Box marginBottom={1}>
        <TitleBar title="File Context" subtitle={filePath} />
      </Box>

      <Box flexDirection="column">
        {contextLines.map((l) => (
          <Box key={l.num}>
            <Text
              dimColor={!l.isTarget}
              bold={l.isTarget}
              color={l.isTarget ? "yellow" : undefined}
            >
              {l.isTarget ? ">" : " "}
              {String(l.num).padStart(lineNumWidth)} | {l.content}
            </Text>
          </Box>
        ))}
      </Box>

      <Box flexGrow={1} justifyContent="flex-end" flexDirection="column">
        <ControlBar shortcuts={shortcuts} />
      </Box>
    </Box>
  );
}
