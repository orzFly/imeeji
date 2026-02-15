import { Text } from "ink";
import { useTerminalSize } from "./useTerminalSize.ts";

interface TitleBarProps {
  title: string;
  subtitle?: string;
}

export function TitleBar({ title, subtitle }: TitleBarProps) {
  const { columns } = useTerminalSize();

  const leftPart = " imeeji";
  const centerPart = title;
  const rightPart = subtitle ?? "";

  const leftLen = leftPart.length;
  const centerLen = centerPart.length;
  const rightLen = rightPart.length;

  const padding = columns - leftLen - centerLen - rightLen;
  const leftPad = Math.max(0, Math.floor(padding / 2) - Math.floor(centerLen / 2));
  const rightPad = Math.max(0, padding - leftPad);

  const line = leftPart + " ".repeat(leftPad) + centerPart + " ".repeat(rightPad) + rightPart;
  const paddedLine = line.length >= columns ? line.slice(0, columns) : line.padEnd(columns);

  return <Text inverse>{paddedLine}</Text>;
}
