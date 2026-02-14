import type { ImageRef, ImageUpdate, VariantGroup } from "./types.ts";

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

function formatVariantLabel(variant: VariantGroup): string {
  if (variant.suffix === "") return "(default)";
  return variant.suffix;
}

export async function selectUpdates(
  updates: ImageUpdate[],
  autoYes: boolean,
): Promise<ImageRef[]> {
  if (updates.length === 0) {
    console.log("No images found that can be upgraded.");
    return [];
  }

  console.log(
    `\n${BOLD}Found ${updates.length} image(s) with available upgrades:${RESET}\n`,
  );

  const nameWidth = Math.max(
    ...updates.map((u) => formatImageName(u.image).length),
    30,
  );
  const tagWidth = 20;

  console.log(
    `${DIM}#   ${"Image".padEnd(nameWidth)} ${"Current".padEnd(tagWidth)} → ${
      "Upgrade".padEnd(tagWidth)
    }${RESET}`,
  );
  console.log(
    `${DIM}${"".padEnd(4)} ${"".padEnd(nameWidth, "─")} ${
      "".padEnd(tagWidth, "─")
    }   ${"".padEnd(tagWidth, "─")}${RESET}`,
  );

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const num = `${i + 1}.`.padEnd(3);
    const name = truncate(formatImageName(u.image), nameWidth).padEnd(
      nameWidth,
    );
    const current = truncate(u.currentTag, tagWidth).padEnd(tagWidth);
    const newTag = truncate(u.newTag, tagWidth);
    console.log(
      `${num} ${name} ${YELLOW}${current}${RESET} → ${GREEN}${newTag}${RESET}`,
    );
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
    selectedIndices = nums.filter((n) => n >= 1 && n <= updates.length).map((
      n,
    ) => n - 1);
  }

  if (selectedIndices.length === 0) {
    console.log("No valid selections.");
    return [];
  }

  const results: ImageRef[] = [];

  for (const idx of selectedIndices) {
    const u = updates[idx];
    const selectedTag = await selectTagForImage(
      u.image,
      u.currentTag,
      u.variants,
      u.currentVariant,
    );
    if (selectedTag) {
      results.push({
        ...u.image,
        tag: selectedTag,
        full: `${u.image.registry}/${u.image.repository}:${selectedTag}`,
        originalFull: u.image.full,
      });
    }
  }

  return results;
}

async function selectTagForImage(
  image: ImageRef,
  currentTag: string,
  variants: VariantGroup[],
  currentVariant: VariantGroup | null,
): Promise<string | null> {
  let activeVariant = currentVariant;

  while (true) {
    if (!activeVariant) {
      activeVariant = await selectVariant(image, currentTag, variants, null);
      if (!activeVariant) return null;
    }

    const selectedTag = await selectTagInVariant(
      image,
      currentTag,
      activeVariant,
      variants,
    );

    if (selectedTag === "__OTHER_VARIANTS__") {
      activeVariant = await selectVariant(
        image,
        currentTag,
        variants,
        activeVariant,
      );
      if (!activeVariant) return null;
      continue;
    }

    return selectedTag;
  }
}

async function selectTagInVariant(
  image: ImageRef,
  currentTag: string,
  variant: VariantGroup,
  variants: VariantGroup[],
): Promise<string | null | "__OTHER_VARIANTS__"> {
  console.log(`\n${BOLD}Select tag for ${formatImageName(image)}${RESET}`);
  console.log(`${DIM}Current: ${currentTag}${RESET}`);
  console.log(`${DIM}Variant: ${formatVariantLabel(variant)}${RESET}\n`);

  const options: string[] = [];

  if (variant.latest) {
    options.push(variant.latest.original);
  }

  const maxOlder = 5;
  for (const t of variant.older.slice(0, maxOlder)) {
    options.push(t.original);
  }

  if (variant.floating.length > 0) {
    for (const t of variant.floating) {
      options.push(t.original);
    }
  }

  console.log("Recent versions:");
  for (let i = 0; i < options.length; i++) {
    const marker = options[i] === currentTag ? `${GREEN}*${RESET}` : " ";
    console.log(`${marker} ${i + 1}) ${options[i]}`);
  }

  if (variants.length > 1) {
    console.log(`\n0) ...other variants`);
  }

  const answer = await prompt("\nSelect tag (number, or Enter to skip): ");

  if (answer === "") {
    return null;
  }

  const num = parseInt(answer, 10);

  if (num === 0 && variants.length > 1) {
    return "__OTHER_VARIANTS__";
  }

  if (num >= 1 && num <= options.length) {
    return options[num - 1];
  }

  console.log("Invalid selection.");
  return null;
}

async function selectVariant(
  image: ImageRef,
  currentTag: string,
  variants: VariantGroup[],
  currentVariant: VariantGroup | null,
): Promise<VariantGroup | null> {
  console.log(`\n${BOLD}Select variant for ${formatImageName(image)}:${RESET}`);
  console.log(`${DIM}Current: ${currentTag}${RESET}\n`);

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const num = `${i + 1}.`.padEnd(3);
    const label = formatVariantLabel(v);
    const currentMarker = v === currentVariant ? `${GREEN}*${RESET}` : " ";

    let line = `${currentMarker}${num} ${label.padEnd(15)}`;

    if (v.latest) {
      line += ` ${GREEN}${v.latest.original}${RESET}`;
    }

    if (v.older.length > 0) {
      const olderPreview = v.older.slice(0, 3).map((t) => t.original).join(
        "  ",
      );
      line += `\n     ${DIM}${olderPreview}${RESET}`;
    }

    if (v.floating.length > 0) {
      const floatingPreview = v.floating.slice(0, 2).map((t) => t.original)
        .join(", ");
      line += `\n     ${DIM}(${floatingPreview})${RESET}`;
    }

    console.log(line);
  }

  const answer = await prompt(
    "\nSelect variant (number, or Enter to cancel): ",
  );

  if (answer === "") {
    return null;
  }

  const num = parseInt(answer, 10);
  if (num >= 1 && num <= variants.length) {
    return variants[num - 1];
  }

  console.log("Invalid selection.");
  return null;
}
