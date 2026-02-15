import type { ImageRef, ImageUpdate } from "./types.ts";

export async function selectUpdates(
  updates: ImageUpdate[],
  autoYes: boolean,
  filePath: string,
  fileContent: string,
): Promise<ImageRef[]> {
  if (updates.length === 0) {
    console.log("No images found that can be upgraded.");
    return [];
  }

  if (autoYes) {
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
  const { createElement, useState, useReducer } = await import("react");

  return new Promise<ImageRef[]>((resolve) => {
    const app = render(
      createElement(App, {
        updates,
        filePath,
        fileContent,
        onDone: (results: ImageRef[]) => {
          app.unmount();
          resolve(results);
        },
      }),
    );
  });
}
