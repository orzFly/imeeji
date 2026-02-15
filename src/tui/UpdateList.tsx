import { Box, Text, useInput } from "ink";
import type { Key } from "ink";
import { useState, useEffect } from "react";
import type { ImageUpdate } from "../types.ts";
import { useTerminalHeight } from "./useTerminalHeight.ts";
import { formatImageName, truncate } from "./format.ts";

interface UpdateListProps {
  updates: ImageUpdate[];
  selected: Set<number>;
  overrides: Map<number, string>;
  cursor: number;
  filePath: string;
  onCursorChange: (idx: number) => void;
  onToggle: (idx: number) => void;
  onEdit: (idx: number) => void;
  onViewContext: (idx: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onConfirm: () => void;
  onQuit: () => void;
}

export function UpdateList({
  updates,
  selected,
  overrides,
  cursor,
  filePath,
  onCursorChange,
  onToggle,
  onEdit,
  onViewContext,
  onSelectAll,
  onSelectNone,
  onConfirm,
  onQuit,
}: UpdateListProps) {
  const rows = useTerminalHeight();
  const viewportItems = Math.max(1, Math.floor((rows - 6) / 3));
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (cursor < scrollOffset) {
      setScrollOffset(cursor);
    } else if (cursor >= scrollOffset + viewportItems) {
      setScrollOffset(cursor - viewportItems + 1);
    }
  }, [cursor, viewportItems]);

  useInput((input: string, key: Key) => {
    if (key.upArrow) {
      onCursorChange(cursor > 0 ? cursor - 1 : updates.length - 1);
    } else if (key.downArrow) {
      onCursorChange(cursor < updates.length - 1 ? cursor + 1 : 0);
    } else if (input === " ") {
      onToggle(cursor);
    } else if (key.return) {
      onEdit(cursor);
    } else if (input.toLowerCase() === "a") {
      onSelectAll();
    } else if (input.toLowerCase() === "n") {
      onSelectNone();
    } else if (input.toLowerCase() === "v") {
      onViewContext(cursor);
    } else if (input.toLowerCase() === "c") {
      onConfirm();
    } else if (input.toLowerCase() === "q") {
      onQuit();
    }
  });

  const nameWidth = Math.max(
    ...updates.map((u) => formatImageName(u.image).length),
    30,
  );

  const visibleUpdates = updates.slice(scrollOffset, scrollOffset + viewportItems);
  const aboveCount = scrollOffset;
  const belowCount = Math.max(0, updates.length - scrollOffset - viewportItems);

  return (
    <Box flexDirection="column" height={rows} overflow="hidden">
      <Box marginBottom={1}>
        <Text bold>imeeji — Interactive Upgrade</Text>
      </Box>

      {aboveCount > 0 && (
        <Box>
          <Text dimColor>↑ {aboveCount} more above</Text>
        </Box>
      )}

      {visibleUpdates.map((u, relIdx) => {
        const idx = scrollOffset + relIdx;
        const isSelected = selected.has(idx);
        const isHighlighted = idx === cursor;
        const displayTag = overrides.get(idx) ?? u.newTag;
        const location = `${filePath}:${u.image.line}`;

        return (
          <Box key={idx} marginBottom={1}>
            <Box width={nameWidth + 10} flexDirection="column">
              <Box>
                <Text
                  color={isHighlighted ? "cyan" : undefined}
                  bold={isHighlighted}
                >
                  {isHighlighted ? "> " : "  "}
                  [{isSelected ? "x" : " "}] {idx + 1}.{" "}
                  {truncate(formatImageName(u.image), nameWidth)}
                </Text>
                <Text dimColor> {location}</Text>
              </Box>
              <Box marginLeft={4}>
                <Text dimColor>{truncate(u.currentTag, 20)}</Text>
                <Text dimColor> → </Text>
                <Text color="green">{truncate(displayTag, 20)}</Text>
              </Box>
            </Box>
          </Box>
        );
      })}

      {belowCount > 0 && (
        <Box>
          <Text dimColor>↓ {belowCount} more below</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Controls:</Text>
        <Text dimColor>
          [Space] Toggle [Enter] Edit Version [A] Select All [N] Select None
        </Text>
        <Text dimColor>
          [V] View Context [C] Confirm & Apply [Q] Quit
        </Text>
      </Box>
    </Box>
  );
}
