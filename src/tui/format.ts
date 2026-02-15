import type { VariantGroup } from "../types.ts";

export function formatVariantLabel(variant: VariantGroup): string {
  if (variant.variantKey === "*") return "(default)";
  return variant.variantKey;
}

export function formatImageName(
  image: { registry: string; repository: string },
): string {
  return `${image.registry}/${image.repository}`;
}

export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}
