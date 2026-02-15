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

  const leftPad = Math.max(0, Math.floor(columns / 2) - Math.floor(centerLen / 2) - leftLen);
  const rightSuffix = rightPart ? rightPart + " " : "";
  const rightPad = Math.max(0, columns - leftLen - leftPad - centerLen - rightSuffix.length);

  const line = leftPart + " ".repeat(leftPad) + centerPart + " ".repeat(rightPad) + rightSuffix;
  const paddedLine = line.length >= columns ? line.slice(0, columns) : line.padEnd(columns);

  return <Text inverse>{paddedLine}</Text>;
}
