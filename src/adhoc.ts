import { fetchTagsEnriched, getRepositoryKey } from "./registry.ts";
import { findBestUpgrade, findMatchingVariant, groupByVariant } from "./analyzer.ts";
import type { ImageRef, ImageUpdate, TagFetchResult, VariantGroup } from "./types.ts";
import { fetchLsioMetadata, getLsioFloatingTags, isLinuxServerRepo } from "./integrations/lsio.ts";

export interface ParsedImageRef {
  registry: string;
  repository: string;
  tag: string | null;
  full: string;
}

export function parseImageRef(input: string): ParsedImageRef {
  let remaining = input.trim();
  let registry = "docker.io";
  let tag: string | null = null;

  const tagIndex = remaining.lastIndexOf(":");
  const slashIndex = remaining.indexOf("/");

  if (tagIndex > slashIndex && tagIndex !== -1) {
    tag = remaining.slice(tagIndex + 1);
    remaining = remaining.slice(0, tagIndex);
  }

  if (remaining.includes("/")) {
    const parts = remaining.split("/");
    const firstPart = parts[0];

    if (
      firstPart === "localhost" ||
      firstPart.includes(".") ||
      firstPart.includes(":")
    ) {
      registry = firstPart;
      remaining = parts.slice(1).join("/");
    }
  }

  if (!remaining.includes("/") && registry === "docker.io") {
    remaining = `library/${remaining}`;
  }

  const fullWithTag = tag ? `${registry}/${remaining}:${tag}` : `${registry}/${remaining}`;

  return {
    registry,
    repository: remaining,
    tag,
    full: fullWithTag,
  };
}

function findDefaultVariant(variants: VariantGroup[]): number {
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (v.prefix === "" && v.suffix === "" && v.latest && !v.latest.isFloating) {
      return i;
    }
  }

  let bestIdx = 0;
  let bestScore = Infinity;

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (!v.latest) continue;

    const score = v.prefix.length + v.suffix.length;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function findVariantWithTag(tag: string, variants: VariantGroup[]): number {
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (v.latest?.original === tag) return i;
    if (v.older.some(t => t.original === tag)) return i;
    if (v.floating.some(t => t.original === tag)) return i;
  }

  const parsed = tag;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (v.suffix && parsed.endsWith(v.suffix)) return i;
  }

  return -1;
}

export async function fetchImageVariants(
  parsed: ParsedImageRef,
): Promise<{ result: TagFetchResult; variants: VariantGroup[]; lsioMetadata?: unknown }> {
  const result = await fetchTagsEnriched(parsed.registry, parsed.repository);

  if (result.tags.length === 0) {
    return { result, variants: [] };
  }

  let lsioMetadata: Awaited<ReturnType<typeof fetchLsioMetadata>> = null;
  if (isLinuxServerRepo(parsed.repository)) {
    lsioMetadata = await fetchLsioMetadata();
  }

  const repoKey = `linuxserver/${parsed.repository.replace("linuxserver/", "")}`;
  const lsioMeta = lsioMetadata?.get(repoKey);
  const floatingTags = lsioMeta ? getLsioFloatingTags(lsioMeta) : undefined;

  const variants = groupByVariant(result.tags, result.digestMap, floatingTags);

  return { result, variants, lsioMetadata: lsioMeta };
}

export function createImageUpdate(
  parsed: ParsedImageRef,
  variants: VariantGroup[],
  lsioMetadata?: unknown,
): ImageUpdate {
  const currentTag = parsed.tag ?? "latest";
  const currentVariant = findMatchingVariant(currentTag, variants);

  const dummyImage: ImageRef = {
    full: parsed.full,
    registry: parsed.registry,
    repository: parsed.repository,
    tag: currentTag,
    line: 0,
    column: 0,
    startIndex: 0,
    endIndex: 0,
  };

  let newTag: string | null = null;
  if (currentVariant?.latest) {
    newTag = currentVariant.latest.original;
  } else {
    const defaultVariant = variants[findDefaultVariant(variants)];
    if (defaultVariant?.latest) {
      newTag = defaultVariant.latest.original;
    }
  }

  return {
    image: dummyImage,
    currentTag,
    newTag: newTag ?? currentTag,
    variants,
    currentVariant,
    lsioMetadata: lsioMetadata as ImageUpdate["lsioMetadata"],
  };
}

export function findInitialVariantIdx(
  parsed: ParsedImageRef,
  variants: VariantGroup[],
): number {
  if (!parsed.tag) {
    return findDefaultVariant(variants);
  }

  const matchIdx = findVariantWithTag(parsed.tag, variants);
  if (matchIdx >= 0) return matchIdx;

  return findDefaultVariant(variants);
}

export function selectAutoTag(
  parsed: ParsedImageRef,
  update: ImageUpdate,
): string {
  if (parsed.tag) {
    const variantIdx = findVariantWithTag(parsed.tag, update.variants);
    if (variantIdx >= 0) {
      const variant = update.variants[variantIdx];
      if (variant.latest) {
        return variant.latest.original;
      }
    }
  }

  const defaultIdx = findDefaultVariant(update.variants);
  const defaultVariant = update.variants[defaultIdx];
  if (defaultVariant?.latest) {
    return defaultVariant.latest.original;
  }

  for (const v of update.variants) {
    if (v.latest && !v.latest.isFloating) {
      return v.latest.original;
    }
  }

  return parsed.tag ?? "latest";
}

export async function runAdhocMode(
  parsed: ParsedImageRef,
  autoYes: boolean,
): Promise<string | null> {
  const key = getRepositoryKey(parsed.registry, parsed.repository);
  console.log(`Fetching tags for ${key}...`);

  const { variants, lsioMetadata } = await fetchImageVariants(parsed);

  if (variants.length === 0) {
    console.error(`No tags found for ${key}`);
    return null;
  }

  const update = createImageUpdate(parsed, variants, lsioMetadata);

  if (autoYes) {
    const selectedTag = selectAutoTag(parsed, update);
    return `${parsed.registry}/${parsed.repository}:${selectedTag}`;
  }

  const { selectAdhocImage } = await import("./tui/AdhocApp.tsx");
  const selectedTag = await selectAdhocImage(update, parsed);

  if (!selectedTag) {
    return null;
  }

  return `${parsed.registry}/${parsed.repository}:${selectedTag}`;
}
