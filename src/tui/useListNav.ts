import { useState, useCallback } from "react";
import { useInput, Key } from "ink";

export function useListNav(itemCount: number): {
  cursor: number;
  setCursor: (index: number) => void;
} {
  const [cursor, setCursor] = useState(0);

  useInput(
    useCallback(
      (_input: string, key: Key) => {
        if (key.upArrow) {
          setCursor((c: number) => (c > 0 ? c - 1 : Math.max(0, itemCount - 1)));
        } else if (key.downArrow) {
          setCursor((c: number) => (c < itemCount - 1 ? c + 1 : 0));
        }
      },
      [itemCount],
    ),
  );

  return { cursor, setCursor };
}
