import type { VariantGroup } from "../types.ts";

export function formatVariantLabel(variant: VariantGroup): string {
  if (variant.prefix === "" && variant.suffix === "") return "(default)";
  if (variant.prefix === "") return variant.suffix;
  if (variant.suffix === "") return variant.prefix;
  return `${variant.prefix} ${variant.suffix}`;
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
