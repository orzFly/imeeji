import { Box, Text, useInput, Key } from "ink";
import type { ImageUpdate } from "../types.ts";
import { useListNav } from "./useListNav.ts";

interface UpdateListProps {
  updates: ImageUpdate[];
  selected: Set<number>;
  overrides: Map<number, string>;
  cursor: number;
  onCursorChange: (idx: number) => void;
  onToggle: (idx: number) => void;
  onEdit: (idx: number) => void;
  onViewContext: (idx: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onConfirm: () => void;
  onQuit: () => void;
}

function formatImageName(image: { registry: string; repository: string }): string {
  return `${image.registry}/${image.repository}`;
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}

export function UpdateList({
  updates,
  selected,
  overrides,
  cursor,
  onCursorChange,
  onToggle,
  onEdit,
  onViewContext,
  onSelectAll,
  onSelectNone,
  onConfirm,
  onQuit,
}: UpdateListProps) {
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

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>imeeji — Interactive Upgrade</Text>
      </Box>

      {updates.map((u, idx) => {
        const isSelected = selected.has(idx);
        const isHighlighted = idx === cursor;
        const displayTag = overrides.get(idx) ?? u.newTag;
        const location = `${u.image.repository.split("/").pop()}:${u.image.line}`;

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
                <Text dimColor>{truncate(u.currentTag, 15)}</Text>
                <Text dimColor> → </Text>
                <Text color="green">{truncate(displayTag, 15)}</Text>
              </Box>
            </Box>
          </Box>
        );
      })}

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
