import { ImageUpdate, ImageRef, TagGroup } from "./types.ts";
import { findMatchingGroup, parseTag } from "./analyzer.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

async function prompt(message: string): Promise<string> {
  await Deno.stdout.write(new TextEncoder().encode(message));
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  if (n === null) return "";
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

function formatImageName(image: ImageRef): string {
  return `${image.registry}/${image.repository}`;
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}

export async function selectUpdates(
  updates: ImageUpdate[],
  autoYes: boolean,
): Promise<ImageRef[]> {
  if (updates.length === 0) {
    console.log("No images found that can be upgraded.");
    return [];
  }

  console.log(`\n${BOLD}Found ${updates.length} image(s) with available upgrades:${RESET}\n`);

  const nameWidth = Math.max(
    ...updates.map((u) => formatImageName(u.image).length),
    30,
  );
  const tagWidth = 20;

  console.log(
    `${DIM}#   ${"Image".padEnd(nameWidth)} ${"Current".padEnd(tagWidth)} → ${"Upgrade".padEnd(tagWidth)}${RESET}`,
  );
  console.log(
    `${DIM}─".padEnd(4)} ${"".padEnd(nameWidth, "─")} ${"".padEnd(tagWidth, "─")}   ${"".padEnd(tagWidth, "─")}${RESET}`,
  );

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const num = `${i + 1}.`.padEnd(3);
    const name = truncate(formatImageName(u.image), nameWidth).padEnd(nameWidth);
    const current = truncate(u.currentTag, tagWidth).padEnd(tagWidth);
    const newTag = truncate(u.newTag, tagWidth);
    console.log(`${num} ${name} ${YELLOW}${current}${RESET} → ${GREEN}${newTag}${RESET}`);
  }

  if (autoYes) {
    console.log(`\n${CYAN}Auto-accepting all upgrades...${RESET}`);
    return updates.map((u) => {
      const newImage: ImageRef = {
        ...u.image,
        tag: u.newTag,
        full: `${u.image.registry}/${u.image.repository}:${u.newTag}`,
        originalFull: u.image.full,
      };
      return newImage;
    });
  }

  console.log();
  const answer = await prompt(
    `Select images to upgrade (e.g., 1,2,4 or 'all' or 'none'): `,
  );

  if (answer.toLowerCase() === "none" || answer === "0" || answer === "") {
    console.log("No images selected.");
    return [];
  }

  let selectedIndices: number[];

  if (answer.toLowerCase() === "all") {
    selectedIndices = updates.map((_, i) => i);
  } else {
    const nums = answer.split(/[,.\s]+/).map((s) => parseInt(s.trim(), 10));
    selectedIndices = nums.filter((n) => n >= 1 && n <= updates.length).map((n) => n - 1);
  }

  if (selectedIndices.length === 0) {
    console.log("No valid selections.");
    return [];
  }

  const results: ImageRef[] = [];

  for (const idx of selectedIndices) {
    const u = updates[idx];

    if (u.tagGroups.length > 1) {
      const selectedTag = await selectTagVariant(u.image, u.currentTag, u.tagGroups);
      if (selectedTag) {
        results.push({
          ...u.image,
          tag: selectedTag,
          full: `${u.image.registry}/${u.image.repository}:${selectedTag}`,
          originalFull: u.image.full,
        });
      }
    } else {
      results.push({
        ...u.image,
        tag: u.newTag,
        full: `${u.image.registry}/${u.image.repository}:${u.newTag}`,
        originalFull: u.image.full,
      });
    }
  }

  return results;
}

async function selectTagVariant(
  image: ImageRef,
  currentTag: string,
  groups: TagGroup[],
): Promise<string | null> {
  console.log(
    `\n${BOLD}Select variant for ${formatImageName(image)}:${RESET}`,
  );
  console.log(`${DIM}Current: ${currentTag}${RESET}\n`);

  const current = parseTag(currentTag);
  const currentGroup = findMatchingGroup(currentTag, groups);

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const num = `${i + 1}.`.padEnd(3);
    const prefix = g.prefix || DIM + "(none)" + RESET;
    const suffix = g.suffix || DIM + "(none)" + RESET;
    const latest = g.latest.original;
    const currentMarker = g === currentGroup ? `${GREEN}*${RESET}` : " ";
    console.log(
      `${currentMarker}${num} prefix=${prefix.padEnd(8)} suffix=${suffix.padEnd(10)} → ${GREEN}${latest}${RESET}`,
    );
  }

  const answer = await prompt("\nSelect variant (number, or Enter for current group): ");

  if (answer === "") {
    return currentGroup?.latest.original ?? currentTag;
  }

  const num = parseInt(answer, 10);
  if (num >= 1 && num <= groups.length) {
    return groups[num - 1].latest.original;
  }

  console.log("Invalid selection, keeping current tag.");
  return null;
}
