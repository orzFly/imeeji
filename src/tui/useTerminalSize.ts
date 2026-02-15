import { useState, useEffect } from "react";
import { useStdout } from "ink";

export function useTerminalSize(): { rows: number; columns: number } {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() => {
    if (stdout?.rows && stdout?.columns) {
      return { rows: stdout.rows, columns: stdout.columns };
    }
    try {
      const consoleSize = Deno.consoleSize();
      return {
        rows: consoleSize.rows || 24,
        columns: consoleSize.columns || 80,
      };
    } catch {
      return { rows: 24, columns: 80 };
    }
  });

  useEffect(() => {
    if (!stdout) return;

    const handleResize = () => {
      setSize({
        rows: stdout.rows || 24,
        columns: stdout.columns || 80,
      });
    };

    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  return size;
}
