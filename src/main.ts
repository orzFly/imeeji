import { parseArgs } from "@std/cli/parse-args";
import process from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { findImages } from "./parser.ts";
import { fetchTagsEnriched, getRepositoryKey } from "./registry.ts";
import {
  findBestUpgrade,
  findMatchingVariant,
  groupByVariant,
} from "./analyzer.ts";
import { selectUpdates } from "./ui.ts";
import { applyUpdates as applyPatches, generateDiff } from "./patcher.ts";
import type { ImageUpdate, TagFetchResult } from "./types.ts";
import { mapPool } from "./pool.ts";
import {
  fetchLsioMetadata,
  getLsioRepoInfo,
  isLinuxServerRepo,
} from "./integrations/lsio.ts";
import { parseImageRef, runAdhocMode } from "./adhoc.ts";
import { hashContent, scanPaths } from "./scanner.ts";
import type { ScannedFile } from "./scanner.ts";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`
imeeji - Interactive Docker Image Upgrade Tool

USAGE:
  imeeji [OPTIONS] <PATH...>
  imeeji [OPTIONS] <IMAGE>       # Ad-hoc mode: select version for image

OPTIONS:
   -n, --dry-run          Print diff without modifying files
   -y, --yes              Auto-accept latest versions (non-interactive)
   -i, --image            Force ad-hoc mode (argument is image, not path)
   --allow-comments       Parse images inside comment lines
   --include <PATTERN>    Include glob pattern (repeatable, adds to defaults)
   --exclude <PATTERN>    Exclude glob pattern (repeatable)
   --exclude-default      Disable default include patterns
   --include-ignored      Include files ignored by .gitignore
   -h, --help             Print help message
   -V, --version          Print version

PATH MODE EXAMPLES:
  imeeji config.nix                    Interactive upgrade single file
  imeeji src/                          Recursive scan directory
  imeeji file1.nix file2.yaml          Multiple files
  imeeji --dry-run .                   Preview changes (recursive)
  imeeji -y .                          Auto-upgrade all to latest
  imeeji --include "*.json" .          Include additional patterns
  imeeji --exclude "*.test.yaml" .     Exclude specific patterns

AD-HOC MODE EXAMPLES:
  imeeji nginx                   Select version/variant for nginx
  imeeji nginx:alpine            Select alpine version for nginx
  imeeji -y nginx                Output latest nginx image
  imeeji -y nginx:alpine         Output latest nginx:alpine image
`);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2), {
    boolean: [
      "dry-run",
      "yes",
      "help",
      "version",
      "exclude-default",
      "include-ignored",
      "allow-comments",
      "image",
    ],
    string: ["include", "exclude"],
    alias: {
      n: "dry-run",
      y: "yes",
      h: "help",
      V: "version",
      i: "image",
    },
    collect: ["include", "exclude"],
    stopEarly: false,
  });

  if (parsed.version) {
    console.log(`imeeji ${VERSION}`);
    process.exit(0);
  }

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  const inputPaths = parsed._.map(String);
  const imageMode = parsed.image ?? false;

  if (imageMode) {
    if (inputPaths.length !== 1) {
      console.error("Error: --image mode requires exactly one image reference");
      process.exit(1);
    }
    const parsedImage = parseImageRef(inputPaths[0]);
    const autoYes = parsed.yes ?? false;
    const result = await runAdhocMode(parsedImage, autoYes);
    if (result) {
      console.log(result);
      return;
    }
    process.exit(1);
  }

  if (inputPaths.length === 0) {
    console.error("Error: No path or image specified");
    printHelp();
    process.exit(1);
  }

  const dryRun = parsed["dry-run"] ?? false;
  const autoYes = parsed.yes ?? false;
  const allowComments = parsed["allow-comments"] ?? false;
  const includePatterns = parsed.include as string[] | undefined;
  const excludePatterns = parsed.exclude as string[] | undefined;
  const excludeDefault = parsed["exclude-default"] ?? false;
  const includeIgnored = parsed["include-ignored"] ?? false;

  const scannedFiles = await scanPaths(inputPaths, {
    include: includePatterns,
    exclude: excludePatterns,
    excludeDefault,
    includeIgnored,
  });

  if (scannedFiles.length === 0) {
    const singleArg = inputPaths[0];
    const parsedImage = parseImageRef(singleArg);
    if (parsedImage) {
      const result = await runAdhocMode(parsedImage, autoYes);
      if (result) {
        console.log(result);
        return;
      }
      process.exit(1);
    }

    console.log("No matching files found.");
    return;
  }

  const allImages: (ScannedFile & { images: ReturnType<typeof findImages> })[] =
    [];
  let totalImages = 0;

  for (const file of scannedFiles) {
    const images = findImages(file.content, file.path, allowComments);
    if (images.length > 0) {
      allImages.push({ ...file, images });
      totalImages += images.length;
    }
  }

  if (totalImages === 0) {
    console.log("No docker images found in scanned files.");
    return;
  }

  console.log(
    `Found ${totalImages} image(s) in ${allImages.length} file(s)`,
  );

  const uniqueEntries = Array.from(
    new Map(
      allImages.flatMap((f) => f.images).map((img) => [
        getRepositoryKey(img.registry, img.repository),
        img,
      ]),
    ).entries(),
  );

  uniqueEntries.forEach(([key]) => console.log(`Fetching tags for ${key}...`));

  const hasLsioRepo = allImages.some((f) =>
    f.images.some((img) => isLinuxServerRepo(img.repository))
  );
  const lsioMetadataPromise = hasLsioRepo ? fetchLsioMetadata() : null;

  const [results, lsioMetadata] = await Promise.all([
    mapPool(uniqueEntries, 8, async ([key, image]) => {
      const result = await fetchTagsEnriched(
        image.registry,
        image.repository,
        image.tag,
      );
      return { key, result };
    }),
    lsioMetadataPromise ?? Promise.resolve(null),
  ]);

  const repoCache = new Map<string, TagFetchResult>();
  for (const { key, result } of results) {
    repoCache.set(key, result);
  }

  const warnings: string[] = [];
  for (const { key, result } of results) {
    if (result.foundCurrentTag === false) {
      const image = uniqueEntries.find(([k]) => k === key)?.[1];
      if (image) {
        warnings.push(
          `WARNING: Current tag '${image.tag}' for ${key} not found in recent ${result.tags.length} tags - may be very old`,
        );
      }
    }
  }
  if (warnings.length > 0) {
    console.log("");
    for (const w of warnings) {
      console.log(w);
    }
    console.log("");
  }

  const updates: ImageUpdate[] = [];

  for (const file of allImages) {
    for (const image of file.images) {
      const key = getRepositoryKey(image.registry, image.repository);
      const result = repoCache.get(key);
      const tags = result?.tags ?? [];

      if (tags.length === 0) {
        console.log(`  Skipping ${key}: no tags available`);
        continue;
      }

      const lsioInfo = getLsioRepoInfo(image.repository, lsioMetadata);
      const lsioMeta = lsioInfo?.meta;
      const floatingTags = lsioInfo?.floatingTags;

      const variants = groupByVariant(
        tags,
        result?.digestMap,
        floatingTags,
        result?.timestampMap,
      );
      const newTag = findBestUpgrade(image.tag, variants);

      if (newTag) {
        updates.push({
          image,
          currentTag: image.tag,
          newTag,
          variants,
          currentVariant: findMatchingVariant(image.tag, variants),
          lsioMetadata: lsioMeta,
        });
      }
    }
  }

  if (updates.length === 0) {
    console.log("\nAll images are already at their latest versions.");
    return;
  }

  const fileContents = new Map<string, string>();
  for (const file of scannedFiles) {
    fileContents.set(file.path, file.content);
  }

  const selectedUpdates = await selectUpdates(
    updates,
    autoYes,
    fileContents,
  );

  if (selectedUpdates.length === 0) {
    console.log("No updates applied.");
    return;
  }

  const updatesByFile = new Map<string, typeof selectedUpdates>();
  for (const update of selectedUpdates) {
    const existing = updatesByFile.get(update.filePath) ?? [];
    existing.push(update);
    updatesByFile.set(update.filePath, existing);
  }

  const fileHashes = new Map<string, string>();
  for (const file of scannedFiles) {
    fileHashes.set(file.path, file.hash);
  }

  if (dryRun) {
    for (const [filePath, fileUpdates] of updatesByFile) {
      const content = fileContents.get(filePath)!;
      const diff = generateDiff(filePath, content, fileUpdates);
      console.log("\n" + diff);
    }
    console.log(`\n(Dry run - no changes made)`);
  } else {
    for (const [filePath, _fileUpdates] of updatesByFile) {
      const currentContent = await readFile(filePath, "utf-8");
      const currentHash = hashContent(currentContent);
      const originalHash = fileHashes.get(filePath);

      if (currentHash !== originalHash) {
        console.error(
          `Error: ${filePath} was modified during operation. Aborting.`,
        );
        process.exit(1);
      }
    }

    for (const [filePath, fileUpdates] of updatesByFile) {
      const content = fileContents.get(filePath)!;
      const newContent = applyPatches(content, fileUpdates);
      await writeFile(filePath, newContent, "utf-8");
      console.log(`\nUpdated ${fileUpdates.length} image(s) in ${filePath}`);
    }
  }
}

function isMainModule(): boolean {
  if (import.meta.main !== undefined) {
    return import.meta.main;
  }
  if (typeof process !== "undefined" && process.argv?.[1]) {
    try {
      const { URL, pathToFileURL } = require(
        "node:url",
      ) as typeof import("node:url");
      return new URL(import.meta.url).href ===
        pathToFileURL(process.argv[1]).href;
    } catch {
      return false;
    }
  }
  return false;
}

if (isMainModule()) {
  main().catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
}
