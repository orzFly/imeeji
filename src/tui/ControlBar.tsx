import { Box, Text } from "ink";
import { useTerminalSize } from "./useTerminalSize.ts";

interface Shortcut {
  key: string;
  label: string;
}

interface ControlBarProps {
  shortcuts: Shortcut[];
}

export function ControlBar({ shortcuts }: ControlBarProps) {
  const { columns } = useTerminalSize();

  const itemsPerRow = Math.max(1, Math.floor(shortcuts.length / 2) + (shortcuts.length % 2));
  const row1 = shortcuts.slice(0, itemsPerRow);
  const row2 = shortcuts.slice(itemsPerRow);

  const cellWidth = Math.floor(columns / itemsPerRow);

  const renderCell = (shortcut: Shortcut) => {
    const content = `${shortcut.key} ${shortcut.label}`;
    const paddedContent = content.padEnd(cellWidth);
    return (
      <Text key={shortcut.key}>
        <Text inverse>{shortcut.key}</Text>
        <Text>{paddedContent.slice(shortcut.key.length)}</Text>
      </Text>
    );
  };

  return (
    <Box flexDirection="column">
      <Box>{row1.map(renderCell)}</Box>
      {row2.length > 0 && <Box>{row2.map(renderCell)}</Box>}
    </Box>
  );
}
