import { Box, Text, useInput } from "ink";
import type { Key } from "ink";
import type { VariantGroup } from "../types.ts";
import { useViewport } from "./useViewport.ts";
import { useTerminalSize } from "./useTerminalSize.ts";
import { TitleBar } from "./TitleBar.tsx";
import { ControlBar } from "./ControlBar.tsx";
import { formatVariantLabel } from "./format.ts";

interface VariantPickerProps {
  variants: VariantGroup[];
  currentVariantIdx: number;
  onSelect: (variantIdx: number) => void;
  onCancel: () => void;
}

export function VariantPicker({
  variants,
  currentVariantIdx,
  onSelect,
  onCancel,
}: VariantPickerProps) {
  const { rows } = useTerminalSize();
  const viewportItems = Math.max(1, Math.floor((rows - 6) / 3));
  const { cursor, visibleRange, moveUp, moveDown } = useViewport({
    itemCount: variants.length,
    viewportHeight: viewportItems,
  });

  useInput((_input: string, key: Key) => {
    if (key.upArrow) {
      moveUp();
    } else if (key.downArrow) {
      moveDown();
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
        <TitleBar title="Select Variant" />
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
        const previewStr = preview.join(", ") + (v.older.length > 2 ? " …" : "");

        const floatingStr = v.floating.slice(0, 2).map((t) => t.original).join(", ");

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
            <Box marginLeft={3}>
              <Text color="green">{previewStr}</Text>
            </Box>
            {floatingStr && (
              <Box marginLeft={3}>
                <Text dimColor>({floatingStr})</Text>
              </Box>
            )}
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
