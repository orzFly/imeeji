import { Box, Text, useInput } from "ink";
import type { Key } from "ink";
import type { VariantGroup } from "../types.ts";
import { useViewport } from "./useViewport.ts";
import { useTerminalSize } from "./useTerminalSize.ts";
import { TitleBar } from "./TitleBar.tsx";
import { ControlBar } from "./ControlBar.tsx";
import { formatVariantLabel } from "./format.ts";

interface VariantPickerProps {
  imageName: string;
  variants: VariantGroup[];
  currentVariantIdx: number;
  onSelect: (variantIdx: number) => void;
  onCancel: () => void;
}

export function VariantPicker({
  imageName,
  variants,
  currentVariantIdx,
  onSelect,
  onCancel,
}: VariantPickerProps) {
  const { rows } = useTerminalSize();
  const viewportItems = Math.max(1, Math.floor((rows - 6) / 3));
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
    itemCount: variants.length,
    viewportHeight: viewportItems,
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
      onCancel();
    } else if (key.return) {
      onSelect(cursor);
    }
  });

  const visibleVariants = variants.slice(visibleRange.start, visibleRange.end);
  const aboveCount = visibleRange.start;
  const belowCount = variants.length - visibleRange.end;

  const shortcuts = [
    { key: "ESC", label: "Cancel" },
    { key: "RET", label: "Select Variant" },
  ];

  return (
    <Box flexDirection="column" height={rows} overflow="hidden">
      <Box marginBottom={1}>
        <TitleBar title="Select Variant" subtitle={imageName} />
      </Box>

      {aboveCount > 0 && (
        <Box>
          <Text dimColor>↑ {aboveCount} more above</Text>
        </Box>
      )}

      {visibleVariants.map((v, relIdx) => {
        const idx = visibleRange.start + relIdx;
        const isHighlighted = idx === cursor;
        const isCurrent = idx === currentVariantIdx;

        const preview: string[] = [];
        if (v.latest) {
          preview.push(v.latest.original);
        }
        for (const t of v.older.slice(0, 2)) {
          preview.push(t.original);
        }
        const previewStr = preview.join(", ") +
          (v.older.length > 2 ? " …" : "");

        const floatingTags = v.floating.slice(0, 3).map((t) => t.original);
        const floatingStr = floatingTags.join(", ") +
          (v.floating.length > 3 ? " …" : "");

        return (
          <Box key={idx} flexDirection="column" marginBottom={1}>
            <Box>
              <Text
                color={isHighlighted ? "cyan" : undefined}
                bold={isHighlighted}
              >
                {isHighlighted ? "> " : "  "}
                {formatVariantLabel(v).padEnd(15)}
                {isCurrent ? "*" : ""}
              </Text>
            </Box>
            <Text color="green">{`   ${previewStr}`}</Text>
            {floatingStr && <Text dimColor>{`   (${floatingStr})`}</Text>}
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
