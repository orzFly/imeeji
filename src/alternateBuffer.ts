import process from "node:process";

const ENTER_ALT = "\x1b[?1049h";
const EXIT_ALT = "\x1b[?1049l";

export function enterAlternateBuffer(): () => void {
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    process.stdout.write(EXIT_ALT);
  };

  const sigintHandler = () => {
    cleanup();
    process.exit(130);
  };

  process.on("SIGINT", sigintHandler);
  process.on("exit", cleanup);

  process.stdout.write(ENTER_ALT);

  return () => {
    cleanup();
    process.off("SIGINT", sigintHandler);
    process.off("exit", cleanup);
  };
}
