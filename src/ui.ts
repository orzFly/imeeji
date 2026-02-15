import type { ImageRef, ImageUpdate } from "./types.ts";
import { enterAlternateBuffer } from "./alternateBuffer.ts";

function formatImageName(
  image: { registry: string; repository: string },
): string {
  return `${image.registry}/${image.repository}`;
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}

function printSummaryTable(updates: ImageUpdate[]): void {
  const nameWidth = Math.max(
    ...updates.map((u) => formatImageName(u.image).length),
    20,
  );

  console.log("\n📋 Upgrade Summary:\n");

  for (const u of updates) {
    const name = truncate(formatImageName(u.image), nameWidth).padEnd(
      nameWidth,
    );
    const current = truncate(u.currentTag, 20).padEnd(20);
    const newTag = truncate(u.newTag, 20);
    console.log(`  ${name}  ${current} → ${newTag}`);
  }

  console.log("");
}

export async function selectUpdates(
  updates: ImageUpdate[],
  autoYes: boolean,
  fileContents: Map<string, string>,
): Promise<ImageRef[]> {
  if (updates.length === 0) {
    console.log("No images found that can be upgraded.");
    return [];
  }

  if (autoYes) {
    printSummaryTable(updates);
    console.log("Auto-accepting all upgrades...");
    return updates.map((u) => {
      const newImage: ImageRef = {
        ...u.image,
        tag: u.newTag,
        full: `${u.image.registry}/${u.image.repository}:${u.newTag}`,
        originalFull: u.image.full,
      };
      return newImage;
    });
  }

  const { render } = await import("ink");
  const { App } = await import("./tui/App.tsx");
  const { createElement } = await import("react");

  const cleanup = enterAlternateBuffer();

  return new Promise<ImageRef[]>((resolve) => {
    const app = render(
      createElement(App, {
        updates,
        fileContents,
        onDone: (results: ImageRef[]) => {
          app.unmount();
          cleanup();
          resolve(results);
        },
      }),
      { exitOnCtrlC: false },
    );
  });
}
