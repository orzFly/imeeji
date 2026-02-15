import { useCallback, useMemo, useState } from "react";

interface UseViewportOptions {
  itemCount: number;
  viewportHeight: number;
}

interface UseViewportResult {
  cursor: number;
  scrollOffset: number;
  visibleRange: { start: number; end: number };
  setCursor: (index: number) => void;
  moveUp: () => void;
  moveDown: () => void;
}

export function useViewport(
  { itemCount, viewportHeight }: UseViewportOptions,
): UseViewportResult {
  const [cursor, setCursorState] = useState(0);

  const visibleRange = useMemo(() => {
    if (itemCount === 0) return { start: 0, end: 0 };
    const start = Math.max(0, Math.min(cursor, itemCount - viewportHeight));
    const end = Math.min(itemCount, start + viewportHeight);
    return { start, end };
  }, [cursor, itemCount, viewportHeight]);

  const scrollOffset = visibleRange.start;

  const moveUp = useCallback(() => {
    setCursorState((c) => (c > 0 ? c - 1 : Math.max(0, itemCount - 1)));
  }, [itemCount]);

  const moveDown = useCallback(() => {
    setCursorState((c) => (c < itemCount - 1 ? c + 1 : 0));
  }, [itemCount]);

  const setCursor = useCallback((index: number) => {
    setCursorState(Math.max(0, Math.min(index, itemCount - 1)));
  }, [itemCount]);

  return {
    cursor,
    scrollOffset,
    visibleRange,
    setCursor,
    moveUp,
    moveDown,
  };
}
