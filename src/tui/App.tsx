import { useState, useCallback } from "react";
import { useInput, Key } from "ink";
import type { ImageRef, ImageUpdate } from "../types.ts";
import { UpdateList } from "./UpdateList.tsx";
import { TagPicker } from "./TagPicker.tsx";
import { VariantPicker } from "./VariantPicker.tsx";
import { ContextViewer } from "./ContextViewer.tsx";

type View = "list" | "picker" | "context" | "variants";

function findVariantIndex(update: ImageUpdate): number {
  if (!update.currentVariant) return 0;
  return update.variants.findIndex((v) => v.suffix === update.currentVariant!.suffix);
}

interface AppProps {
  updates: ImageUpdate[];
  filePath: string;
  fileContent: string;
  onDone: (results: ImageRef[]) => void;
}

export function App({ updates, filePath, fileContent, onDone }: AppProps) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(updates.map((_, i) => i)));
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map());
  const [view, setView] = useState<View>("list");
  const [pickerImageIdx, setPickerImageIdx] = useState(0);
  const [pickerVariantIdx, setPickerVariantIdx] = useState(0);
  const [listCursor, setListCursor] = useState(0);

  const handleConfirm = useCallback(() => {
    const results: ImageRef[] = [];
    for (const idx of selected) {
      const u = updates[idx];
      const tag = overrides.get(idx) ?? u.newTag;
      results.push({
        ...u.image,
        tag,
        full: `${u.image.registry}/${u.image.repository}:${tag}`,
        originalFull: u.image.full,
      });
    }
    onDone(results);
  }, [selected, overrides, updates, onDone]);

  const handleQuit = useCallback(() => {
    onDone([]);
  }, [onDone]);

  useInput((input: string, key: Key) => {
    if (view === "list") {
      if (input === " ") {
        setSelected((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(cursor)) {
            newSet.delete(cursor);
          } else {
            newSet.add(cursor);
          }
          return newSet;
        });
      } else if (input.toLowerCase() === "a") {
        setSelected(new Set(updates.map((_, i) => i)));
      } else if (input.toLowerCase() === "n") {
        setSelected(new Set());
      }
    }
  });

  if (view === "picker") {
    const update = updates[pickerImageIdx];
    return (
      <TagPicker
        update={update}
        activeVariantIdx={pickerVariantIdx}
        onSelect={(tag) => {
          setOverrides((prev) => {
            const newMap = new Map(prev);
            newMap.set(pickerImageIdx, tag);
            return newMap;
          });
          setView("list");
          setCursor(listCursor);
        }}
        onBack={() => {
          setView("list");
          setCursor(listCursor);
        }}
        onChangeVariant={() => setView("variants")}
      />
    );
  }

  if (view === "variants") {
    const update = updates[pickerImageIdx];
    return (
      <VariantPicker
        variants={update.variants}
        currentVariantIdx={pickerVariantIdx}
        onSelect={(idx) => {
          setPickerVariantIdx(idx);
          setView("picker");
        }}
        onCancel={() => setView("picker")}
      />
    );
  }

  if (view === "context") {
    const update = updates[cursor];
    return (
      <ContextViewer
        filePath={filePath}
        fileContent={fileContent}
        line={update.image.line}
        onClose={() => {
          setView("list");
          setCursor(listCursor);
        }}
      />
    );
  }

  return (
    <UpdateList
      updates={updates}
      selected={selected}
      overrides={overrides}
      onEdit={(idx) => {
        setCursor(idx);
        setListCursor(cursor);
        setPickerImageIdx(idx);
        setPickerVariantIdx(findVariantIndex(updates[idx]));
        setView("picker");
      }}
      onViewContext={(idx) => {
        setListCursor(cursor);
        setCursor(idx);
        setView("context");
      }}
      onConfirm={handleConfirm}
      onQuit={handleQuit}
    />
  );
}
