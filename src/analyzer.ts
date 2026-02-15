import { compare, parse as parseSemver } from "@std/semver";
import type { ParsedTag, VariantGroup } from "./types.ts";

const JAVA_STYLE_REGEX = /^(\d+u\d+(?:-b\d+)?)(?:-(.+))?$/;
const STANDARD_VERSION_REGEX =
  /^(\d+(?:[._]\d+)*(?:-(?:rc|beta|alpha|dev|preview|canary|nightly)\d*)?(?:-\d+)*)(?:-(.+))?$/i;

export function parseTag(tag: string): ParsedTag {
  let remaining = tag;
  let prefix = "";

  if (remaining.toLowerCase() === "v") {
    prefix = "v";
    remaining = "";
  } else if (
    remaining.toLowerCase().startsWith("v") && /^\d/.test(remaining.slice(1))
  ) {
    prefix = "v";
    remaining = remaining.slice(1);
  }

  if (!remaining || !/^\d/.test(remaining)) {
    return {
      original: tag,
      prefix: "",
      version: "",
      suffix: tag,
      semver: false,
      isFloating: true,
    };
  }

  const javaMatch = remaining.match(JAVA_STYLE_REGEX);
  if (javaMatch) {
    const version = javaMatch[1];
    const suffix = javaMatch[2] ?? "";
    return {
      original: tag,
      prefix,
      version,
      suffix,
      semver: isValidSemver(version),
      isFloating: false,
    };
  }

  const standardMatch = remaining.match(STANDARD_VERSION_REGEX);
  if (standardMatch) {
    const version = standardMatch[1];
    const suffix = standardMatch[2] ?? "";
    return {
      original: tag,
      prefix,
      version,
      suffix,
      semver: isValidSemver(version),
      isFloating: false,
    };
  }

  return {
    original: tag,
    prefix: "",
    version: "",
    suffix: tag,
    semver: false,
    isFloating: true,
  };
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

function reparseWithDigests(
  parsed: ParsedTag[],
  digestMap: Map<string, string>,
): ParsedTag[] {
  const result = [...parsed];
  const digestGroups = new Map<string, ParsedTag[]>();

  for (const p of parsed) {
    const digest = digestMap.get(p.original);
    if (digest) {
      if (!digestGroups.has(digest)) {
        digestGroups.set(digest, []);
      }
      digestGroups.get(digest)!.push(p);
    }
  }

  for (const [, groupTags] of digestGroups) {
    const referenceTags = groupTags.filter((t) => t.version !== "");
    const failedTags = groupTags.filter((t) => t.version === "");

    if (referenceTags.length === 0 || failedTags.length === 0) continue;

    for (const failed of failedTags) {
      for (const ref of referenceTags) {
        const canonicalForm = ref.suffix
          ? `${ref.version}-${ref.suffix}`
          : ref.version;

        if (failed.original.endsWith(canonicalForm)) {
          const productPrefix = failed.original.slice(
            0,
            failed.original.length - canonicalForm.length,
          );

          const idx = result.findIndex((t) => t.original === failed.original);
          if (idx !== -1) {
            result[idx] = {
              original: failed.original,
              prefix: productPrefix,
              version: ref.version,
              suffix: ref.suffix,
              semver: ref.semver,
              isFloating: false,
            };
          }
          break;
        }
      }
    }
  }

  return result;
}

export function groupByVariant(
  tags: string[],
  digestMap?: Map<string, string>,
): VariantGroup[] {
  let parsed = tags.map(parseTag);

  if (digestMap) {
    parsed = reparseWithDigests(parsed, digestMap);
  }

  const versionedGroups = new Map<string, ParsedTag[]>();
  for (const p of parsed) {
    if (!p.isFloating) {
      const key = p.suffix;
      if (!versionedGroups.has(key)) {
        versionedGroups.set(key, []);
      }
      versionedGroups.get(key)!.push(p);
    }
  }

  const floatingTags = parsed.filter((p) => p.isFloating);

  const result: VariantGroup[] = [];

  for (const [suffix, versioned] of versionedGroups) {
    versioned.sort((a, b) => {
      const cmp = compareVersions(b, a);
      if (cmp !== 0) return cmp;
      if (a.prefix && !b.prefix) return 1;
      if (!a.prefix && b.prefix) return -1;
      return a.original.localeCompare(b.original);
    });

    const latest = versioned.length > 0 ? versioned[0] : null;
    const older = versioned.slice(1);

    const matchingFloating = floatingTags.filter((f) => f.suffix === suffix);

    result.push({
      suffix,
      latest,
      older,
      floating: matchingFloating,
    });
  }

  const nonMatchedFloating = floatingTags.filter(
    (f) => !versionedGroups.has(f.suffix),
  );

  const defaultVariant = result.find((v) => v.suffix === "");
  if (defaultVariant) {
    defaultVariant.floating.push(...nonMatchedFloating);
  } else if (nonMatchedFloating.length > 0) {
    result.push({
      suffix: "",
      latest: null,
      older: [],
      floating: nonMatchedFloating,
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

  for (const variant of variants) {
    if (variant.latest?.original === currentTag) {
      return variant;
    }
    if (variant.older.some((t) => t.original === currentTag)) {
      return variant;
    }
    if (variant.floating.some((t) => t.original === currentTag)) {
      return variant;
    }
  }

  return null;
}

function reconstructTag(
  prefix: string,
  version: string,
  suffix: string,
): string {
  let result = prefix + version;
  if (suffix) {
    result += "-" + suffix;
  }
  return result;
}

export function findBestUpgrade(
  currentTag: string,
  variants: VariantGroup[],
): string | null {
  const variant = findMatchingVariant(currentTag, variants);
  if (!variant) return null;

  let current: ParsedTag | null = null;
  if (variant.latest?.original === currentTag) {
    current = variant.latest;
  } else {
    current = variant.older.find((t) => t.original === currentTag) ??
      variant.floating.find((t) => t.original === currentTag) ?? null;
  }

  if (!current && !variant.latest) return null;

  if (!current) {
    return variant.latest!.original;
  }

  if (current.isFloating) {
    if (!variant.latest) return null;
    return reconstructTag(
      current.prefix,
      variant.latest.version,
      variant.latest.suffix,
    );
  }

  if (!variant.latest) return null;

  const cmp = compareVersions(current, variant.latest);

  if (cmp < 0) {
    return reconstructTag(
      current.prefix,
      variant.latest.version,
      variant.latest.suffix,
    );
  }

  return null;
}
