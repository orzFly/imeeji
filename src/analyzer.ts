import { compare, parse as parseSemver } from "@std/semver";
import type { ParsedTag, VariantGroup } from "./types.ts";

const JAVA_STYLE_REGEX = /^(\d+u\d+(?:-b\d+)?)(?:-(.+))?$/;
const STANDARD_VERSION_REGEX =
  /^(\d+(?:[._]\d+)*(?:-(?:(?:rc|beta|alpha|dev|preview|canary|nightly)\d*|m\d+))?(?:-\d+)*(?:-[a-z][0-9a-f]+)?(?:-[a-z]{1,2}\d+)?)(?:-(.+))?$/i;
const ARCH_PREFIX_REGEX = /^(amd64|arm64v8|arm32v[567]|i386|s390x|ppc64le|riscv64|mips64le)-/i;
const GIT_HASH_BUILD_REGEX = /^([0-9a-f]{7,8})-([a-z]{1,2})(\d+)$/i;

export function parseTag(tag: string): ParsedTag {
  let remaining = tag;
  let prefix = "";

  const archMatch = remaining.match(ARCH_PREFIX_REGEX);
  if (archMatch) {
    prefix = archMatch[1].toLowerCase() + "-";
    remaining = remaining.slice(archMatch[0].length);
  }

  if (
    remaining.toLowerCase().startsWith("version-v") && /^\d/.test(remaining.slice(9))
  ) {
    prefix += "version-v";
    remaining = remaining.slice(9);
  } else if (remaining.toLowerCase() === "v") {
    prefix += "v";
    remaining = "";
  } else if (
    remaining.toLowerCase().startsWith("v") && /^\d/.test(remaining.slice(1))
  ) {
    prefix += "v";
    remaining = remaining.slice(1);
  }

  const hashBuildMatch = remaining.match(GIT_HASH_BUILD_REGEX);
  if (hashBuildMatch) {
    return {
      original: tag,
      prefix,
      version: remaining,
      suffix: "",
      semver: false,
      isFloating: false,
    };
  }

  if (!remaining || !/^\d/.test(remaining)) {
    return {
      original: tag,
      prefix,
      version: "",
      suffix: remaining,
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
    prefix,
    version: "",
    suffix: remaining,
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
  const hashA = a.version.match(GIT_HASH_BUILD_REGEX);
  const hashB = b.version.match(GIT_HASH_BUILD_REGEX);
  if (hashA && hashB) {
    if (hashA[2].toLowerCase() === hashB[2].toLowerCase()) {
      return parseInt(hashA[3], 10) - parseInt(hashB[3], 10);
    }
    return 0;
  }
  if (hashA || hashB) return 0;

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

  const preReleaseRegex = /-(?:rc|beta|alpha|dev|preview|canary|nightly|m)(\d*)/i;
  const preA = a.version.match(preReleaseRegex);
  const preB = b.version.match(preReleaseRegex);

  if (preA && !preB) return -1;
  if (!preA && preB) return 1;
  if (preA && preB) {
    const numA = preA[1] ? parseInt(preA[1], 10) : 0;
    const numB = preB[1] ? parseInt(preB[1], 10) : 0;
    if (numA !== numB) return numA - numB;
  }

  const buildRegex = /-([a-z]{1,2})(\d+)$/i;
  const buildA = a.version.match(buildRegex);
  const buildB = b.version.match(buildRegex);
  if (buildA && buildB && buildA[1].toLowerCase() === buildB[1].toLowerCase()) {
    const numA = parseInt(buildA[2], 10);
    const numB = parseInt(buildB[2], 10);
    if (numA !== numB) return numA - numB;
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

function reparseWithSuffixInference(parsed: ParsedTag[]): ParsedTag[] {
  const knownSuffixes = new Set<string>();
  for (const p of parsed) {
    if (!p.isFloating && p.suffix) {
      knownSuffixes.add(p.suffix);
    }
  }

  if (knownSuffixes.size === 0) return parsed;

  const result = [...parsed];
  for (let i = 0; i < result.length; i++) {
    const p = result[i];
    if (!p.isFloating) continue;

    for (const suffix of knownSuffixes) {
      if (!p.original.startsWith(suffix + "-")) continue;
      const remainder = p.original.slice(suffix.length + 1);
      const reparsed = parseTag(remainder);
      if (reparsed.isFloating) continue;

      result[i] = {
        original: p.original,
        prefix: suffix + "-" + reparsed.prefix,
        version: reparsed.version,
        suffix: reparsed.suffix,
        semver: reparsed.semver,
        isFloating: false,
      };
      break;
    }
  }
  return result;
}

export function groupByVariant(
  tags: string[],
  digestMap?: Map<string, string>,
  floatingTagOverrides?: Set<string>,
): VariantGroup[] {
  let parsed = tags.map(parseTag);

  if (digestMap) {
    parsed = reparseWithDigests(parsed, digestMap);
  }
  parsed = reparseWithSuffixInference(parsed);

  if (floatingTagOverrides) {
    for (let i = 0; i < parsed.length; i++) {
      if (floatingTagOverrides.has(parsed[i].original.toLowerCase())) {
        parsed[i] = { ...parsed[i], isFloating: true };
      }
    }
  }

  const versionedGroups = new Map<string, ParsedTag[]>();
  for (const p of parsed) {
    if (!p.isFloating) {
      const key = p.prefix + "\0" + p.suffix;
      if (!versionedGroups.has(key)) {
        versionedGroups.set(key, []);
      }
      versionedGroups.get(key)!.push(p);
    }
  }

  const floatingTags = parsed.filter((p) => p.isFloating);

  const result: VariantGroup[] = [];

  for (const [key, versioned] of versionedGroups) {
    versioned.sort((a, b) => {
      const cmp = compareVersions(b, a);
      if (cmp !== 0) return cmp;
      if (a.prefix && !b.prefix) return 1;
      if (!a.prefix && b.prefix) return -1;
      return a.original.localeCompare(b.original);
    });

    const latest = versioned.length > 0 ? versioned[0] : null;
    const older = versioned.slice(1);

    const parts = key.split("\0");
    const groupPrefix = parts[0];
    const groupSuffix = parts[1] ?? "";

    const matchingFloating = floatingTags.filter(
      (f) => f.prefix === groupPrefix && f.suffix === groupSuffix,
    );

    result.push({
      prefix: groupPrefix,
      suffix: groupSuffix,
      latest,
      older,
      floating: matchingFloating,
    });
  }

  const nonMatchedFloating = floatingTags.filter(
    (f) => !result.some((v) => v.prefix === f.prefix && v.suffix === f.suffix),
  );

  const defaultVariant = result.find((v) => v.prefix === "" && v.suffix === "");
  if (defaultVariant) {
    defaultVariant.floating.push(...nonMatchedFloating);
  } else if (nonMatchedFloating.length > 0) {
    result.push({
      prefix: "",
      suffix: "",
      latest: null,
      older: [],
      floating: nonMatchedFloating,
    });
  }

  return result.sort((a, b) => {
    if (a.prefix === "" && a.suffix === "" && (b.prefix !== "" || b.suffix !== "")) return -1;
    if (b.prefix === "" && b.suffix === "" && (a.prefix !== "" || a.suffix !== "")) return 1;
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
    if (variant.prefix === current.prefix && variant.suffix === current.suffix) {
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
  if (suffix && !prefix.startsWith(suffix + "-")) {
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
