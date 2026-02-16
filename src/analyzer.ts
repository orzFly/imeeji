import { compare, parse as parseSemver } from "@std/semver";
import type { ImageUpdate, ParsedTag, VariantGroup } from "./types.ts";

const JAVA_STYLE_REGEX = /^(\d+u\d+(?:-b\d+)?)(?:-(.+))?$/;
const STANDARD_VERSION_REGEX =
  /^(\d+(?:[._]\d+)*(?:-(?:(?:rc|beta|alpha|dev|preview|canary|nightly|unstable)\d*(?:\.\d+)?|m\d+))?(?:-\d+)*(?:-[a-z][0-9a-f]+)?(?:-[a-z]{1,2}\d+)?)(?:-(.+))?$/i;
const ARCH_PREFIX_REGEX =
  /^(amd64|arm64v8|arm32v[567]|i386|s390x|ppc64le|riscv64|mips64le)-/i;
const GIT_HASH_BUILD_REGEX = /^([0-9a-f]{7,8})-([a-z]{1,2})(\d+)$/i;
const PREFIXED_HASH_BUILD_REGEX = /^([a-z]+)-([0-9a-f]{7,8}-[a-z]{1,2}\d+)$/i;
const VERSION_HASH_REGEX = /^version-([0-9a-f]{7,8})$/i;
const PREFIXED_VERSION_HASH_REGEX = /^([a-z]+)-version-([0-9a-f]{7,8})$/i;
const EDITION_BUILD_REGEX = /^(\d+(?:\.\d+)*)-(([a-zA-Z]{2,4})\.(\d+))$/;
const PRE_RELEASE_KEYWORDS =
  /^(?:rc|beta|alpha|dev|preview|canary|nightly|unstable)$/i;

function buildResult(
  original: string,
  prefix: string,
  versionStr: string,
  suffix: string,
  semver: boolean,
  isFloating: boolean,
): ParsedTag {
  if (isFloating) {
    return {
      original,
      version: [],
      variantKey: prefix + suffix,
      semver: false,
      isFloating: true,
    };
  }
  const variantKey = prefix + "*" + (suffix ? "-" + suffix : "");
  return {
    original,
    version: [versionStr],
    variantKey,
    semver,
    isFloating: false,
  };
}

export function parseTag(tag: string): ParsedTag {
  let remaining = tag;
  let prefix = "";

  const archMatch = remaining.match(ARCH_PREFIX_REGEX);
  if (archMatch) {
    prefix = archMatch[1].toLowerCase() + "-";
    remaining = remaining.slice(archMatch[0].length);
  }

  if (
    remaining.toLowerCase().startsWith("version-v") &&
    /^\d/.test(remaining.slice(9))
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

  const versionHashMatch = remaining.match(VERSION_HASH_REGEX);
  if (versionHashMatch) {
    return {
      original: tag,
      version: [versionHashMatch[1]],
      variantKey: prefix + "version-*",
      semver: false,
      isFloating: false,
    };
  }

  const prefixedHashBuildMatch = remaining.match(PREFIXED_HASH_BUILD_REGEX);
  if (prefixedHashBuildMatch) {
    return {
      original: tag,
      version: [prefixedHashBuildMatch[2]],
      variantKey: prefix + prefixedHashBuildMatch[1] + "-*",
      semver: false,
      isFloating: false,
    };
  }

  const prefixedVersionHashMatch = remaining.match(PREFIXED_VERSION_HASH_REGEX);
  if (prefixedVersionHashMatch) {
    return {
      original: tag,
      version: [prefixedVersionHashMatch[2]],
      variantKey: prefix + prefixedVersionHashMatch[1] + "-version-*",
      semver: false,
      isFloating: false,
    };
  }

  const hashBuildMatch = remaining.match(GIT_HASH_BUILD_REGEX);
  if (hashBuildMatch) {
    return buildResult(tag, prefix, remaining, "", false, false);
  }

  if (!remaining || !/^\d/.test(remaining)) {
    return buildResult(tag, prefix, "", remaining, false, true);
  }

  const javaMatch = remaining.match(JAVA_STYLE_REGEX);
  if (javaMatch) {
    const version = javaMatch[1];
    const suffix = javaMatch[2] ?? "";
    return buildResult(
      tag,
      prefix,
      version,
      suffix,
      isValidSemver(version),
      false,
    );
  }

  const editionMatch = remaining.match(EDITION_BUILD_REGEX);
  if (editionMatch) {
    const baseVersion = editionMatch[1];
    const edition = editionMatch[3];
    const buildCounter = editionMatch[4];
    if (!PRE_RELEASE_KEYWORDS.test(edition)) {
      const variantKey = prefix + "*-" + edition + ".*";
      return {
        original: tag,
        version: [baseVersion, buildCounter],
        variantKey,
        semver: isValidSemver(baseVersion),
        isFloating: false,
      };
    }
  }

  const standardMatch = remaining.match(STANDARD_VERSION_REGEX);
  if (standardMatch) {
    const version = standardMatch[1];
    const suffix = standardMatch[2] ?? "";
    return buildResult(
      tag,
      prefix,
      version,
      suffix,
      isValidSemver(version),
      false,
    );
  }

  return buildResult(tag, prefix, "", remaining, false, true);
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
  const vA = a.version[0] ?? "";
  const vB = b.version[0] ?? "";

  const hashA = vA.match(GIT_HASH_BUILD_REGEX);
  const hashB = vB.match(GIT_HASH_BUILD_REGEX);
  if (hashA && hashB) {
    if (hashA[2].toLowerCase() === hashB[2].toLowerCase()) {
      return parseInt(hashA[3], 10) - parseInt(hashB[3], 10);
    }
    return 0;
  }
  if (hashA || hashB) return 0;

  if (a.semver && b.semver) {
    try {
      const semverA = parseSemver(vA);
      const semverB = parseSemver(vB);
      const semverCmp = compare(semverA, semverB);
      if (semverCmp !== 0) return semverCmp;
    } catch {
      // fall through to numeric/string comparison
    }
  }

  const preReleaseRegex =
    /-(?:rc|beta|alpha|dev|preview|canary|nightly|unstable|m)(\d*(?:\.\d+)?)$/i;
  const preA = vA.match(preReleaseRegex);
  const preB = vB.match(preReleaseRegex);
  const baseA = preA ? vA.slice(0, preA.index) : vA;
  const baseB = preB ? vB.slice(0, preB.index) : vB;

  const padVersion = (v: string) =>
    v.replace(/\d+/g, (x) => x.padStart(30, "0"));
  const paddedA = padVersion(baseA);
  const paddedB = padVersion(baseB);
  const cmp = paddedA.localeCompare(paddedB);
  if (cmp !== 0) return cmp;

  if (!preA && preB) return 1;
  if (preA && !preB) return -1;
  if (preA && preB) {
    return preA[0].localeCompare(preB[0]);
  }

  if (a.version.length > 1 && b.version.length > 1) {
    const buildA = parseInt(a.version[1], 10);
    const buildB = parseInt(b.version[1], 10);
    if (!isNaN(buildA) && !isNaN(buildB)) {
      return buildA - buildB;
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
    const referenceTags = groupTags.filter((t) => t.version.length > 0);
    const failedTags = groupTags.filter((t) => t.version.length === 0);

    if (referenceTags.length === 0 || failedTags.length === 0) continue;

    for (const failed of failedTags) {
      for (const ref of referenceTags) {
        const suffixPart = ref.variantKey.includes("*")
          ? ref.variantKey.slice(ref.variantKey.indexOf("*") + 1)
          : "";
        let reconstructedSuffix = suffixPart;
        let vi = 1;
        while (reconstructedSuffix.includes("*") && vi < ref.version.length) {
          reconstructedSuffix = reconstructedSuffix.replace(
            "*",
            ref.version[vi],
          );
          vi++;
        }
        const canon = ref.version[0] + reconstructedSuffix;

        if (failed.original.endsWith(canon)) {
          const productPrefix = failed.original.slice(
            0,
            failed.original.length - canon.length,
          );

          const idx = result.findIndex((t) => t.original === failed.original);
          if (idx !== -1) {
            result[idx] = {
              original: failed.original,
              version: ref.version,
              variantKey: productPrefix + ref.variantKey,
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
    if (!p.isFloating && p.variantKey.includes("*")) {
      const afterStar = p.variantKey.split("*").pop() ?? "";
      if (afterStar.startsWith("-")) {
        knownSuffixes.add(afterStar.slice(1));
      }
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

      const newPrefix = suffix + "-" +
        reparsed.variantKey.slice(0, reparsed.variantKey.indexOf("*"));
      const afterStar = reparsed.variantKey.slice(
        reparsed.variantKey.indexOf("*") + 1,
      );
      result[i] = {
        original: p.original,
        version: reparsed.version,
        variantKey: newPrefix + "*" + afterStar,
        semver: reparsed.semver,
        isFloating: false,
      };
      break;
    }
  }
  return result;
}

function floatingMatchesGroup(
  floatingKey: string,
  groupKey: string,
): boolean {
  if (floatingKey === groupKey) return true;
  const suffix = groupKey.replace(/^[^*]*\*/, "");
  if (suffix.startsWith("-")) {
    return floatingKey === suffix.slice(1);
  }
  return suffix === "" && floatingKey === groupKey;
}

export function groupByVariant(
  tags: string[],
  digestMap?: Map<string, string>,
  floatingTagOverrides?: Set<string>,
  timestampMap?: Map<string, Date>,
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
      const key = p.variantKey;
      if (!versionedGroups.has(key)) {
        versionedGroups.set(key, []);
      }
      versionedGroups.get(key)!.push(p);
    }
  }

  const floatingTags = parsed.filter((p) => p.isFloating);

  const result: VariantGroup[] = [];

  for (const [groupKey, versioned] of versionedGroups) {
    versioned.sort((a, b) => {
      const cmp = compareVersions(b, a);
      if (cmp !== 0) return cmp;
      return a.original.localeCompare(b.original);
    });

    const latest = versioned.length > 0 ? versioned[0] : null;
    const older = versioned.slice(1);

    const matchingFloating = floatingTags.filter(
      (f) => floatingMatchesGroup(f.variantKey, groupKey),
    );

    const latestTimestamp = latest
      ? timestampMap?.get(latest.original)
      : undefined;

    result.push({
      variantKey: groupKey,
      latest,
      latestTimestamp,
      older,
      floating: matchingFloating,
    });
  }

  const nonMatchedFloating = floatingTags.filter(
    (f) =>
      !result.some((v) => floatingMatchesGroup(f.variantKey, v.variantKey)),
  );

  const defaultVariant = result.find((v) => v.variantKey === "*");
  if (defaultVariant) {
    defaultVariant.floating.push(...nonMatchedFloating);
  } else if (nonMatchedFloating.length > 0) {
    result.push({
      variantKey: "*",
      latest: null,
      older: [],
      floating: nonMatchedFloating,
    });
  }

  if (digestMap) {
    const digestToVersioned = new Map<string, ParsedTag[]>();
    const digestToFloating = new Map<string, ParsedTag[]>();

    for (const variant of result) {
      for (const tag of [variant.latest, ...variant.older]) {
        if (tag) {
          const digest = digestMap.get(tag.original);
          if (digest) {
            if (!digestToVersioned.has(digest)) {
              digestToVersioned.set(digest, []);
            }
            digestToVersioned.get(digest)!.push(tag);
          }
        }
      }
      for (const tag of variant.floating) {
        const digest = digestMap.get(tag.original);
        if (digest) {
          if (!digestToFloating.has(digest)) {
            digestToFloating.set(digest, []);
          }
          digestToFloating.get(digest)!.push(tag);
        }
      }
    }

    for (const variant of result) {
      const matches = new Map<string, string>();
      for (const tag of [variant.latest, ...variant.older]) {
        if (tag) {
          const digest = digestMap.get(tag.original);
          if (digest) {
            const floatings = digestToFloating.get(digest);
            if (floatings && floatings.length === 1) {
              matches.set(tag.original, floatings[0].original);
            }
          }
        }
      }
      if (matches.size > 0) {
        variant.digestMatches = matches;
      }
    }
  }

  return result.sort((a, b) => {
    if (a.variantKey === "*" && b.variantKey !== "*") return -1;
    if (b.variantKey === "*" && a.variantKey !== "*") return 1;

    if (a.latestTimestamp && b.latestTimestamp) {
      const timeDiff = b.latestTimestamp.getTime() -
        a.latestTimestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
    } else if (a.latestTimestamp && !b.latestTimestamp) {
      return -1;
    } else if (!a.latestTimestamp && b.latestTimestamp) {
      return 1;
    }

    const suffixA = a.variantKey.includes("*")
      ? a.variantKey.slice(a.variantKey.indexOf("*") + 1)
      : a.variantKey;
    const suffixB = b.variantKey.includes("*")
      ? b.variantKey.slice(b.variantKey.indexOf("*") + 1)
      : b.variantKey;
    if (suffixA === "" && suffixB !== "") return -1;
    if (suffixA !== "" && suffixB === "") return 1;
    return suffixA.localeCompare(suffixB);
  });
}

export function findMatchingVariant(
  currentTag: string,
  variants: VariantGroup[],
): VariantGroup | null {
  const current = parseTag(currentTag);

  for (const variant of variants) {
    if (variant.variantKey === current.variantKey) {
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

export function reconstructTag(
  variantKey: string,
  version: string[],
): string {
  let result = variantKey;
  for (const v of version) {
    result = result.replace("*", v);
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
    return reconstructTag(variant.variantKey, variant.latest.version);
  }

  if (!variant.latest) return null;

  const cmp = compareVersions(current, variant.latest);

  if (cmp < 0) {
    return reconstructTag(current.variantKey, variant.latest.version);
  }

  return null;
}

export function findVariantIndex(update: ImageUpdate): number {
  if (!update.currentVariant) return 0;
  return update.variants.findIndex(
    (v) => v.variantKey === update.currentVariant!.variantKey,
  );
}
