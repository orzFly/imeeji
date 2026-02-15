import { Text } from "ink";
import type { TextProps } from "ink";
import type { ReactNode } from "react";

interface LinkProps extends TextProps {
  url: string | null;
  children: ReactNode;
}

export function Link({ url, children, ...textProps }: LinkProps) {
  if (!url) {
    return <Text {...textProps}>{children}</Text>;
  }
  const linkText = `\x1b]8;;${url}\x07${children}\x1b]8;;\x07`;
  return <Text {...textProps}>{linkText}</Text>;
}
