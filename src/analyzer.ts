import { parse as parseSemver, compare } from "@std/semver";
import { ParsedTag, TagGroup } from "./types.ts";

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

const COMMON_PREFIXES = ["v", "release-", "stable-", "latest"];

export function parseTag(tag: string): ParsedTag {
  let remaining = tag;
  let prefix = "";
  let suffix = "";

  for (const p of COMMON_PREFIXES) {
    if (remaining.toLowerCase().startsWith(p.toLowerCase())) {
      prefix = p;
      remaining = remaining.slice(p.length);
      break;
    }
  }

  for (const s of COMMON_SUFFIXES) {
    const lowerRemaining = remaining.toLowerCase();
    const lowerSuffix = s.toLowerCase();
    if (lowerRemaining.endsWith(lowerSuffix)) {
      suffix = remaining.slice(lowerRemaining.length - lowerSuffix.length);
      remaining = remaining.slice(0, lowerRemaining.length - lowerSuffix.length);
      break;
    }
  }

  const version = remaining;
  const semver = isValidSemver(version);

  return {
    original: tag,
    prefix,
    version,
    suffix,
    semver,
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

export function groupTags(tags: string[]): TagGroup[] {
  const parsed = tags.map(parseTag);
  const groups = new Map<string, ParsedTag[]>();

  for (const p of parsed) {
    const key = `${p.prefix}|${p.suffix}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  }

  const result: TagGroup[] = [];
  for (const [key, groupTags] of groups) {
    const [prefix, suffix] = key.split("|");
    const sorted = groupTags.sort(compareVersions);
    const latest = sorted[sorted.length - 1];

    result.push({
      prefix,
      suffix,
      tags: sorted,
      latest,
    });
  }

  return result.sort((a, b) => {
    if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
    return a.suffix.localeCompare(b.suffix);
  });
}

export function findMatchingGroup(
  currentTag: string,
  groups: TagGroup[],
): TagGroup | null {
  const current = parseTag(currentTag);

  for (const group of groups) {
    if (group.prefix === current.prefix && group.suffix === current.suffix) {
      return group;
    }
  }

  return null;
}

export function findBestUpgrade(
  currentTag: string,
  groups: TagGroup[],
): string | null {
  const group = findMatchingGroup(currentTag, groups);
  if (!group) return null;

  const current = parseTag(currentTag);
  const cmp = compareVersions(current, group.latest);

  if (cmp < 0) {
    return group.latest.original;
  }

  return null;
}
