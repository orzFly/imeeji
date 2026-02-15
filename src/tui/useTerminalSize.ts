import { useEffect, useState } from "react";
import { useStdout } from "ink";
import terminalSize from "terminal-size";

function getTerminalSize(): { rows: number; columns: number } {
  if (typeof Deno !== "undefined" && typeof Deno.consoleSize === "function") {
    try {
      const consoleSize = Deno.consoleSize();
      return {
        rows: consoleSize.rows || 24,
        columns: consoleSize.columns || 80,
      };
    } catch {
      // fall through
    }
  }
  const size = terminalSize();
  return {
    rows: size.rows || 24,
    columns: size.columns || 80,
  };
}

export function useTerminalSize(): { rows: number; columns: number } {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() => {
    if (stdout?.rows != null && stdout?.columns != null) {
      return { rows: stdout.rows, columns: stdout.columns };
    }
    return getTerminalSize();
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
