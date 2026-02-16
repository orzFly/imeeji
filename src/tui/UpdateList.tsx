import { Box, Text, useInput } from "ink";
import type { Key } from "ink";
import { useMemo } from "react";
import type { ImageUpdate } from "../types.ts";
import { useTerminalSize } from "./useTerminalSize.ts";
import { TitleBar } from "./TitleBar.tsx";
import { ControlBar } from "./ControlBar.tsx";
import { formatImageName, truncate } from "./format.ts";
import { getTagUrl } from "./tagUrl.ts";
import { Link } from "./Link.tsx";
import { basename, relative } from "node:path";
import process from "node:process";

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

function formatFilePath(filePath: string): string {
  const cwd = process.cwd();
  const rel = relative(cwd, filePath);
  if (rel && !rel.startsWith("..")) {
    return rel;
  }
  return basename(filePath);
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
  const { rows, columns } = useTerminalSize();
  const viewportItems = Math.max(1, Math.floor((rows - 6) / 3));

  const scrollOffset = useMemo(() => {
    if (updates.length === 0) return 0;
    return Math.max(0, Math.min(cursor, updates.length - viewportItems));
  }, [cursor, updates.length, viewportItems]);

  useInput((input: string, key: Key) => {
    if (key.upArrow) {
      onCursorChange(cursor > 0 ? cursor - 1 : updates.length - 1);
    } else if (key.downArrow) {
      onCursorChange(cursor < updates.length - 1 ? cursor + 1 : 0);
    } else if (key.pageUp) {
      onCursorChange(Math.max(0, cursor - viewportItems));
    } else if (key.pageDown) {
      onCursorChange(Math.min(updates.length - 1, cursor + viewportItems));
    } else if (key.home) {
      onCursorChange(0);
    } else if (key.end) {
      onCursorChange(Math.max(0, updates.length - 1));
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

  const visibleUpdates = updates.slice(
    scrollOffset,
    scrollOffset + viewportItems,
  );
  const aboveCount = scrollOffset;
  const belowCount = Math.max(0, updates.length - scrollOffset - viewportItems);

  const shortcuts = [
    { key: "SPC", label: "Toggle" },
    { key: "RET", label: "Edit Version" },
    { key: "A", label: "Select All" },
    { key: "N", label: "Select None" },
    { key: "V", label: "View Context" },
    { key: "C", label: "Confirm" },
    { key: "Q", label: "Quit" },
  ];

  return (
    <Box flexDirection="column" height={rows} overflow="hidden">
      <Box marginBottom={1}>
        <TitleBar title="Interactive Upgrade" />
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
        const filePath = formatFilePath(u.image.filePath);
        const location = `${filePath}:${u.image.line}`;
        const prefix = isHighlighted ? "> " : "  ";
        const checkbox = `[${isSelected ? "x" : " "}] ${idx + 1}. `;
        const prefixLen = prefix.length + checkbox.length;
        const locationLen = location.length + 1;
        const imageNameMax = Math.max(20, columns - prefixLen - locationLen);
        const tagMax = Math.max(20, Math.floor((columns - 8) / 2));

        return (
          <Box key={idx} marginBottom={1} flexDirection="column">
            <Box flexGrow={1}>
              <Box flexGrow={1}>
                <Text
                  color={isHighlighted ? "cyan" : undefined}
                  bold={isHighlighted}
                  wrap="truncate"
                >
                  {prefix}
                  {checkbox}
                  {truncate(formatImageName(u.image), imageNameMax)}
                </Text>
                {u.lsioMetadata?.deprecated && (
                  <Text color="red" bold wrap="truncate">DEPRECATED</Text>
                )}
              </Box>
              <Box>
                <Text dimColor wrap="truncate">{location}</Text>
              </Box>
            </Box>
            <Box marginLeft={4}>
              <Link
                url={getTagUrl(
                  u.image.registry,
                  u.image.repository,
                  u.currentTag,
                )}
                dimColor
              >
                {truncate(u.currentTag, tagMax)}
              </Link>
              <Text dimColor wrap="truncate">→</Text>
              <Link
                url={getTagUrl(
                  u.image.registry,
                  u.image.repository,
                  displayTag,
                )}
                color="green"
              >
                {truncate(displayTag, tagMax)}
              </Link>
            </Box>
          </Box>
        );
      })}

      {belowCount > 0 && (
        <Box>
          <Text dimColor>↓ {belowCount} more below</Text>
        </Box>
      )}

      <Box flexGrow={1} justifyContent="flex-end" flexDirection="column">
        <ControlBar shortcuts={shortcuts} />
      </Box>
    </Box>
  );
}
