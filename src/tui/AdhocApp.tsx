import { useCallback, useState } from "react";
import type { ImageUpdate } from "../types.ts";
import type { ParsedImageRef } from "../adhoc.ts";
import { findVariantIndex } from "../analyzer.ts";
import { enterAlternateBuffer } from "../alternateBuffer.ts";
import { TagPicker } from "./TagPicker.tsx";
import { VariantPicker } from "./VariantPicker.tsx";

type View = "variant" | "tag";

interface AdhocAppProps {
  update: ImageUpdate;
  parsed: ParsedImageRef;
  startWithVariantPicker: boolean;
  onDone: (tag: string | null) => void;
}

function AdhocApp(
  { update, parsed: _parsed, startWithVariantPicker, onDone }: AdhocAppProps,
) {
  const initialVariantIdx = startWithVariantPicker
    ? 0
    : findVariantIndex(update);

  const [view, setView] = useState<View>(
    startWithVariantPicker ? "variant" : "tag",
  );
  const [variantIdx, setVariantIdx] = useState(initialVariantIdx);

  const handleQuit = useCallback(() => {
    onDone(null);
  }, [onDone]);

  if (view === "variant") {
    const imageName = `${update.image.registry}/${update.image.repository}`;
    return (
      <VariantPicker
        imageName={imageName}
        variants={update.variants}
        currentVariantIdx={variantIdx}
        onSelect={(idx) => {
          setVariantIdx(idx);
          setView("tag");
        }}
        onCancel={handleQuit}
      />
    );
  }

  return (
    <TagPicker
      update={update}
      activeVariantIdx={variantIdx}
      onSelect={(tag) => {
        onDone(tag);
      }}
      onBack={startWithVariantPicker ? () => setView("variant") : handleQuit}
      onChangeVariant={() => setView("variant")}
    />
  );
}

export async function selectAdhocImage(
  update: ImageUpdate,
  parsed: ParsedImageRef,
): Promise<string | null> {
  const startWithVariantPicker = parsed.tag === null;

  const { render } = await import("ink");
  const { createElement } = await import("react");

  const cleanup = enterAlternateBuffer();

  return new Promise<string | null>((resolve) => {
    const app = render(
      createElement(AdhocApp, {
        update,
        parsed,
        startWithVariantPicker,
        onDone: (result: string | null) => {
          app.unmount();
          cleanup();
          resolve(result);
        },
      }),
      { exitOnCtrlC: false },
    );
  });
}
