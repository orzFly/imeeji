import { Box, Text, useInput, Key } from "ink";
import type { ImageUpdate } from "../types.ts";
import { useListNav } from "./useListNav.ts";

interface UpdateListProps {
  updates: ImageUpdate[];
  selected: Set<number>;
  overrides: Map<number, string>;
  onEdit: (idx: number) => void;
  onViewContext: (idx: number) => void;
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
  onEdit,
  onViewContext,
  onConfirm,
  onQuit,
}: UpdateListProps) {
  const { cursor } = useListNav(updates.length);

  useInput((input: string, key: Key) => {
    if (input === " ") {
      return;
    }
    if (key.return) {
      onEdit(cursor);
      return;
    }
    if (input.toLowerCase() === "a") {
      return;
    }
    if (input.toLowerCase() === "n") {
      return;
    }
    if (input.toLowerCase() === "v") {
      onViewContext(cursor);
      return;
    }
    if (input.toLowerCase() === "c") {
      onConfirm();
      return;
    }
    if (input.toLowerCase() === "q") {
      onQuit();
      return;
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

export function useUpdateListSelection(
  updates: ImageUpdate[],
  initialSelected?: Set<number>,
): {
  selected: Set<number>;
  toggle: (idx: number) => void;
  selectAll: () => void;
  selectNone: () => void;
} {
  const initial = initialSelected ?? new Set(updates.map((_, i) => i));

  const handleToggle = (idx: number): Set<number> => {
    const newSet = new Set(initial);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    return newSet;
  };

  return {
    selected: initial,
    toggle: handleToggle as (idx: number) => void,
    selectAll: () => new Set(updates.map((_, i) => i)),
    selectNone: () => new Set(),
  };
}
