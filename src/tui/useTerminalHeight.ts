import { useState, useEffect } from "react";
import { useStdout } from "ink";

export function useTerminalHeight(): number {
  const { stdout } = useStdout();
  const [rows, setRows] = useState(() => {
    if (stdout?.rows) return stdout.rows;
    try {
      return Deno.consoleSize().rows || 24;
    } catch {
      return 24;
    }
  });

  useEffect(() => {
    if (!stdout) return;

    const handleResize = () => {
      setRows(stdout.rows || 24);
    };

    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  return rows;
}
