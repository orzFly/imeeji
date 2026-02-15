import { Box, Text, useInput, Key } from "ink";
import type { ImageUpdate, VariantGroup } from "../types.ts";
import { useListNav } from "./useListNav.ts";

interface TagPickerProps {
  update: ImageUpdate;
  activeVariantIdx: number;
  onSelect: (tag: string) => void;
  onBack: () => void;
  onChangeVariant: () => void;
}

function formatVariantLabel(variant: VariantGroup): string {
  if (variant.suffix === "") return "(default)";
  return variant.suffix;
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

  const { cursor } = useListNav(tags.length);

  useInput((_input: string, key: Key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.return) {
      if (tags[cursor]) {
        onSelect(tags[cursor]);
      }
      return;
    }
    if (key.tab && update.variants.length > 1) {
      onChangeVariant();
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Select version for {update.image.registry}/{update.image.repository}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Current: {update.currentTag} | Variant: {formatVariantLabel(variant)}</Text>
      </Box>

      {tags.map((tag, idx) => {
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

      <Box marginTop={1}>
        <Text dimColor>
          [Esc] Back [Enter] Select
          {update.variants.length > 1 ? " [Tab] Change Variant" : ""}
        </Text>
      </Box>
    </Box>
  );
}
