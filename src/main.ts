import { parseArgs } from "@std/cli/parse-args";
import { findImages } from "./parser.ts";
import { fetchTags, getRepositoryKey } from "./registry.ts";
import {
  findBestUpgrade,
  findMatchingVariant,
  groupByVariant,
} from "./analyzer.ts";
import { selectUpdates } from "./ui.ts";
import { applyUpdates as applyPatches, generateDiff } from "./patcher.ts";
import type { ImageUpdate } from "./types.ts";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`
imeeji - Interactive Docker Image Upgrade Tool

USAGE:
  imeeji [OPTIONS] <FILE>

OPTIONS:
  -n, --dry-run    Print diff without modifying file
  -y, --yes        Auto-accept latest versions (non-interactive)
  -h, --help       Print this help message
  -V, --version    Print version

EXAMPLES:
  imeeji config.nix              Interactive upgrade
  imeeji --dry-run config.nix    Preview changes only
  imeeji -y config.nix           Auto-upgrade all to latest
`);
}

async function main(): Promise<void> {
  const parsed = parseArgs(Deno.args, {
    boolean: ["dry-run", "yes", "help", "version"],
    alias: {
      n: "dry-run",
      y: "yes",
      h: "help",
      V: "version",
    },
    stopEarly: true,
  });

  if (parsed.version) {
    console.log(`imeeji ${VERSION}`);
    Deno.exit(0);
  }

  if (parsed.help) {
    printHelp();
    Deno.exit(0);
  }

  const file = parsed._[0]?.toString() ?? null;

  if (!file) {
    console.error("Error: No file specified");
    printHelp();
    Deno.exit(1);
  }

  const filePath = file;
  const dryRun = parsed["dry-run"] ?? false;
  const autoYes = parsed.yes ?? false;

  let content: string;
  try {
    content = await Deno.readTextFile(filePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Error reading file ${filePath}: ${msg}`);
    Deno.exit(1);
  }

  const images = findImages(content);

  if (images.length === 0) {
    console.log("No docker images found in file.");
    return;
  }

  console.log(`Found ${images.length} image(s) in ${filePath}`);

  const repoCache = new Map<string, string[]>();

  for (const image of images) {
    const key = getRepositoryKey(image.registry, image.repository);
    if (!repoCache.has(key)) {
      console.log(`Fetching tags for ${key}...`);
      const tags = await fetchTags(image.registry, image.repository);
      repoCache.set(key, tags);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const updates: ImageUpdate[] = [];

  for (const image of images) {
    const key = getRepositoryKey(image.registry, image.repository);
    const tags = repoCache.get(key) ?? [];

    if (tags.length === 0) {
      console.log(`  Skipping ${key}: no tags available`);
      continue;
    }

    const variants = groupByVariant(tags);
    const newTag = findBestUpgrade(image.tag, variants);

    if (newTag) {
      updates.push({
        image,
        currentTag: image.tag,
        newTag,
        variants,
        currentVariant: findMatchingVariant(image.tag, variants),
      });
    }
  }

  if (updates.length === 0) {
    console.log("\nAll images are already at their latest versions.");
    return;
  }

  const selectedUpdates = await selectUpdates(updates, autoYes);

  if (selectedUpdates.length === 0) {
    console.log("No updates applied.");
    return;
  }

  if (dryRun) {
    const diff = generateDiff(filePath, content, selectedUpdates);
    console.log("\n" + diff);
    console.log(`\n(Dry run - no changes made)`);
  } else {
    const newContent = applyPatches(content, selectedUpdates);
    await Deno.writeTextFile(filePath, newContent);
    console.log(`\nUpdated ${selectedUpdates.length} image(s) in ${filePath}`);
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("Error:", e.message);
    Deno.exit(1);
  });
}
