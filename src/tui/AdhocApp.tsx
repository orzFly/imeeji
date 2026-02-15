import { useCallback, useState } from "react";
import type { ImageUpdate, VariantGroup } from "../types.ts";
import type { ParsedImageRef } from "../adhoc.ts";
import { TagPicker } from "./TagPicker.tsx";
import { VariantPicker } from "./VariantPicker.tsx";

type View = "variant" | "tag";

function findVariantIndex(update: ImageUpdate): number {
  if (!update.currentVariant) return 0;
  return update.variants.findIndex(
    (v: VariantGroup) =>
      v.prefix === update.currentVariant!.prefix &&
      v.suffix === update.currentVariant!.suffix,
  );
}

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
    return (
      <VariantPicker
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

  return new Promise<string | null>((resolve) => {
    const app = render(
      createElement(AdhocApp, {
        update,
        parsed,
        startWithVariantPicker,
        onDone: (result: string | null) => {
          app.unmount();
          resolve(result);
        },
      }),
    );
  });
}
