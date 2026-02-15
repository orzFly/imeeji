import { Text, Transform } from "ink";
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
  return (
    <Transform transform={(text) => `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`}>
      <Text {...textProps}>{children}</Text>
    </Transform>
  );
}
