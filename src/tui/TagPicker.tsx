import { Box, Text, useInput } from "ink";
import type { Key } from "ink";
import type { ImageUpdate } from "../types.ts";
import { useViewport } from "./useViewport.ts";
import { useTerminalSize } from "./useTerminalSize.ts";
import { TitleBar } from "./TitleBar.tsx";
import { ControlBar } from "./ControlBar.tsx";
import { formatVariantLabel } from "./format.ts";
import { getTagUrl } from "./tagUrl.ts";
import { Link } from "./Link.tsx";

interface TagItem {
  tag: string;
  isFloating: boolean;
  floatingMatch?: string;
}

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
  const items: TagItem[] = [];

  if (variant.latest) {
    const floatingMatch = variant.digestMatches?.get(variant.latest.original);
    items.push({
      tag: variant.latest.original,
      isFloating: false,
      floatingMatch,
    });
  }

  for (const t of variant.older.slice(0, 19)) {
    const floatingMatch = variant.digestMatches?.get(t.original);
    items.push({ tag: t.original, isFloating: false, floatingMatch });
  }

  const floatingCount = variant.floating.length;
  const floatingStartIdx = items.length;
  for (const t of variant.floating) {
    items.push({ tag: t.original, isFloating: true });
  }

  const changelog = update.lsioMetadata?.changelog ?? [];
  const changelogLines = changelog.length;

  const { rows } = useTerminalSize();
  const viewportHeight = Math.max(1, rows - 8 - changelogLines * 2);
  const {
    cursor,
    visibleRange,
    moveUp,
    moveDown,
    movePageUp,
    movePageDown,
    moveHome,
    moveEnd,
  } = useViewport({
    itemCount: items.length,
    viewportHeight,
  });

  useInput((_input: string, key: Key) => {
    if (key.upArrow) {
      moveUp();
    } else if (key.downArrow) {
      moveDown();
    } else if (key.pageUp) {
      movePageUp();
    } else if (key.pageDown) {
      movePageDown();
    } else if (key.home) {
      moveHome();
    } else if (key.end) {
      moveEnd();
    } else if (key.escape) {
      onBack();
    } else if (key.return) {
      if (items[cursor]) {
        onSelect(items[cursor].tag);
      }
    } else if (key.tab && update.variants.length > 1) {
      onChangeVariant();
    }
  });

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const aboveCount = visibleRange.start;
  const belowCount = items.length - visibleRange.end;

  const imageName = `${update.image.registry}/${update.image.repository}`;

  const shortcuts = [
    { key: "ESC", label: "Back" },
    { key: "RET", label: "Select" },
    ...(update.variants.length > 1
      ? [{ key: "TAB", label: "Change Variant" }]
      : []),
  ];

  return (
    <Box flexDirection="column" height={rows} overflow="hidden">
      <Box marginBottom={1}>
        <TitleBar title="Select Version" subtitle={imageName} />
      </Box>
      <Box marginBottom={1}>
        <Text dimColor wrap="truncate">
          Current: {update.currentTag} | Variant: {formatVariantLabel(variant)}
        </Text>
      </Box>

      {changelog.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text bold>Recent Changes:</Text>
          {changelog.map((entry, idx) => (
            <Box key={idx}>
              <Text dimColor wrap="truncate">{entry.date}:</Text>
              <Text wrap="truncate">
                {entry.description.slice(0, 60)}
                {entry.description.length > 60 ? "..." : ""}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {aboveCount > 0 && (
        <Box>
          <Text dimColor>↑ {aboveCount} more above</Text>
        </Box>
      )}

      {visibleItems.map((item, relIdx) => {
        const idx = visibleRange.start + relIdx;
        const isHighlighted = idx === cursor;
        const isCurrent = item.tag === update.currentTag;
        const tagUrl = getTagUrl(
          update.image.registry,
          update.image.repository,
          item.tag,
        );

        if (item.isFloating && idx === floatingStartIdx && floatingCount > 0) {
          return (
            <Box key={item.tag} flexDirection="column">
              <Box>
                <Text dimColor wrap="truncate">── Floating tags ──</Text>
              </Box>
              <Box key={item.tag}>
                <Text
                  color={isHighlighted ? "cyan" : undefined}
                  bold={isHighlighted}
                  wrap="truncate"
                >
                  {isHighlighted ? "> " : "  "}
                </Text>
                <Link
                  url={tagUrl}
                  color={isHighlighted ? "cyan" : "gray"}
                  bold={isHighlighted}
                >
                  {item.tag}
                </Link>
                <Text color={isHighlighted ? "cyan" : undefined} wrap="truncate">
                  {isCurrent ? "*" : ""}
                </Text>
              </Box>
            </Box>
          );
        }

        let suffix = "";
        if (isCurrent) suffix += "*";
        if (item.floatingMatch) suffix += ` (${item.floatingMatch})`;
        else if (
          idx === 0 && variant.latest && item.tag === variant.latest.original &&
          !item.isFloating
        ) {
          suffix += " (latest)";
        }

        return (
          <Box key={item.tag}>
            <Text
              color={isHighlighted ? "cyan" : undefined}
              bold={isHighlighted}
              wrap="truncate"
            >
              {isHighlighted ? "> " : "  "}
            </Text>
            <Link
              url={tagUrl}
              color={isHighlighted
                ? "cyan"
                : item.isFloating
                ? "gray"
                : undefined}
              bold={isHighlighted}
            >
              {item.tag}
            </Link>
            <Text
              color={isHighlighted ? "cyan" : "gray"}
              dimColor={!isHighlighted}
              wrap="truncate"
            >
              {suffix}
            </Text>
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
