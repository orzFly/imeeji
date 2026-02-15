import { Box, Text, useInput } from "ink";
import type { Key } from "ink";
import type { ImageUpdate } from "../types.ts";
import { useViewport } from "./useViewport.ts";
import { useTerminalHeight } from "./useTerminalHeight.ts";
import { formatVariantLabel } from "./format.ts";

interface TagPickerProps {
  update: ImageUpdate;
  activeVariantIdx: number;
  onSelect: (tag: string) => void;
  onBack: () => void;
  onChangeVariant: () => void;
}

export function TagPicker({
  update,
  activeVariantIdx,
  onSelect,
  onBack,
  onChangeVariant,
}: TagPickerProps) {
  const variant = update.variants[activeVariantIdx];
  const tags: string[] = [];

  if (variant.latest) {
    tags.push(variant.latest.original);
  }

  for (const t of variant.older.slice(0, 19)) {
    tags.push(t.original);
  }

  const rows = useTerminalHeight();
  const viewportHeight = Math.max(1, rows - 6);
  const { cursor, visibleRange, moveUp, moveDown } = useViewport({
    itemCount: tags.length,
    viewportHeight,
  });

  useInput((_input: string, key: Key) => {
    if (key.upArrow) {
      moveUp();
    } else if (key.downArrow) {
      moveDown();
    } else if (key.escape) {
      onBack();
    } else if (key.return) {
      if (tags[cursor]) {
        onSelect(tags[cursor]);
      }
    } else if (key.tab && update.variants.length > 1) {
      onChangeVariant();
    }
  });

  const visibleTags = tags.slice(visibleRange.start, visibleRange.end);
  const aboveCount = visibleRange.start;
  const belowCount = tags.length - visibleRange.end;

  return (
    <Box flexDirection="column" height={rows} overflow="hidden">
      <Box marginBottom={1}>
        <Text bold>Select version for {update.image.registry}/{update.image.repository}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Current: {update.currentTag} | Variant: {formatVariantLabel(variant)}</Text>
      </Box>

      {aboveCount > 0 && (
        <Box>
          <Text dimColor>↑ {aboveCount} more above</Text>
        </Box>
      )}

      {visibleTags.map((tag, relIdx) => {
        const idx = visibleRange.start + relIdx;
        const isHighlighted = idx === cursor;
        const isCurrent = tag === update.currentTag;

        return (
          <Box key={tag}>
            <Text
              color={isHighlighted ? "cyan" : undefined}
              bold={isHighlighted}
            >
              {isHighlighted ? "> " : "  "}
              {tag}
              {isCurrent ? "*" : ""}
              {idx === 0 && variant.latest && tag === variant.latest.original
                ? " (latest)"
                : ""}
            </Text>
          </Box>
        );
      })}

      {belowCount > 0 && (
        <Box>
          <Text dimColor>↓ {belowCount} more below</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          [Esc] Back [Enter] Select
          {update.variants.length > 1 ? " [Tab] Change Variant" : ""}
        </Text>
      </Box>
    </Box>
  );
}
