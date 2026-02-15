import { Box, Text, useInput, Key } from "ink";
import type { VariantGroup } from "../types.ts";
import { useListNav } from "./useListNav.ts";

interface VariantPickerProps {
  variants: VariantGroup[];
  currentVariantIdx: number;
  onSelect: (variantIdx: number) => void;
  onCancel: () => void;
}

function formatVariantLabel(variant: VariantGroup): string {
  if (variant.suffix === "") return "(default)";
  return variant.suffix;
}

export function VariantPicker({
  variants,
  currentVariantIdx,
  onSelect,
  onCancel,
}: VariantPickerProps) {
  const { cursor } = useListNav(variants.length);

  useInput((_input: string, key: Key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSelect(cursor);
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Select Variant:</Text>
      </Box>

      {variants.map((v, idx) => {
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

      <Box marginTop={1}>
        <Text dimColor>[Esc] Cancel [Enter] Select Variant</Text>
      </Box>
    </Box>
  );
}
