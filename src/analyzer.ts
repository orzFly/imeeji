import { compare, parse as parseSemver } from "@std/semver";
import type { ParsedTag, VariantGroup } from "./types.ts";

const COMMON_SUFFIXES = [
  "-alpine",
  "-slim",
  "-debian",
  "-ubuntu",
  "-bullseye",
  "-bookworm",
  "-buster",
  "-focal",
  "-jammy",
  "-bionic",
  "-amd64",
  "-arm64",
  "-arm",
  "-windowsservercore",
  "-nanoserver",
];

const COMMON_PREFIXES = [
  "release-",
  "stable-",
];

const PRERELEASE_PREFIXES = [
  "rc",
  "beta",
  "alpha",
  "dev",
  "preview",
  "canary",
  "nightly",
];

export function parseTag(tag: string): ParsedTag {
  let remaining = tag;
  let prefix = "";
  let suffix = "";

  for (const s of COMMON_SUFFIXES) {
    const lowerRemaining = remaining.toLowerCase();
    const lowerSuffix = s.toLowerCase();
    if (lowerRemaining.endsWith(lowerSuffix)) {
      suffix = remaining.slice(lowerRemaining.length - lowerSuffix.length);
      remaining = remaining.slice(
        0,
        lowerRemaining.length - lowerSuffix.length,
      );
      break;
    }
  }

  for (const p of COMMON_PREFIXES) {
    if (remaining.toLowerCase().startsWith(p.toLowerCase())) {
      prefix = p;
      remaining = remaining.slice(p.length);
      break;
    }
  }

  for (const p of PRERELEASE_PREFIXES) {
    if (remaining.toLowerCase() === p) {
      prefix = prefix ? `${prefix}${p}` : p;
      remaining = "";
      break;
    }
    if (remaining.toLowerCase().startsWith(`${p}-`)) {
      prefix = prefix ? `${prefix}${p}` : p;
      remaining = remaining.slice(p.length + 1);
      break;
    }
    const lowerRemaining = remaining.toLowerCase();
    if (lowerRemaining.startsWith(p) && /^\d/.test(remaining.slice(p.length))) {
      prefix = prefix ? `${prefix}${p}` : p;
      remaining = remaining.slice(p.length);
      break;
    }
  }

  if (remaining.toLowerCase() === "v") {
    prefix = prefix ? `${prefix}v` : "v";
    remaining = "";
  } else if (
    remaining.toLowerCase().startsWith("v") && /^\d/.test(remaining.slice(1))
  ) {
    prefix = prefix ? `${prefix}v` : "v";
    remaining = remaining.slice(1);
  }

  const version = remaining;
  const semver = isValidSemver(version);
  const isFloating = !semver && !hasNumericContent(version);

  return {
    original: tag,
    prefix,
    version,
    suffix,
    semver,
    isFloating,
  };
}

function hasNumericContent(version: string): boolean {
  return /\d/.test(version);
}

function isValidSemver(version: string): boolean {
  if (!version || version.length === 0) return false;
  try {
    parseSemver(version);
    return true;
  } catch {
    return false;
  }
}

function compareVersions(a: ParsedTag, b: ParsedTag): number {
  if (a.semver && b.semver) {
    try {
      const semverA = parseSemver(a.version);
      const semverB = parseSemver(b.version);
      return compare(semverA, semverB);
    } catch {
      // fall through to numeric/string comparison
    }
  }

  const numA = parseFloat(a.version);
  const numB = parseFloat(b.version);

  if (!isNaN(numA) && !isNaN(numB)) {
    if (numA !== numB) return numA - numB;
  }

  const partsA = a.version.split(".");
  const partsB = b.version.split(".");
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const partA = partsA[i] ?? "0";
    const partB = partsB[i] ?? "0";

    const numPartA = parseInt(partA, 10);
    const numPartB = parseInt(partB, 10);

    if (!isNaN(numPartA) && !isNaN(numPartB)) {
      if (numPartA !== numPartB) return numPartA - numPartB;
    } else {
      const cmp = partA.localeCompare(partB);
      if (cmp !== 0) return cmp;
    }
  }

  return 0;
}

export function groupByVariant(tags: string[]): VariantGroup[] {
  const parsed = tags.map(parseTag);
  const groups = new Map<string, ParsedTag[]>();

  for (const p of parsed) {
    const key = p.suffix;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  }

  const result: VariantGroup[] = [];

  for (const [suffix, groupTags] of groups) {
    const versioned = groupTags.filter((t) => !t.isFloating);
    const floating = groupTags.filter((t) => t.isFloating);

    versioned.sort((a, b) => compareVersions(b, a));

    const latest = versioned.length > 0 ? versioned[0] : null;
    const older = versioned.slice(1);

    result.push({
      suffix,
      latest,
      older,
      floating,
    });
  }

  return result.sort((a, b) => {
    if (a.suffix === "" && b.suffix !== "") return -1;
    if (a.suffix !== "" && b.suffix === "") return 1;
    return a.suffix.localeCompare(b.suffix);
  });
}

export function findMatchingVariant(
  currentTag: string,
  variants: VariantGroup[],
): VariantGroup | null {
  const current = parseTag(currentTag);

  for (const variant of variants) {
    if (variant.suffix === current.suffix) {
      return variant;
    }
  }

  return null;
}

export function findBestUpgrade(
  currentTag: string,
  variants: VariantGroup[],
): string | null {
  const variant = findMatchingVariant(currentTag, variants);
  if (!variant || !variant.latest) return null;

  const current = parseTag(currentTag);

  if (current.isFloating) {
    return variant.latest.original;
  }

  const cmp = compareVersions(current, variant.latest);

  if (cmp < 0) {
    return variant.latest.original;
  }

  return null;
}
